---
lang: es
slugKey: 04-sql-merge-pivot-fuga
order: 4
title: "Cierre mensual con MERGE condicional, PIVOT, LISTAGG y detección de fuga"
summary: "Aplicación segura de ajustes de saldo sin dejar cuentas en negativo, tabulación trimestral por canal e identificación de clientes inactivos."
category: sql-avanzado
categoryLabel: "SQL Avanzado (Oracle)"
tags: ["Oracle SQL", "MERGE", "PIVOT", "LISTAGG", "Analytics"]
repoUrl: "https://github.com/JUSTSAM3/SQL_Exercises/blob/main/01-sql-avanzado/05_merge_cierre_mensual.sql"
repoLabel: "Ver 05_merge_cierre_mensual.sql en GitHub"
---

## Contexto

En procesos de cierre bancario y reportes gerenciales es común aplicar ajustes masivos de saldo (intereses y cuotas de manejo), transformar filas en columnas por trimestre y detectar clientes de alto valor en riesgo de abandono.

## Qué se buscaba resolver

1. Reescribir un `MERGE INTO` de cierre mensual para que **no toque** las cuentas cuyo saldo quedaría negativo al aplicar el ajuste, e identificar por separado las cuentas excluidas.
2. Generar matrices trimestrales por canal con `PIVOT`, consolidar productos por cliente con `LISTAGG` y listar clientes `'PREFERENCIAL'` con más de 120 días sin transferencias ([script `06_pivot_listagg_clientes_fuga.sql`](https://github.com/JUSTSAM3/SQL_Exercises/blob/main/01-sql-avanzado/06_pivot_listagg_clientes_fuga.sql)).

## Aspectos relevantes de la solución

En `MERGE`, la clave estuvo en agregar la condición `WHERE c.saldo + a.delta >= 0` dentro de la cláusula `WHEN MATCHED THEN UPDATE`. De esta forma, Oracle actualiza de manera atómica únicamente las cuentas válidas e incrementa su columna `version`, mientras una consulta posterior con `< 0` audita exactamente qué cuentas no pudieron cubrir el cargo:

```sql
MERGE INTO cuenta c
USING (SELECT id_cuenta, SUM(delta) AS delta
         FROM ajuste_saldo
        GROUP BY id_cuenta) a
   ON (c.id_cuenta = a.id_cuenta)
 WHEN MATCHED THEN
   UPDATE SET c.saldo   = c.saldo + a.delta,
              c.version = c.version + 1
   WHERE c.saldo + a.delta >= 0;
```

Para el informe de clientes en fuga se combinó un `LEFT JOIN` contra la última transferencia aplicada con `TRUNC(SYSDATE - ut.ultima_fecha)` y `ORDER BY dias_inactivo DESC NULLS FIRST` para priorizar tanto a quienes nunca transfirieron (`NULL`) como a los de mayor inactividad.

## Conclusiones y aprendizajes

- **`MERGE` con filtro en `UPDATE`:** evita truncar valores con `GREATEST(..., 0)` (que enmascara débitos incompletos) y permite auditar exactamente qué registros incumplieron la regla.
- **Control de agregados y nulos:** en `PIVOT`, proyectar `ROUND(t1)` fuera del pivote resolvió incompatibilidades de expresión directa; en detección de fuga, `LEFT JOIN` + `NULLS FIRST` evita omitir clientes activos sin movimientos.

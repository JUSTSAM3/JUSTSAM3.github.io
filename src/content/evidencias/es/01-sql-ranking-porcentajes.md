---
lang: es
slugKey: 01-sql-ranking-porcentajes
order: 1
title: "Ranking por grupos y participación porcentual con funciones de ventana"
summary: "Cálculo del Top 3 de productos con mayor saldo captado por familia manteniendo el denominador sobre toda la familia mediante RATIO_TO_REPORT."
category: sql-avanzado
categoryLabel: "SQL Avanzado (Oracle)"
tags: ["Oracle SQL", "CTE", "DENSE_RANK", "RATIO_TO_REPORT", "Window Functions"]
repoUrl: "https://github.com/JUSTSAM3/SQL_Exercises/blob/main/01-sql-avanzado/01_ranking_y_porcentajes.sql"
repoLabel: "Ver 01_ranking_y_porcentajes.sql en GitHub"
---

## Contexto

En el análisis comercial de productos financieros (cuentas activas agrupadas en familias del catálogo), se necesitaba identificar cuáles productos lideran la captación de saldo dentro de cada familia sin perder la perspectiva del peso real que cada uno aporta al total de su categoría.

## Qué se buscaba resolver

Obtener los **3 productos que más saldo captan por familia** (solo cuentas en estado `'ACTIVA'`) y, al mismo tiempo, calcular qué **porcentaje representa cada producto sobre el saldo total captado por su familia completa** — no sobre la suma parcial del Top 3.

## Aspectos relevantes de la solución

El error más común al combinar rankings y porcentajes es filtrar primero (`WHERE puesto <= 3`) y calcular la participación después, lo que infla artificialmente los porcentajes para que sumen 100 % entre los tres primeros.

Para evitarlo, la consulta se dividió en dos CTEs:

1. **`captacion`**: agrupa las cuentas activas por familia (`id_padre`) y producto para consolidar `SUM(c.saldo)` y el conteo de cuentas.
2. **`con_metricas`**: calcula ambas funciones analíticas sobre la misma partición (`PARTITION BY id_familia`) **antes** de filtrar el Top 3: `DENSE_RANK()` asigna la posición y `RATIO_TO_REPORT(saldo_captado)` evalúa la proporción frente a toda la familia.

```sql
con_metricas AS (
  SELECT v.*,
         DENSE_RANK() OVER (PARTITION BY id_familia
                            ORDER BY saldo_captado DESC)      AS puesto,
         RATIO_TO_REPORT(saldo_captado)
             OVER (PARTITION BY id_familia)                   AS pct_familia
    FROM captacion v
)
SELECT familia, producto, cuentas,
       ROUND(saldo_captado)         AS saldo_captado,
       puesto,
       ROUND(pct_familia * 100, 2)  AS pct_sobre_familia
  FROM con_metricas
 WHERE puesto <= 3
 ORDER BY familia, puesto;
```

## Conclusiones y aprendizajes

- **Orden lógico de evaluación en SQL:** las funciones de ventana se evalúan después del `WHERE` y del `GROUP BY`, pero en una CTE externa permiten conservar el universo completo de la partición antes de aplicar `WHERE puesto <= 3`.
- **`DENSE_RANK` vs. `ROW_NUMBER`:** elegir `DENSE_RANK` garantiza que productos empatados en saldo compartan el mismo puesto sin descartar arbitrariamente uno de ellos.
- **`RATIO_TO_REPORT`:** simplifica el cálculo frente a `saldo / SUM(saldo) OVER (...)` y evita errores de división por cero o subconsultas redundantes.

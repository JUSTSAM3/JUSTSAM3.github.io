---
lang: es
slugKey: 03-sql-planes-cte-recursiva
order: 3
title: "Planes de ejecución (correlacionada vs. analítica) y CTE recursiva"
summary: "Comparación con DBMS_XPLAN de dos formas de obtener la última transferencia y recorrido jerárquico de un catálogo de 3 niveles."
category: sql-avanzado
categoryLabel: "SQL Avanzado (Oracle)"
tags: ["Oracle SQL", "DBMS_XPLAN", "ROW_NUMBER", "CTE Recursiva", "CONNECT BY"]
repoUrl: "https://github.com/JUSTSAM3/SQL_Exercises/blob/main/01-sql-avanzado/03_correlacionada_vs_analitica.sql"
repoLabel: "Ver 03_correlacionada_vs_analitica.sql en GitHub"
---

## Contexto

Dos necesidades frecuentes en sistemas transaccionales y catálogos bancarios son: (1) extraer el último movimiento por cliente sin penalizar el rendimiento, y (2) consolidar saldos a través de una estructura jerárquica (`línea de negocio → familia → producto`).

## Qué se buscaba resolver

1. Comparar mediante `EXPLAIN PLAN` y `DBMS_XPLAN.DISPLAY` el plan de ejecución de una **subconsulta correlacionada** frente a una **función analítica (`ROW_NUMBER`)** para obtener la última transferencia de cada cliente `'PREFERENCIAL'`.
2. Resolver la jerarquía completa del catálogo con **CTE recursiva (`WITH ... UNION ALL`)** (y su equivalente con `CONNECT BY`) para sumar el saldo captado por cada línea de negocio raíz.

## Aspectos relevantes de la solución

En el primer caso, la subconsulta correlacionada vuelve a recorrer `transferencia` y `cuenta` para calcular el `MAX(fecha_transf)` por cada fila candidata, mientras que la versión con `ROW_NUMBER() OVER (PARTITION BY cl.id_cliente ORDER BY t.fecha_transf DESC)` resuelve la selección en una sola pasada sobre los joins (`WINDOW SORT PUSHED RANK`), permitiendo que Oracle detenga la clasificación apenas encuentra `rn = 1`.

En el segundo ejercicio ([`04_jerarquias_cte_recursiva.sql`](https://github.com/JUSTSAM3/SQL_Exercises/blob/main/01-sql-avanzado/04_jerarquias_cte_recursiva.sql)), la CTE recursiva propaga `id_linea` y `linea` desde la raíz (`id_padre IS NULL`) hacia cada producto hoja, permitiendo agrupar las cuentas activas directamente por su línea de negocio:

```sql
WITH arbol (id_producto, nombre, id_padre, nivel, id_linea, linea) AS (
  SELECT id_producto, nombre, id_padre, 1, id_producto, nombre
    FROM catalogo_producto
   WHERE id_padre IS NULL
  UNION ALL
  SELECT c.id_producto, c.nombre, c.id_padre, a.nivel + 1,
         a.id_linea, a.linea
    FROM catalogo_producto c
    JOIN arbol a ON c.id_padre = a.id_producto
)
SELECT a.linea                AS linea_negocio,
       ROUND(SUM(cu.saldo))   AS saldo_total,
       COUNT(*)               AS cuentas_activas
  FROM cuenta cu
  JOIN arbol a ON a.id_producto = cu.id_producto
 WHERE cu.estado = 'ACTIVA'
 GROUP BY a.linea
 ORDER BY saldo_total DESC;
```

## Conclusiones y aprendizajes

- **Dos consultas equivalentes no cuestan igual:** validar siempre con `DBMS_XPLAN` demuestra por qué las funciones analíticas suelen escalar mucho mejor que las subconsultas correlacionadas al crecer el volumen.
- **Portabilidad de jerarquías:** `WITH` recursivo sigue el estándar ANSI SQL (funciona en Oracle, PostgreSQL, etc.), mientras `CONNECT BY` / `SYS_CONNECT_BY_PATH` es propio de Oracle; saber propagar atributos de la raíz (`id_linea`) simplifica los reportes agregados sobre hojas.

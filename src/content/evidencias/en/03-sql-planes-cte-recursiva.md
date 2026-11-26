---
lang: en
slugKey: 03-sql-planes-cte-recursiva
order: 3
title: "Execution Plans (Correlated vs. Analytic) and Recursive CTE Hierarchies"
summary: "Comparing correlated subqueries against ROW_NUMBER with DBMS_XPLAN and traversing a 3-level product catalog via recursive CTE."
category: sql-avanzado
categoryLabel: "Advanced SQL (Oracle)"
tags: ["Oracle SQL", "DBMS_XPLAN", "ROW_NUMBER", "Recursive CTE", "CONNECT BY"]
repoUrl: "https://github.com/JUSTSAM3/SQL_Exercises/blob/main/01-sql-avanzado/03_correlacionada_vs_analitica.sql"
repoLabel: "View 03_correlacionada_vs_analitica.sql on GitHub"
---

## Context

Two recurring requirements in banking schemas are: (1) fetching each customer's latest transaction without scanning tables repeatedly, and (2) rolling up balances across a 3-tier catalog (`business line → family → product`).

## Problem to Solve

1. Compare the execution plan (`EXPLAIN PLAN` + `DBMS_XPLAN.DISPLAY`) of a **correlated subquery** versus an **analytic function (`ROW_NUMBER`)** when retrieving the latest transfer for every `'PREFERENCIAL'` customer.
2. Traverse the full product tree using a **recursive CTE (`WITH ... UNION ALL`)** (alongside Oracle's `CONNECT BY`) to aggregate active account balances per root business line.

## Key Aspects of the Solution

The correlated subquery re-probes `transferencia` and `cuenta` to compute `MAX(fecha_transf)` per candidate row, whereas `ROW_NUMBER() OVER (PARTITION BY cl.id_cliente ORDER BY t.fecha_transf DESC)` processes the join once and allows Oracle's `WINDOW SORT PUSHED RANK` optimization to stop early once `rn = 1` is found.

In the hierarchy script ([`04_jerarquias_cte_recursiva.sql`](https://github.com/JUSTSAM3/SQL_Exercises/blob/main/01-sql-avanzado/04_jerarquias_cte_recursiva.sql)), the recursive CTE propagates `id_linea` and `linea` from the root (`id_padre IS NULL`) down to leaf products so active balances group directly by business line:

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

## Conclusions and Takeaways

- **Same output, different cost:** checking `DBMS_XPLAN` reveals why analytic windowing scales significantly better than correlated subqueries on large transaction tables.
- **Standard vs. vendor-specific hierarchies:** recursive `WITH` is portable across ANSI SQL engines (Oracle, PostgreSQL), whereas `CONNECT BY` is Oracle-specific; propagating root identifiers simplifies leaf-level rollups.

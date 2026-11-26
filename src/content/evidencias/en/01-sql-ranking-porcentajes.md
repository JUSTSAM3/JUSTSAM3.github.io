---
lang: en
slugKey: 01-sql-ranking-porcentajes
order: 1
title: "Grouped Rankings and Percentage Share Using Window Functions"
summary: "Computing the Top 3 deposit-gathering products per family while preserving the full-family denominator with RATIO_TO_REPORT."
category: sql-avanzado
categoryLabel: "Advanced SQL (Oracle)"
tags: ["Oracle SQL", "CTE", "DENSE_RANK", "RATIO_TO_REPORT", "Window Functions"]
repoUrl: "https://github.com/JUSTSAM3/SQL_Exercises/blob/main/01-sql-avanzado/01_ranking_y_porcentajes.sql"
repoLabel: "View 01_ranking_y_porcentajes.sql on GitHub"
---

## Context

In commercial banking analytics (active accounts grouped into product catalog families), leadership needed to identify which products capture the most balance within each family without distorting how much each product contributes to its entire category.

## Problem to Solve

Return the **Top 3 products by total balance per family** (considering only `'ACTIVA'` accounts) while displaying each product's **percentage share of the full family balance** — not of the Top 3 subtotal.

## Key Aspects of the Solution

A common mistake when mixing rankings and share percentages is filtering `WHERE puesto <= 3` before computing the total, which artificially inflates percentages so the Top 3 sum to 100%.

To avoid that distortion, the query separates the calculation into two CTEs:

1. **`captacion`**: aggregates active accounts by product family (`id_padre`) and product to compute `SUM(c.saldo)` and account counts.
2. **`con_metricas`**: evaluates both analytic functions over `PARTITION BY id_familia` **before** filtering the Top 3: `DENSE_RANK()` assigns the rank and `RATIO_TO_REPORT(saldo_captado)` divides by the full family sum.

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

## Conclusions and Takeaways

- **Logical query evaluation order:** window functions run after `WHERE` and `GROUP BY`; placing them inside an intermediate CTE keeps the full partition intact prior to filtering `puesto <= 3`.
- **`DENSE_RANK` vs. `ROW_NUMBER`:** using `DENSE_RANK` ensures tied products keep the same rank instead of arbitrarily dropping one.
- **`RATIO_TO_REPORT`:** provides a cleaner alternative to `saldo / SUM(saldo) OVER (...)` with less boilerplate.

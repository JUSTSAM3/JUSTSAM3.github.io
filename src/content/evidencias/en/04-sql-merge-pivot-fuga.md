---
lang: en
slugKey: 04-sql-merge-pivot-fuga
order: 4
title: "Month-End MERGE Guardrails, PIVOT/LISTAGG Reports, and Churn Detection"
summary: "Safely applying month-end balance adjustments without negative balances, quarterly channel matrices, and dormant customer reporting."
category: sql-avanzado
categoryLabel: "Advanced SQL (Oracle)"
tags: ["Oracle SQL", "MERGE", "PIVOT", "LISTAGG", "Analytics"]
repoUrl: "https://github.com/JUSTSAM3/SQL_Exercises/blob/main/01-sql-avanzado/05_merge_cierre_mensual.sql"
repoLabel: "View 05_merge_cierre_mensual.sql on GitHub"
---

## Context

Month-end closing and executive reporting workflows require applying bulk balance adjustments (interest and maintenance fees), pivoting channel totals across quarters, and flagging high-value customers showing signs of churn.

## Problem to Solve

1. Rewrite a month-end `MERGE INTO` statement so accounts that would drop below zero are **left untouched**, and list the excluded accounts separately for auditing.
2. Build quarterly channel matrices with `PIVOT`, aggregate product lists per customer with `LISTAGG`, and detect `'PREFERENCIAL'` customers with over 120 days of inactivity ([`06_pivot_listagg_clientes_fuga.sql`](https://github.com/JUSTSAM3/SQL_Exercises/blob/main/01-sql-avanzado/06_pivot_listagg_clientes_fuga.sql)).

## Key Aspects of the Solution

In `MERGE`, adding `WHERE c.saldo + a.delta >= 0` directly inside `WHEN MATCHED THEN UPDATE` atomically applies valid adjustments and increments optimistic `version` counters, while a follow-up query (`< 0`) surfaces every account that failed the non-negative rule:

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

For the churn report, a `LEFT JOIN` against each customer's latest applied transfer is paired with `TRUNC(SYSDATE - ut.ultima_fecha)` and `ORDER BY dias_inactivo DESC NULLS FIRST` so both never-active and long-dormant customers appear at the top.

## Conclusions and Takeaways

- **Conditional `MERGE` updates:** filtering inside `UPDATE` avoids silently clamping balances to zero with `GREATEST(..., 0)` and preserves clean auditability.
- **Handling NULLs and pivots:** wrapping `ROUND(t1)` outside `PIVOT` resolved Oracle aggregate-expression limits, while `LEFT JOIN` + `NULLS FIRST` keeps active customers with zero transfers visible.

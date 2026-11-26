---
lang: en
slugKey: 02-sql-series-tiempo
order: 2
title: "Time Series: Running Total, MoM Change, and 3-Month Moving Average"
summary: "Building a monthly transfer baseline for 2026 using LAG, NULLIF, and explicit ROWS BETWEEN window frames."
category: sql-avanzado
categoryLabel: "Advanced SQL (Oracle)"
tags: ["Oracle SQL", "LAG", "ROWS BETWEEN", "Time Series", "NULLIF"]
repoUrl: "https://github.com/JUSTSAM3/SQL_Exercises/blob/main/01-sql-avanzado/02_series_tiempo_promedio_movil.sql"
repoLabel: "View 02_series_tiempo_promedio_movil.sql on GitHub"
---

## Context

Operational Risk teams monitor monthly transfer volume throughout 2026 to spot unusual spikes or drops compared with recent historical behavior.

## Problem to Solve

Produce a monthly series of applied transfers (`estado = 'APLICADA'`) containing, in a single pass: the year-to-date running total, the previous month's value, month-over-month percentage variation, and a **3-month moving average** (current month plus the two preceding months) as the anomaly baseline.

## Key Aspects of the Solution

Transactions are bucketed by month using `TRUNC(fecha_transf, 'MM')` with a sargable date range (`>= DATE '2026-01-01' AND < DATE '2027-01-01'`). Over the `mensual` CTE, explicit window frames compute all metrics cleanly:

- `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` for the cumulative yearly total.
- `LAG(valor_transferido)` paired with `NULLIF(..., 0)` to guard percentage calculations against the initial `NULL` month or zero-volume periods.
- `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` inside `AVG(...) OVER (...)` for the 3-month rolling baseline.

```sql
SELECT TO_CHAR(mes,'YYYY-MM')                          AS mes,
       operaciones,
       ROUND(valor_transferido)                        AS valor,
       ROUND(SUM(valor_transferido) OVER (ORDER BY mes
             ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)) AS acumulado,
       ROUND(LAG(valor_transferido) OVER (ORDER BY mes)) AS mes_anterior,
       ROUND(100 * (valor_transferido - LAG(valor_transferido) OVER (ORDER BY mes))
                 / NULLIF(LAG(valor_transferido) OVER (ORDER BY mes),0), 1) AS var_pct,
       ROUND(AVG(valor_transferido) OVER (ORDER BY mes
             ROWS BETWEEN 2 PRECEDING AND CURRENT ROW))  AS prom_movil_3m
  FROM mensual
 ORDER BY mes;
```

## Conclusions and Takeaways

- **Two-stage aggregation:** summarizing by month in a CTE first avoids repeated scans and keeps window expressions concise.
- **Explicit `ROWS` frames:** `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` guarantees a fixed row window rather than relying on `RANGE` defaults.
- **Defensive math:** `NULLIF` prevents division-by-zero runtime failures on sparse time series.

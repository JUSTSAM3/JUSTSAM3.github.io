---
lang: en
slugKey: 05-sql-reto-banco-andino
order: 5
title: "Banco Andino Challenge: Atomic Transfers and Sargable Dashboard Tuning"
summary: "Diagnosing partial-commit balance mismatches with ordered FOR UPDATE locks and fixing a slow dashboard query by removing TO_CHAR from WHERE."
category: sql-avanzado
categoryLabel: "Advanced SQL (Oracle)"
tags: ["Oracle SQL", "FOR UPDATE", "ACID", "Sargable", "Index Tuning"]
repoUrl: "https://github.com/JUSTSAM3/SQL_Exercises/blob/main/01-sql-avanzado/07_reto_concurrencia_y_optimizacion.sql"
repoLabel: "View 07_reto_concurrencia_y_optimizacion.sql on GitHub"
---

## Context

An operations incident ticket reported three production failures: persistent reconciliation mismatches in the clearing account, half-applied transfers where money left the origin without reaching the destination (or vice versa), and an executive dashboard taking nearly a minute to load.

## Problem to Solve

1. Identify why the core transfer sequence corrupted balances and rewrite it to enforce **atomicity and concurrency safety**.
2. Optimize the Vice Presidency dashboard query so it can leverage indexes without changing its output.

## Key Aspects of the Solution

The original sequence issued 5 intermediate `COMMIT` statements, read balances without row locks (causing lost updates), and wrote hardcoded absolute amounts. The fix consolidated everything into one atomic transaction:

- **`SELECT ... ORDER BY id_cuenta FOR UPDATE`**: locks both accounts in deterministic ID order to prevent deadlocks under concurrent cross-transfers.
- **Relative updates (`saldo = saldo - 300000`)** protected by `CHECK (saldo >= 0)` and conditional state transition (`AND estado = 'REGISTRADA'`) before a single `COMMIT`.

```sql
SELECT id_cuenta, saldo
  FROM cuenta
 WHERE id_cuenta IN (1001, 1002)
 ORDER BY id_cuenta
   FOR UPDATE;

UPDATE cuenta SET saldo = saldo - 300000 WHERE id_cuenta = 1001;
UPDATE cuenta SET saldo = saldo + 300000 WHERE id_cuenta = 1002;
-- Insert DEBITO/CREDITO ledger rows and guard state transition
UPDATE transferencia
   SET estado = 'APLICADA'
 WHERE id_transferencia = 950001
   AND estado = 'REGISTRADA';
COMMIT;
```

For the dashboard, `TO_CHAR(t.fecha_transf, 'YYYY-MM') = '2026-03'` prevented index usage on `fecha_transf`. Replacing it with a half-open range (`>= DATE '2026-03-01' AND < DATE '2026-04-01'`), adding composite index `idx_transf_tablero_comp (fecha_transf, estado, cuenta_origen, valor)`, and gathering stats via `DBMS_STATS` enabled efficient index access.

## Conclusions and Takeaways

- **One business operation = one `COMMIT`:** intermediate commits break atomicity on failure.
- **Sargable predicates matter:** wrapping indexed date columns in `TO_CHAR` forces full table scans; half-open date ranges unlock range scans and covering indexes.

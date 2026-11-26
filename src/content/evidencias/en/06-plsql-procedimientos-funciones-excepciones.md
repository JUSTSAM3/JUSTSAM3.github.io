---
lang: en
slugKey: 06-plsql-procedimientos-funciones-excepciones
order: 6
title: "Stored Procedures, SQL-Callable Functions, and Exception Handling"
summary: "Inventory business rules in Oracle PL/SQL using FOR UPDATE locks, pure functions in SELECT, PRAGMA EXCEPTION_INIT, and autonomous error logging."
category: plsql
categoryLabel: "PL/SQL (Oracle)"
tags: ["PL/SQL", "Procedures", "Functions", "PRAGMA AUTONOMOUS_TRANSACTION", "FOR UPDATE"]
repoUrl: "https://github.com/JUSTSAM3/SQL_Exercises/blob/main/02-plsql/01_procedimientos.sql"
repoLabel: "View 01_procedimientos.sql on GitHub"
---

## Context

Parts 1, 2, and 4 of the PL/SQL workshop implement core inventory and order procedures with strict rules for sequence usage, concurrency safety, SQL reusability, and fault traceability.

## Problem to Solve

- Implement stored procedures (`SP_REGISTRAR_PRODUCTO`, `SP_AJUSTAR_STOCK`, `SP_CREAR_PEDIDO`) guarding sequence gaps, duplicate codes, and concurrent stock updates.
- Write side-effect-free functions ([`02_funciones.sql`](https://github.com/JUSTSAM3/SQL_Exercises/blob/main/02-plsql/02_funciones.sql)) callable directly inside `SELECT` statements (`FN_STOCK_DISPONIBLE`, `FN_CUPO_DISPONIBLE`, `FN_CALCULAR_DESCUENTO`).
- Handle specific exceptions cleanly instead of swallowing errors in `WHEN OTHERS` ([`04_excepciones.sql`](https://github.com/JUSTSAM3/SQL_Exercises/blob/main/02-plsql/04_excepciones.sql)), including an error logger that persists even after `ROLLBACK`.

## Key Aspects of the Solution

- **Validate before pulling sequences:** `SP_REGISTRAR_PRODUCTO` verifies price and category existence before calling `SEQ_PRODUCTO.NEXTVAL`, and catches `DUP_VAL_ON_INDEX` backed by a `UNIQUE` constraint.
- **Concurrency-safe stock adjustments:** `SP_AJUSTAR_STOCK` selects `EXISTENCIA` with `FOR UPDATE` and handles `NO_DATA_FOUND` differently for `'ENTRADA'` (inserts row) vs. `'SALIDA'` (raises application error).
- **Autonomous error logging:** `SP_REGISTRAR_ERROR` uses `PRAGMA AUTONOMOUS_TRANSACTION` so `LOG_ERRORES` entries commit independently while the caller's transaction rolls back:

```sql
CREATE OR REPLACE PROCEDURE SP_REGISTRAR_ERROR (
    p_origen  IN VARCHAR2,
    p_detalle IN VARCHAR2 DEFAULT NULL
) IS
    PRAGMA AUTONOMOUS_TRANSACTION;
    vn_codigo  NUMBER;
    vc_mensaje VARCHAR2(500);
BEGIN
    vn_codigo  := SQLCODE;
    vc_mensaje := SUBSTR(SQLERRM, 1, 500);

    INSERT INTO LOG_ERRORES (id_log, origen, codigo_error, mensaje, detalle, usuario_bd, fecha_log)
    VALUES (SEQ_LOG.NEXTVAL, p_origen, vn_codigo, vc_mensaje, p_detalle, USER, SYSTIMESTAMP);
    COMMIT;
END SP_REGISTRAR_ERROR;
```

## Conclusions and Takeaways

- **Leave `COMMIT` to the caller:** business procedures should not issue internal commits so callers can compose multiple steps atomically.
- **`PRAGMA EXCEPTION_INIT` over generic handlers:** binding `ORA-02291` to a named exception isolates expected foreign-key failures while letting unexpected errors propagate.
- **Autonomous transactions with care:** capture `SQLCODE`/`SQLERRM` before rolling back, and never abuse autonomous transactions as a workaround for mutating-table errors.

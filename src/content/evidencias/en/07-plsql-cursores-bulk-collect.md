---
lang: en
slugKey: 07-plsql-cursores-bulk-collect
order: 7
title: "Explicit Cursors, Positioned Updates, and BULK COLLECT Optimization"
summary: "Row-by-row processing with OPEN/FETCH/CLOSE, WHERE CURRENT OF, SYS_REFCURSOR, and context-switch elimination using FORALL."
category: plsql
categoryLabel: "PL/SQL (Oracle)"
tags: ["PL/SQL", "Cursors", "FOR UPDATE", "SYS_REFCURSOR", "BULK COLLECT", "FORALL"]
repoUrl: "https://github.com/JUSTSAM3/SQL_Exercises/blob/main/02-plsql/03_cursores.sql"
repoLabel: "View 03_cursores.sql on GitHub"
---

## Context

Part 3 of the PL/SQL workshop explores cursor patterns in Oracle, progressing from explicit row-by-row loops to bulk array binding for high-volume updates.

## Problem to Solve

1. Report products below minimum stock using an explicit `OPEN` / `FETCH` / `CLOSE` cursor.
2. Build reusable parameterized cursors and stream result sets out of procedures via `SYS_REFCURSOR`.
3. Update category prices respecting minimum margins using `FOR UPDATE` and `WHERE CURRENT OF`.
4. Eliminate SQL/PL-SQL engine context switches during batch updates.

## Key Aspects of the Solution

- **`FOR UPDATE` + `WHERE CURRENT OF`:** locks only active category rows at cursor open time and updates the current row directly via its internal cursor position without re-searching the primary key.
- **`SYS_REFCURSOR`:** `SP_LISTAR_MOVIMIENTOS` opens the cursor and hands the pointer to the caller, which fetches rows and closes it to release memory.
- **`BULK COLLECT` + `FORALL`:** replaces row-by-row `UPDATE` statements inside a loop with a single bulk fetch into a PL/SQL collection followed by a single batched `FORALL` DML call:

```sql
DECLARE
    TYPE t_productos IS TABLE OF PRODUCTO.id_producto%TYPE;
    vtProductos t_productos;
    vcIdCategoria CATEGORIA.id_categoria%TYPE := 1;
BEGIN
    SELECT id_producto
    BULK COLLECT INTO vtProductos
    FROM PRODUCTO
    WHERE id_categoria = vcIdCategoria AND activo = 'S';

    FORALL i IN 1 .. vtProductos.COUNT
        UPDATE PRODUCTO
           SET stock_minimo = stock_minimo + 5
         WHERE id_producto = vtProductos(i);
END;
```

## Conclusions and Takeaways

- **Check `%NOTFOUND` right after `FETCH`:** exiting immediately after `FETCH` prevents processing the last record twice at end-of-cursor.
- **Cutting context switches:** `BULK COLLECT` + `FORALL` dramatically improves throughput once hundreds or thousands of rows are updated (adding `LIMIT` when memory bounds require chunking).

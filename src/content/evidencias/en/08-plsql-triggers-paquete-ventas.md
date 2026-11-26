---
lang: en
slugKey: 08-plsql-triggers-paquete-ventas
order: 8
title: "Triggers, Mutating-Table Prevention, and PKG_VENTAS Integration"
summary: "BEFORE/AFTER/INSTEAD OF triggers, Compound Trigger order-total sync, and an invoicing package using SAVEPOINT and ordered locks."
category: plsql
categoryLabel: "PL/SQL (Oracle)"
tags: ["PL/SQL", "Triggers", "Compound Trigger", "INSTEAD OF", "Packages", "SAVEPOINT"]
repoUrl: "https://github.com/JUSTSAM3/SQL_Exercises/blob/main/02-plsql/05_triggers.sql"
repoLabel: "View 05_triggers.sql on GitHub"
---

## Context

Parts 5 and 6 of the PL/SQL workshop tie together all earlier business rules through database triggers and an integrated invoicing package ([`06_caso_integrador.sql`](https://github.com/JUSTSAM3/SQL_Exercises/blob/main/02-plsql/06_caso_integrador.sql)).

## Problem to Solve

- Normalize inserts (`TRG_CLIENTE_BI`), audit real price changes via `WHEN` (`TRG_PRODUCTO_AU_PRECIO`), enforce category margins (`TRG_PRODUCTO_BIU_MARGEN`), deduct stock safely (`TRG_DETALLE_AI_STOCK`), and make an aggregated view updatable (`TRG_V_STOCK_IO`).
- Keep `PEDIDO.total` synchronized across `INSERT`, `UPDATE`, and `DELETE` on `DETALLE_PEDIDO` without hitting Oracle's `ORA-04091` mutating-table error.
- Expose `PKG_VENTAS.SP_FACTURAR_PEDIDO` reusing existing functions, triggers, and error logging.

## Key Aspects of the Solution

Querying `DETALLE_PEDIDO` inside a row-level trigger on `DETALLE_PEDIDO` triggers `ORA-04091`. `TRG_DETALLE_TOTAL` solves this with a **`COMPOUND TRIGGER`**: it records affected `id_pedido` keys in an associative array during `AFTER EACH ROW` and recalculates each order total once per statement in `AFTER STATEMENT`:

```sql
CREATE OR REPLACE TRIGGER TRG_DETALLE_TOTAL
    FOR INSERT OR UPDATE OR DELETE ON DETALLE_PEDIDO
    COMPOUND TRIGGER

    TYPE t_pedidos IS TABLE OF BOOLEAN INDEX BY PLS_INTEGER;
    v_pedidos t_pedidos;

    AFTER EACH ROW IS
    BEGIN
        IF INSERTING OR UPDATING THEN v_pedidos(:NEW.id_pedido) := TRUE; END IF;
        IF DELETING OR UPDATING THEN v_pedidos(:OLD.id_pedido) := TRUE; END IF;
    END AFTER EACH ROW;

    AFTER STATEMENT IS
        v_id_pedido PLS_INTEGER;
    BEGIN
        v_id_pedido := v_pedidos.FIRST;
        WHILE v_id_pedido IS NOT NULL LOOP
            UPDATE PEDIDO
               SET total = (SELECT NVL(SUM(subtotal), 0)
                              FROM DETALLE_PEDIDO
                             WHERE id_pedido = v_id_pedido)
             WHERE id_pedido = v_id_pedido;
            v_id_pedido := v_pedidos.NEXT(v_id_pedido);
        END LOOP;
    END AFTER STATEMENT;
END;
```

`PKG_VENTAS.SP_FACTURAR_PEDIDO` starts with `SAVEPOINT sp_facturar`, locks `PEDIDO` then `CLIENTE` (`FOR UPDATE`) in consistent order to prevent deadlocks, delegates calculations to `FN_CALCULAR_DESCUENTO` and `FN_CUPO_DISPONIBLE`, and on failure logs via `SP_REGISTRAR_ERROR` before `ROLLBACK TO SAVEPOINT sp_facturar`.

## Conclusions and Takeaways

- **`BEFORE` vs. `AFTER` timing:** `BEFORE` normalizes/validates `:NEW` before disk writes; `AFTER` propagates side effects only once row constraints succeed.
- **Compound triggers:** cleanly resolve mutating-table errors inside the same atomic transaction.
- **Composable transactions:** relying on `SAVEPOINT` and letting the caller `COMMIT` makes invoicing safe to combine into multi-step workflows.

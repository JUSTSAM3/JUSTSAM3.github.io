---
lang: es
slugKey: 08-plsql-triggers-paquete-ventas
order: 8
title: "Disparadores, prevención de tabla mutante y paquete integrador PKG_VENTAS"
summary: "Triggers BEFORE/AFTER/INSTEAD OF, Compound Trigger para recalcular totales y paquete de facturación con SAVEPOINT y bloqueo ordenado."
category: plsql
categoryLabel: "PL/SQL (Oracle)"
tags: ["PL/SQL", "Triggers", "Compound Trigger", "INSTEAD OF", "Packages", "SAVEPOINT"]
repoUrl: "https://github.com/JUSTSAM3/SQL_Exercises/blob/main/02-plsql/05_triggers.sql"
repoLabel: "Ver 05_triggers.sql en GitHub"
---

## Contexto

Las partes 5 y 6 del taller PL/SQL conectan todas las reglas de negocio anteriores en disparadores automáticos sobre tablas/vistas y en un paquete de facturación ([`06_caso_integrador.sql`](https://github.com/JUSTSAM3/SQL_Exercises/blob/main/02-plsql/06_caso_integrador.sql)).

## Qué se buscaba resolver

- Normalizar datos antes de insertar (`TRG_CLIENTE_BI`), auditar cambios reales de precio con cláusula `WHEN` (`TRG_PRODUCTO_AU_PRECIO`), validar margen mínimo (`TRG_PRODUCTO_BIU_MARGEN`), descontar stock con bloqueo (`TRG_DETALLE_AI_STOCK`) y habilitar actualizaciones sobre una vista de agregación (`TRG_V_STOCK_IO`).
- Recalcular automáticamente `PEDIDO.total` al insertar, actualizar o borrar líneas sin provocar el error `ORA-04091` (tabla mutante).
- Integrar el flujo completo de facturación en `PKG_VENTAS.SP_FACTURAR_PEDIDO` reutilizando las funciones y procedimientos previos.

## Aspectos relevantes de la solución

Para evitar el error de **tabla mutante** al consultar `DETALLE_PEDIDO` desde un trigger sobre la misma tabla, `TRG_DETALLE_TOTAL` se implementó como **`COMPOUND TRIGGER`**: recolecta los `id_pedido` afectados durante `AFTER EACH ROW` en un arreglo asociativo y recalcula los totales una sola vez por pedido en `AFTER STATEMENT`:

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

En `PKG_VENTAS.SP_FACTURAR_PEDIDO`, se establece `SAVEPOINT sp_facturar`, se bloquea en orden determinístico (`PEDIDO` y luego `CLIENTE` con `FOR UPDATE`), se compone con `FN_CALCULAR_DESCUENTO` y `FN_CUPO_DISPONIBLE`, y ante cualquier error se registra con `SP_REGISTRAR_ERROR` antes de ejecutar `ROLLBACK TO SAVEPOINT sp_facturar`.

## Conclusiones y aprendizajes

- **`BEFORE` vs. `AFTER`:** `BEFORE` valida o normaliza `:NEW` antes de escribir en disco; `AFTER` propaga efectos secundarios hacia otras tablas solo cuando la fila superó restricciones.
- **Tabla mutante:** `COMPOUND TRIGGER` resuelve `ORA-04091` limpiamente dentro de la misma transacción, sin romper la atomicidad.
- **Reutilización y control transaccional:** delegar el `COMMIT` al llamador permite que facturar sea parte de flujos más amplios con reversión parcial segura vía `SAVEPOINT`.

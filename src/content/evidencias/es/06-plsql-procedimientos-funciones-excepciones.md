---
lang: es
slugKey: 06-plsql-procedimientos-funciones-excepciones
order: 6
title: "Procedimientos, funciones en SQL y manejo avanzado de excepciones"
summary: "Diseño de lógica de inventario en Oracle con bloqueo FOR UPDATE, funciones puras en SELECT, PRAGMA EXCEPTION_INIT y transacciones autónomas."
category: plsql
categoryLabel: "PL/SQL (Oracle)"
tags: ["PL/SQL", "Procedures", "Functions", "PRAGMA AUTONOMOUS_TRANSACTION", "FOR UPDATE"]
repoUrl: "https://github.com/JUSTSAM3/SQL_Exercises/blob/main/02-plsql/01_procedimientos.sql"
repoLabel: "Ver 01_procedimientos.sql en GitHub"
---

## Contexto

En las partes 1, 2 y 4 del taller de PL/SQL sobre un esquema de inventario y pedidos, se implementaron los bloques base de negocio garantizando integridad frente a concurrencia, reutilización desde SQL y trazabilidad de errores.

## Qué se buscaba resolver

- Crear procedimientos (`SP_REGISTRAR_PRODUCTO`, `SP_AJUSTAR_STOCK`, `SP_CREAR_PEDIDO`) protegiendo secuencias, unicidad y concurrencia sobre existencias.
- Exponer funciones puras ([`02_funciones.sql`](https://github.com/JUSTSAM3/SQL_Exercises/blob/main/02-plsql/02_funciones.sql)) invocables dentro de sentencias `SELECT` (`FN_STOCK_DISPONIBLE`, `FN_CUPO_DISPONIBLE`, `FN_CALCULAR_DESCUENTO`).
- Manejar fallos específicos sin ocultarlos con `WHEN OTHERS` ([`04_excepciones.sql`](https://github.com/JUSTSAM3/SQL_Exercises/blob/main/02-plsql/04_excepciones.sql)), incluyendo un log de errores que sobreviva al `ROLLBACK`.

## Aspectos relevantes de la solución

- **Validar antes de consumir secuencias:** en `SP_REGISTRAR_PRODUCTO`, las reglas de negocio se validan antes de tomar `SEQ_PRODUCTO.NEXTVAL`, evitando desperdiciar números ante errores de validación, y los duplicados se controlan capturando `DUP_VAL_ON_INDEX` respaldado por la restricción `UNIQUE`.
- **Lectura segura en concurrencia:** `SP_AJUSTAR_STOCK` consulta `EXISTENCIA` con `FOR UPDATE` para bloquear la fila durante el ajuste y maneja `NO_DATA_FOUND` diferenciando si es `'ENTRADA'` (crea fila) o `'SALIDA'` (rechaza).
- **Auditoría persistente tras `ROLLBACK`:** `SP_REGISTRAR_ERROR` usa `PRAGMA AUTONOMOUS_TRANSACTION` para confirmar únicamente el registro en `LOG_ERRORES`, dejando que la transacción principal revierta sus cambios:

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

## Conclusiones y aprendizajes

- **Responsabilidad del `COMMIT`:** los procedimientos de negocio no deben hacer `COMMIT` interno porque impiden componer varias operaciones dentro de una misma transacción.
- **`PRAGMA EXCEPTION_INIT` vs. `WHEN OTHERS`:** asociar códigos como `ORA-02291` a excepciones con nombre permite manejar fallos esperados de integridad referencial sin silenciar errores imprevistos.
- **Transacción autónoma con criterio:** es ideal para bitácoras de error, pero requiere capturar `SQLCODE`/`SQLERRM` antes de cualquier `ROLLBACK` y nunca debe usarse para evadir errores de tabla mutante.

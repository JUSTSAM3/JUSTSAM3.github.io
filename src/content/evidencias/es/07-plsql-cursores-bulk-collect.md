---
lang: es
slugKey: 07-plsql-cursores-bulk-collect
order: 7
title: "Cursores explícitos, bloqueo posicionado y optimización con BULK COLLECT"
summary: "Procesamiento fila por fila con OPEN/FETCH/CLOSE, WHERE CURRENT OF, SYS_REFCURSOR y reducción de context switches mediante FORALL."
category: plsql
categoryLabel: "PL/SQL (Oracle)"
tags: ["PL/SQL", "Cursors", "FOR UPDATE", "SYS_REFCURSOR", "BULK COLLECT", "FORALL"]
repoUrl: "https://github.com/JUSTSAM3/SQL_Exercises/blob/main/02-plsql/03_cursores.sql"
repoLabel: "Ver 03_cursores.sql en GitHub"
---

## Contexto

La Parte 3 del taller de PL/SQL aborda los distintos mecanismos para recorrer conjuntos de resultados en Oracle, desde cursores explícitos tradicionales hasta técnicas de procesamiento por lotes orientadas a alto volumen.

## Qué se buscaba resolver

1. Generar un reporte de productos bajo stock mínimo con ciclo explícito `OPEN` / `FETCH` / `CLOSE`.
2. Reutilizar consultas mediante cursores parametrizados y exponer resultados hacia clientes externos con `SYS_REFCURSOR`.
3. Actualizar precios respetando el margen mínimo de cada categoría con `FOR UPDATE` y `WHERE CURRENT OF`.
4. Optimizar actualizaciones masivas eliminando los cambios de contexto entre el motor PL/SQL y el motor SQL.

## Aspectos relevantes de la solución

- **Cursor `FOR UPDATE` + `WHERE CURRENT OF`:** bloquea únicamente las filas activas de la categoría al abrir el cursor y actualiza la fila en curso por su `ROWID` implícito sin volver a indexar ni evaluar la clave primaria.
- **`SYS_REFCURSOR`:** `SP_LISTAR_MOVIMIENTOS` devuelve el puntero al conjunto de resultados para que el bloque consumidor haga `FETCH` y ejecute `CLOSE` al terminar.
- **`BULK COLLECT` + `FORALL`:** en lugar de ejecutar un `UPDATE` por cada iteración de un `LOOP`, se cargan todos los `id_producto` en una colección en memoria y se envían en un único lote al motor SQL:

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

## Conclusiones y aprendizajes

- **Cuándo evaluar `%NOTFOUND`:** verificar `EXIT WHEN cursor%NOTFOUND` inmediatamente después del `FETCH` evita procesar la última fila duplicada cuando se agota el cursor.
- **Eliminación de *context switches*:** `BULK COLLECT` + `FORALL` reduce drásticamente el costo de conmutación entre motores cuando se procesan cientos o miles de filas (usando `LIMIT` si el volumen es muy grande para proteger la memoria PGA).

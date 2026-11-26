---
lang: es
slugKey: 02-oracle-plsql-vs-postgresql-plpgsql
order: 2
title: "Oracle PL/SQL vs. PostgreSQL PL/pgSQL: lecciones prácticas entre talleres y proyecto"
summary: "Comparativa de arquitectura, triggers, manejo de excepciones, transacciones autónomas y tipos JSONB basada en código real del semestre."
tags: ["Oracle PL/SQL", "PostgreSQL PL/pgSQL", "Triggers", "JSONB", "Transactions"]
repoUrl: "https://github.com/JUSTSAM3/BasesDeDatos2/blob/main/Entregables/Scrips/02_Logica_Negocio_Procedimientos_Funciones_Triggers.sql"
repoLabel: "Ver lógica PL/pgSQL en GitHub"
---

## Contexto comparativo

Durante el semestre trabajé ambos motores en profundidad: **Oracle** en los talleres de SQL avanzado y PL/SQL ([SQL_Exercises](https://github.com/JUSTSAM3/SQL_Exercises)), y **PostgreSQL 16** en el sistema de reservas de eventos ([BasesDeDatos2](https://github.com/JUSTSAM3/BasesDeDatos2)). Aunque PL/pgSQL nació inspirado en PL/SQL, sus diferencias de diseño cambian cómo se estructura la lógica en base de datos.

---

## Diferencias clave observadas en la práctica

| Aspecto | Oracle PL/SQL | PostgreSQL PL/pgSQL |
| :--- | :--- | :--- |
| **Paquetes (`PACKAGE`)** | Nativos (`CREATE PACKAGE` + `BODY`): permiten estado privado, encapsulación y API pública (`PKG_VENTAS`). | No existen paquetes nativos; se organizan funciones/procedimientos por **esquemas** (`SCHEMA`) y convenciones de nombres. |
| **Triggers** | El cuerpo va directo en `CREATE TRIGGER` y existen **`COMPOUND TRIGGER`** para evitar `ORA-04091` (tabla mutante). | Se separa la función (`RETURNS TRIGGER`) del `CREATE TRIGGER`; además permite consultar la tabla en `AFTER` sin error de tabla mutante. |
| **Transacciones autónomas** | Soportadas con `PRAGMA AUTONOMOUS_TRANSACTION` (ej. `SP_REGISTRAR_ERROR` sobrevive al `ROLLBACK`). | No tiene `PRAGMA AUTONOMOUS_TRANSACTION` nativo; exige alternativas como `dblink` o manejo de bitácoras fuera de la transacción en el backend. |
| **Datos semiestructurados** | Soporte JSON evolucionado en versiones recientes. | **`JSONB` nativo** con funciones como `jsonb_to_recordset()` para pasar arreglos completos a un `PROCEDURE` en una sola llamada. |
| **Cursores y lotes** | `BULK COLLECT` + `FORALL` explícitos para reducir *context switches*. | Menos ceremonia con `FOR r IN SELECT ... LOOP` y alta expresividad usando `CTE` / `INSERT ... RETURNING` / arreglos. |

---

## Ejemplo concreto: Triggers y `JSONB`

En Oracle fue necesario diseñar `TRG_DETALLE_TOTAL` como `COMPOUND TRIGGER` para acumular los pedidos afectados y actualizar la cabecera al final de la sentencia. En PostgreSQL, en cambio, la separación entre función disparadora y trigger permite reutilizar funciones, y en `SP_CREAR_RESERVA` un arreglo de servicios llega directamente como `JSONB`:

```sql
-- PostgreSQL: descomposición directa de JSONB dentro de un procedimiento
SELECT * FROM jsonb_to_recordset(p_servicios_json) AS x(id_servicio INT, cantidad INT)
```

---

## Conclusiones

- **Oracle PL/SQL** destaca en aplicaciones centradas en base de datos por su modelo de paquetes, cursores masivos (`FORALL`) y transacciones autónomas integradas.
- **PostgreSQL PL/pgSQL** brilla al integrarse con backends modernos (Spring Boot / Java) gracias a `JSONB`, tipos de rango (`tsrange` + GiST), `RETURNING` y reglas más permisivas en triggers `AFTER`.

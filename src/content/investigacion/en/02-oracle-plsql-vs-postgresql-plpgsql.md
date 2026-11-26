---
lang: en
slugKey: 02-oracle-plsql-vs-postgresql-plpgsql
order: 2
title: "Oracle PL/SQL vs. PostgreSQL PL/pgSQL: Practical Lessons from Class and Project"
summary: "A hands-on comparison of packages, triggers, exception handling, autonomous transactions, and JSONB across both engines."
tags: ["Oracle PL/SQL", "PostgreSQL PL/pgSQL", "Triggers", "JSONB", "Transactions"]
repoUrl: "https://github.com/JUSTSAM3/BasesDeDatos2/blob/main/Entregables/Scrips/02_Logica_Negocio_Procedimientos_Funciones_Triggers.sql"
repoLabel: "View PL/pgSQL logic on GitHub"
---

## Comparative Context

During the semester I worked extensively with both engines: **Oracle** in the advanced SQL and PL/SQL labs ([SQL_Exercises](https://github.com/JUSTSAM3/SQL_Exercises)), and **PostgreSQL 16** in the event-space reservation system ([BasesDeDatos2](https://github.com/JUSTSAM3/BasesDeDatos2)). While PL/pgSQL shares roots with PL/SQL, key architectural differences shape how database logic is written.

---

## Key Practical Differences

| Dimension | Oracle PL/SQL | PostgreSQL PL/pgSQL |
| :--- | :--- | :--- |
| **Packages** | Native (`CREATE PACKAGE` + `BODY`) for encapsulation and private state (`PKG_VENTAS`). | No native packages; procedures/functions are grouped via **schemas** and naming conventions. |
| **Triggers** | Trigger body is inline and **`COMPOUND TRIGGER`** solves `ORA-04091` (mutating table). | Separates trigger function (`RETURNS TRIGGER`) from `CREATE TRIGGER`; `AFTER` triggers can query the target table without mutating-table errors. |
| **Autonomous Transactions** | Built-in via `PRAGMA AUTONOMOUS_TRANSACTION` (e.g., `SP_REGISTRAR_ERROR` persists across `ROLLBACK`). | Not natively supported; requires patterns like `dblink` or application-side logging outside the rolled-back transaction. |
| **Semi-structured Data** | JSON support added in modern releases. | First-class **`JSONB`** with helpers like `jsonb_to_recordset()` to pass variable-length payloads into a `PROCEDURE`. |
| **Bulk Processing** | Explicit `BULK COLLECT` + `FORALL` to eliminate context switches. | Concise `FOR r IN SELECT ... LOOP` alongside expressive `CTE` / `INSERT ... RETURNING` / array constructs. |

---

## Concrete Example: Triggers & `JSONB`

In Oracle, keeping order totals in sync required a `COMPOUND TRIGGER` (`TRG_DETALLE_TOTAL`) to defer table reads until `AFTER STATEMENT`. In PostgreSQL, decoupling trigger functions and leveraging `JSONB` in `SP_CREAR_RESERVA` allowed Spring Boot to send master-detail payloads in a single atomic call:

```sql
-- PostgreSQL: unpacking a JSONB array inside a stored procedure
SELECT * FROM jsonb_to_recordset(p_servicios_json) AS x(id_servicio INT, cantidad INT)
```

---

## Takeaways

- **Oracle PL/SQL** excels in database-centric systems thanks to packages, bulk array binding (`FORALL`), and native autonomous transactions.
- **PostgreSQL PL/pgSQL** pairs cleanly with modern application backends via `JSONB`, range types (`tsrange` + GiST), `RETURNING`, and flexible `AFTER` triggers.

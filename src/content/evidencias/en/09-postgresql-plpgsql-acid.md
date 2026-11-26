---
lang: en
slugKey: 09-postgresql-plpgsql-acid
order: 9
title: "PL/pgSQL Business Logic and ACID Transactions in Event Reservations"
summary: "Stored procedures consuming JSONB arrays, validation functions, COMMIT/ROLLBACK atomicity tests, and reporting views in PostgreSQL 16."
category: postgresql
categoryLabel: "PostgreSQL / PL/pgSQL"
tags: ["PostgreSQL", "PL/pgSQL", "JSONB", "ACID", "Views", "Spring Boot"]
repoUrl: "https://github.com/JUSTSAM3/BasesDeDatos2/blob/main/Entregables/Scrips/02_Logica_Negocio_Procedimientos_Funciones_Triggers.sql"
repoLabel: "View PL/pgSQL script on GitHub"
---

## Context

In the *Event Space Reservation System* project (Bases de Datos 2), the PostgreSQL 16 relational layer enforces core business rules around room availability, operating hours, dynamic pricing, and 1:1 invoicing.

## Problem to Solve

- Encapsulate reservation creation and payment recording in stored procedures (`SP_CREAR_RESERVA`, `SP_REGISTRAR_PAGO`) capable of ingesting variable-length add-on services passed as `JSONB` from the Spring Boot backend.
- Verify ACID atomicity (`COMMIT` vs. `ROLLBACK`) and consolidate executive reporting views ([reports & ACID script](https://github.com/JUSTSAM3/BasesDeDatos2/blob/main/Entregables/Scrips/05_SQL_Reportes_y_Transacciones_Consolidado.sql)).

## Key Aspects of the Solution

`SP_CREAR_RESERVA` checks room status, time-slot availability (`fn_validar_disponibilidad`), and operating hours (08:00–22:00), inserts the master reservation via `RETURNING id_reserva`, and unpacks the `JSONB` add-ons array using `jsonb_to_recordset(...)` in a single database call:

```sql
IF p_servicios_json IS NOT NULL
   AND jsonb_typeof(p_servicios_json) = 'array'
   AND jsonb_array_length(p_servicios_json) > 0 THEN
    FOR r_servicio IN
        SELECT * FROM jsonb_to_recordset(p_servicios_json) AS x(id_servicio INT, cantidad INT)
    LOOP
        SELECT precio_unitario
          INTO v_precio_unitario
          FROM servicios_adicionales
         WHERE id_servicio = r_servicio.id_servicio;
        -- Validate and insert into reserva_servicios
    END LOOP;
END IF;
```

Script 05 validates the full transactional flow inside a `DO $$ ... $$` block: booking creation + advance payment (≥ 30%) + 1:1 invoice generation + `COMMIT`, alongside an explicit `ROLLBACK` test confirming zero leaked rows after aborting.

## Conclusions and Takeaways

- **Semi-structured inputs in relational SPs:** pairing strict relational tables with a `JSONB` parameter (`jsonb_to_recordset`) eliminates chatty round-trips between Java and PostgreSQL while preserving transactional atomicity.
- **Reporting abstraction:** views like `vw_historial_cliente` keep executive queries decoupled from multi-table join logic.

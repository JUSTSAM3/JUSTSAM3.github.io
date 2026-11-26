---
lang: en
slugKey: 01-indice-gist-postgresql
order: 1
title: "GiST Indexes and Exclusion Constraints (EXCLUDE USING gist) in PostgreSQL"
summary: "Preventing overlapping event-room bookings under real concurrency by combining btree_gist, tsrange, and defense-in-depth in PostgreSQL 16."
tags: ["PostgreSQL", "GiST", "btree_gist", "tsrange", "Concurrency", "BasesDeDatos2"]
repoUrl: "https://github.com/JUSTSAM3/BasesDeDatos2/blob/main/Entregables/Scrips/01_DDL_Creacion_Tablas_Constraints_Indices.sql"
repoLabel: "View GiST constraint in BasesDeDatos2"
---

## Motivation from a Real Engineering Problem

In the **Event Space Reservation System** ([BasesDeDatos2](https://github.com/JUSTSAM3/BasesDeDatos2)), two bookings cannot occupy the same room (`id_espacio`) during overlapping time windows while their status is `'pendiente'` or `'confirmada'`.

A common first attempt is checking availability in application code or inside a `BEFORE INSERT` trigger using `SELECT COUNT(*)` for `fecha_inicio < p_fecha_fin AND fecha_fin > p_fecha_inicio`. Under PostgreSQL's default `READ COMMITTED` isolation level, however, that check suffers from a **race condition**:

1. Transaction **T1** checks room 1 from `14:00` to `18:00` → sees `0` conflicts.
2. Concurrently, **T2** checks room 1 from `16:00` to `20:00` before T1 commits → also sees `0` conflicts.
3. Both insert and commit: **the room is double-booked**.

---

## Why B-Tree and `UNIQUE` Constraints Are Not Enough

A `UNIQUE` constraint relies on a B-Tree index, which only detects **exact equality** (`=`) over scalar keys. It cannot enforce **interval intersection** (`[14:00, 18:00) && [16:00, 20:00)`), because two overlapping ranges are not equal.

---

## How GiST and `btree_gist` Solve It

**GiST (Generalized Search Tree)** is an extensible balanced-tree index in PostgreSQL built for non-scalar data types (geometry, full-text search, network addresses, and **range types** such as `tsrange`). Instead of requiring a single total ordering (`<`, `=`, `>`), GiST supports domain-specific predicates like the range overlap operator `&&`.

Because `reservas` combines:
- scalar equality (`id_espacio WITH =`), and
- time-range overlap (`tsrange(fecha_inicio, fecha_fin) WITH &&`),

we enable the **`btree_gist`** extension so scalar types like `INTEGER` can participate inside a GiST index:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE reservas
    DROP CONSTRAINT IF EXISTS no_solapamiento,
    ADD CONSTRAINT no_solapamiento
    EXCLUDE USING gist (
        id_espacio WITH =,
        tsrange(fecha_inicio, fecha_fin) WITH &&
    )
    WHERE (estado IN ('pendiente', 'confirmada'));
```

### Key Design Details

1. **`tsrange(fecha_inicio, fecha_fin)`**: defaults to a half-open `[start, end)` interval in PostgreSQL, allowing back-to-back bookings (`10:00–14:00` and `14:00–18:00`) without conflict.
2. **`WHERE (estado IN ('pendiente', 'confirmada'))`**: partial exclusion index. Canceled or finished bookings do not block future slots and keep the GiST index smaller.
3. **Atomic concurrency safety**: during insert/update, PostgreSQL checks and synchronizes on the index directly; if T1 and T2 race, T2 waits on T1's transaction and fails with `SQLSTATE 23P01` (`exclusion_violation`) once T1 commits.

---

## Defense in Depth: PL/pgSQL Validation + GiST

In [`02_Logica_Negocio_Procedimientos_Funciones_Triggers.sql`](https://github.com/JUSTSAM3/BasesDeDatos2/blob/main/Entregables/Scrips/02_Logica_Negocio_Procedimientos_Funciones_Triggers.sql), both layers work together:

1. **PL/pgSQL pre-check (`fn_validar_disponibilidad` + `trg_validar_cruce_horario`)**: surfaces a clear domain message in normal sequential flows.
2. **GiST exclusion constraint (`no_solapamiento`)**: serves as the unbreakable concurrency safeguard if two requests pass the pre-check simultaneously.

---

## Takeaways

- **Validation is not concurrency control:** pre-checks improve error UX, while `EXCLUDE USING gist` enforces true mutual exclusion without coarse table locks.
- **Partial GiST indexes** solve scheduling conflicts natively in PostgreSQL without blocking concurrent bookings for different rooms.

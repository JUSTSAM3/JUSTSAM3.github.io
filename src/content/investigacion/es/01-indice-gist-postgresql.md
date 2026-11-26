---
lang: es
slugKey: 01-indice-gist-postgresql
order: 1
title: "Índices GiST y restricciones de exclusión (EXCLUDE USING gist) en PostgreSQL"
summary: "Cómo impedir solapamientos de reservas bajo concurrencia real combinando btree_gist, tsrange y defensa en profundidad en PostgreSQL 16."
tags: ["PostgreSQL", "GiST", "btree_gist", "tsrange", "Concurrency", "BasesDeDatos2"]
repoUrl: "https://github.com/JUSTSAM3/BasesDeDatos2/blob/main/Entregables/Scrips/01_DDL_Creacion_Tablas_Constraints_Indices.sql"
repoLabel: "Ver restricción GiST en BasesDeDatos2"
---

## Motivación desde un problema real

En el proyecto **Gestión de Reservas de Espacios para Eventos** ([BasesDeDatos2](https://github.com/JUSTSAM3/BasesDeDatos2)), dos usuarios no pueden reservar el mismo salón (`id_espacio`) en rangos horarios que se solapen mientras la reserva esté `'pendiente'` o `'confirmada'`.

El enfoque intuitivo suele ser validar en la aplicación o en un trigger `BEFORE INSERT` mediante `SELECT COUNT(*)` buscando cruces con `fecha_inicio < p_fecha_fin AND fecha_fin > p_fecha_inicio`. Sin embargo, bajo el nivel de aislamiento por defecto de PostgreSQL (`READ COMMITTED`), ese enfoque sufre una **condición de carrera (*race condition*)**:

1. La transacción **T1** verifica disponibilidad para el salón 1 de `14:00` a `18:00` → encuentra `0` cruces.
2. Simultáneamente, **T2** verifica el mismo salón de `16:00` a `20:00` antes de que T1 haga `COMMIT` → también encuentra `0` cruces.
3. Ambas insertan y confirman: **se genera doble reserva** sobre un mismo salón.

---

## Por qué no basta un índice B-Tree ni `UNIQUE`

Un índice `UNIQUE` basado en B-Tree solo detecta **igualdad exacta** (`=`) sobre columnas o tuplas completas. No puede responder ni hacer cumplir una restricción de **intersección de intervalos** (`[14:00, 18:00) && [16:00, 20:00)`), porque dos rangos solapados no son iguales entre sí.

---

## Qué es GiST y cómo entra `btree_gist`

**GiST (*Generalized Search Tree*)** es una estructura de árbol balanceado extensible en PostgreSQL diseñada para tipos de datos no escalares (geometría, texto completo, direcciones de red y **rangos** como `tsrange`). En lugar de imponer un único orden total (`<`, `=`, `>`), GiST permite indexar operadores de relación espacial o de intervalos, como el operador de solapamiento `&&`.

Como en `reservas` necesitábamos combinar:
- una igualdad escalar (`id_espacio WITH =`), y
- una intersección de rango temporal (`tsrange(fecha_inicio, fecha_fin) WITH &&`),

fue necesario habilitar la extensión **`btree_gist`**, que añade clases de operadores GiST para tipos escalares comunes como `INTEGER`:

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

### Aspectos clave de esta definición

1. **`tsrange(fecha_inicio, fecha_fin)`**: por defecto en PostgreSQL crea un intervalo semiabierto `[fecha_inicio, fecha_fin)`, lo cual permite que una reserva termine a las `14:00` y la siguiente empiece exactamente a las `14:00` sin conflicto (`[10:00, 14:00) && [14:00, 18:00)` es falso).
2. **`WHERE (estado IN ('pendiente', 'confirmada'))`**: índice parcial dentro de la restricción. Las reservas `'cancelada'` o `'finalizada'` no bloquean futuras reservas en el mismo horario y mantienen más liviano el índice GiST.
3. **Garantía atómica en concurrencia**: al insertar, PostgreSQL adquiere bloqueo a nivel de índice sobre el rango conflictivo; si T1 y T2 compiten simultáneamente, T2 espera a que T1 termine y, si T1 hace `COMMIT`, T2 falla con código `SQLSTATE 23P01` (`exclusion_violation`).

---

## Defensa en profundidad: Trigger + GiST

En [`02_Logica_Negocio_Procedimientos_Funciones_Triggers.sql`](https://github.com/JUSTSAM3/BasesDeDatos2/blob/main/Entregables/Scrips/02_Logica_Negocio_Procedimientos_Funciones_Triggers.sql) combinamos **dos capas**:

1. **Capa previa en PL/pgSQL (`fn_validar_disponibilidad` + `trg_validar_cruce_horario`)**: entrega un mensaje de negocio legible antes de llegar al índice en flujos secuenciales.
2. **Capa estructural (`no_solapamiento` con GiST)**: actúa como última línea de defensa infranqueable cuando dos transacciones concurrentes pasan la validación previa al mismo tiempo.

---

## Conclusiones

- **No confundir validación con garantía de concurrencia:** un `SELECT` previo (en backend o en trigger) mejora la experiencia de error, pero sin bloqueo pesimista grueso (`LOCK TABLE`) o una restricción `EXCLUDE USING gist` no es seguro en paralelo.
- **GiST + índices parciales:** resuelven un problema clásico de agendas/reservas directamente en el motor con excelente rendimiento y sin penalizar la concurrencia entre espacios distintos.

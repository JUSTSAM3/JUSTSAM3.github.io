---
lang: es
slugKey: 09-postgresql-plpgsql-acid
order: 9
title: "Lógica de negocio en PL/pgSQL y transacciones ACID en Reservas de Espacios"
summary: "Implementación de procedimientos con JSONB, funciones de validación, pruebas de atomicidad COMMIT/ROLLBACK y reportes gerenciales en PostgreSQL 16."
category: postgresql
categoryLabel: "PostgreSQL / PL/pgSQL"
tags: ["PostgreSQL", "PL/pgSQL", "JSONB", "ACID", "Views", "Spring Boot"]
repoUrl: "https://github.com/JUSTSAM3/BasesDeDatos2/blob/main/Entregables/Scrips/02_Logica_Negocio_Procedimientos_Funciones_Triggers.sql"
repoLabel: "Ver script PL/pgSQL en GitHub"
---

## Contexto

En el proyecto integrador de Bases de Datos 2 (*Sistema de Gestión de Reservas de Espacios para Eventos*), la capa relacional sobre PostgreSQL 16 concentra las reglas críticas de disponibilidad, horario operativo, cálculo de tarifas y facturación 1:1.

## Qué se buscaba resolver

- Encapsular la creación de reservas y el registro de pagos en procedimientos almacenados (`SP_CREAR_RESERVA`, `SP_REGISTRAR_PAGO`) que procesen servicios adicionales variables enviados desde el backend en formato `JSONB`.
- Demostrar propiedades ACID (`COMMIT` completo vs. `ROLLBACK` íntegro) y consolidar reportes gerenciales y vistas ejecutivas ([script de reportes y ACID](https://github.com/JUSTSAM3/BasesDeDatos2/blob/main/Entregables/Scrips/05_SQL_Reportes_y_Transacciones_Consolidado.sql)).

## Aspectos relevantes de la solución

`SP_CREAR_RESERVA` valida estado del recinto, disponibilidad (`fn_validar_disponibilidad`) y horario operativo (08:00–22:00), inserta la reserva maestra con `RETURNING id_reserva` y descompone el arreglo `JSONB` de servicios adicionales usando `jsonb_to_recordset(...)` sin necesidad de múltiples llamadas desde Java:

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
        -- Validación e inserción en reserva_servicios
    END LOOP;
END IF;
```

En el script 05 se verificó el flujo transaccional completo en bloque `DO $$ ... $$`: crear reserva + registrar pago anticipado (≥ 30 %) + generar factura 1:1 y confirmar con `COMMIT`, contrastado con una prueba de `ROLLBACK` donde el registro temporal retorna 0 filas tras abortar la transacción.

## Conclusiones y aprendizajes

- **Tipos semiestructurados en procedimientos:** combinar columnas relacionales estrictas con un parámetro `JSONB` + `jsonb_to_recordset` simplifica el paso de detalles maestro-detalle entre Spring Boot y PostgreSQL en una sola transacción.
- **Trazabilidad y reportes:** encapsular el historial financiero en vistas como `vw_historial_cliente` desacopla los reportes ejecutivos de los detalles internos de unión entre reservas, facturas y pagos.

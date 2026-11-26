---
lang: es
slugKey: 05-sql-reto-banco-andino
order: 5
title: "Reto Banco Andino: atomicidad en transferencias y optimización sargable"
summary: "Diagnóstico de descuadres por commits parciales sin bloqueo y aceleración del tablero gerencial eliminando TO_CHAR en el WHERE."
category: sql-avanzado
categoryLabel: "SQL Avanzado (Oracle)"
tags: ["Oracle SQL", "FOR UPDATE", "ACID", "Sargable", "Index Tuning"]
repoUrl: "https://github.com/JUSTSAM3/SQL_Exercises/blob/main/01-sql-avanzado/07_reto_concurrencia_y_optimizacion.sql"
repoLabel: "Ver 07_reto_concurrencia_y_optimizacion.sql en GitHub"
---

## Contexto

Un ticket crítico de operaciones reportó tres síntomas en producción: descuadres constantes en la cuenta de compensación, transferencias donde se debitaba el origen sin acreditar al destino (o viceversa) y un tablero gerencial que tardaba casi un minuto en cargar.

## Qué se buscaba resolver

1. Diagnosticar por qué la secuencia del *core* generaba saldos inconsistentes y reescribir la transacción garantizando **atomicidad y control de concurrencia**.
2. Optimizar la consulta del tablero de Vicepresidencia para que aproveche índices sin alterar los resultados.

## Aspectos relevantes de la solución

El código original ejecutaba 5 `COMMIT` intermedios, leía el saldo en aplicación sin bloqueo (expuesto a *lost updates*) y escribía valores absolutos precalculados. La corrección unificó todo en una sola unidad transaccional:

- **`SELECT ... ORDER BY id_cuenta FOR UPDATE`**: bloquea ambas cuentas en orden determinístico por ID para prevenir *deadlocks* entre transferencias cruzadas.
- **Actualización relativa (`saldo = saldo - 300000`)** apoyada en la restricción `CHECK (saldo >= 0)` y validación de estado (`AND estado = 'REGISTRADA'`) antes de un único `COMMIT` final.

```sql
SELECT id_cuenta, saldo
  FROM cuenta
 WHERE id_cuenta IN (1001, 1002)
 ORDER BY id_cuenta
   FOR UPDATE;

UPDATE cuenta SET saldo = saldo - 300000 WHERE id_cuenta = 1001;
UPDATE cuenta SET saldo = saldo + 300000 WHERE id_cuenta = 1002;
-- Inserción de movimientos DEBITO / CREDITO y actualización condicional de estado
UPDATE transferencia
   SET estado = 'APLICADA'
 WHERE id_transferencia = 950001
   AND estado = 'REGISTRADA';
COMMIT;
```

Para el tablero, el filtro `TO_CHAR(t.fecha_transf, 'YYYY-MM') = '2026-03'` aplicaba una función sobre la columna e impedía usar cualquier índice. Se reemplazó por un rango *sargable* (`>= DATE '2026-03-01' AND < DATE '2026-04-01'`) respaldado por el índice compuesto `idx_transf_tablero_comp (fecha_transf, estado, cuenta_origen, valor)` y estadísticas actualizadas con `DBMS_STATS`.

## Conclusiones y aprendizajes

- **Una transacción = un `COMMIT`:** fragmentar una transferencia en múltiples `COMMIT` rompe la atomicidad ante cualquier fallo intermedio.
- **Consultas *sargables*:** envolver columnas indexadas en funciones (`TO_CHAR`, `TRUNC`) fuerza *Full Table Scans*; reescribir como rango semiabierto permite *Index Range Scan* e incluso *covering index* cuando las columnas del reporte están en el índice.

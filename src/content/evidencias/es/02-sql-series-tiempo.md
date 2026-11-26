---
lang: es
slugKey: 02-sql-series-tiempo
order: 2
title: "Series de tiempo: acumulado anual, variación mensual y promedio móvil"
summary: "Construcción de una línea base mensual de transferencias en 2026 usando LAG, NULLIF y marcos de ventana móviles de 3 meses."
category: sql-avanzado
categoryLabel: "SQL Avanzado (Oracle)"
tags: ["Oracle SQL", "LAG", "ROWS BETWEEN", "Series de tiempo", "NULLIF"]
repoUrl: "https://github.com/JUSTSAM3/SQL_Exercises/blob/main/01-sql-avanzado/02_series_tiempo_promedio_movil.sql"
repoLabel: "Ver 02_series_tiempo_promedio_movil.sql en GitHub"
---

## Contexto

El área de Riesgo Operativo requiere monitorear mensualmente el comportamiento del monto transferido durante el año 2026 para detectar picos o caídas atípicas respecto al comportamiento histórico reciente.

## Qué se buscaba resolver

Generar una serie mensual consolidada de transferencias aplicadas (`estado = 'APLICADA'`) que incluya en una sola lectura: el acumulado del año (`YTD`), el valor del mes anterior, la variación porcentual mensual y el **promedio móvil de los últimos 3 meses** (mes actual y los dos anteriores) como línea base de comparación.

## Aspectos relevantes de la solución

Se agruparon las transacciones por mes mediante `TRUNC(fecha_transf, 'MM')` usando un filtro de rango *sargable* (`>= DATE '2026-01-01' AND < DATE '2027-01-01'`). Luego, sobre la CTE `mensual`, se aplicaron marcos de ventana (`window frames`) explícitos:

- `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` para el acumulado progresivo del año.
- `LAG(valor_transferido)` junto con `NULLIF(..., 0)` para calcular la variación porcentual protegiendo el primer mes (donde el mes previo es `NULL`) o posibles meses en cero.
- `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` dentro de `AVG(...) OVER (...)` para obtener la media móvil de 3 meses.

```sql
SELECT TO_CHAR(mes,'YYYY-MM')                          AS mes,
       operaciones,
       ROUND(valor_transferido)                        AS valor,
       ROUND(SUM(valor_transferido) OVER (ORDER BY mes
             ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)) AS acumulado,
       ROUND(LAG(valor_transferido) OVER (ORDER BY mes)) AS mes_anterior,
       ROUND(100 * (valor_transferido - LAG(valor_transferido) OVER (ORDER BY mes))
                 / NULLIF(LAG(valor_transferido) OVER (ORDER BY mes),0), 1) AS var_pct,
       ROUND(AVG(valor_transferido) OVER (ORDER BY mes
             ROWS BETWEEN 2 PRECEDING AND CURRENT ROW))  AS prom_movil_3m
  FROM mensual
 ORDER BY mes;
```

## Conclusiones y aprendizajes

- **Separación de fases:** consolidar primero en una CTE mensual evita recalcular agregaciones y mantiene limpias las expresiones analíticas.
- **Precisión del marco `ROWS`:** especificar `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` controla exactamente el número de filas previas incluidas en la media móvil (a diferencia de `RANGE`, que depende del valor de la clave de ordenamiento).
- **Programación defensiva:** usar `NULLIF` en denominadores evita fallos en tiempo de ejecución cuando no existe volumen en periodos previos.

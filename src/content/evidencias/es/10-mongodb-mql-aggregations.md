---
lang: es
slugKey: 10-mongodb-mql-aggregations
order: 10
title: "Consultas MQL, Aggregation Pipelines y explain(\"executionStats\") en MongoDB"
summary: "Consultas sobre sample_mflix con operadores de arreglos, $unwind/$group, $lookup optimizado, materialización con $out e índices compuestos."
category: mongodb
categoryLabel: "MongoDB (NoSQL)"
tags: ["MongoDB", "MQL", "Aggregation Pipeline", "$lookup", "$out", "explain"]
repoUrl: "https://github.com/JUSTSAM3/SQL_Exercises/blob/main/03-mongodb/01_mql_aggregations_mflix.js"
repoLabel: "Ver 01_mql_aggregations_mflix.js en GitHub"
---

## Contexto

Taller práctico de MongoDB Query Language (MQL) y Aggregation Framework ejecutado sobre el dataset de muestra `sample_mflix` (`movies` y `comments`).

## Qué se buscaba resolver

- **Parte A (consultas `find`):** filtros combinados por rango, negación (`$ne`), arreglos exactos (`$size` + `$all`), ausencia/valores nulos (`$exists`) y expresiones regulares (`$regex`).
- **Parte B (pipelines de agregación):** estadísticas por género (`$unwind` + `$group`), top directores con `$slice`, agrupación por décadas, unión `comments` + `movies` (`$lookup`) y usuarios más activos.
- **Parte C (materialización, DML e indexación):** clasificar películas de 2015 con `$switch` + `$out`, actualizaciones masivas (`updateMany`/`deleteMany`) y validar el plan de ejecución tras crear un índice compuesto.

## Aspectos relevantes de la solución

Un punto clave de rendimiento estuvo en el **Punto B.9** (Top 10 películas más comentadas): en lugar de hacer `$lookup` sobre miles de comentarios primero, el pipeline agrupa por `movie_id`, ordena y aplica `$limit: 10` **antes** del `$lookup`, reduciendo el join a únicamente 10 documentos:

```js
db.comments.aggregate([
  { $group: { _id: "$movie_id", numComentarios: { $sum: 1 } } },
  { $sort: { numComentarios: -1 } },
  { $limit: 10 },
  {
    $lookup: {
      from: "movies",
      localField: "_id",
      foreignField: "_id",
      as: "pelicula"
    }
  },
  { $unwind: "$pelicula" },
  { $project: { _id: 0, title: "$pelicula.title", year: "$pelicula.year", numComentarios: 1 } }
]);
```

En el **Punto C.14**, se creó el índice compuesto `{ genres: 1, "imdb.rating": -1, year: 1 }` y se verificó con `.explain("executionStats")` que la consulta sobre películas de Drama evitara un escaneo completo de colección (`COLLSCAN`) y el ordenamiento en memoria.

## Conclusiones y aprendizajes

- **Orden de etapas en Aggregation Pipelines:** filtrar (`$match`), reducir (`$group`) y limitar (`$limit`) antes de `$unwind` o `$lookup` cambia drásticamente la memoria y el tiempo de ejecución.
- **Validación empírica:** `.explain("executionStats")` permite confirmar en MongoDB cuántas claves de índice (`totalKeysExamined`) y documentos (`totalDocsExamined`) fueron realmente tocados.

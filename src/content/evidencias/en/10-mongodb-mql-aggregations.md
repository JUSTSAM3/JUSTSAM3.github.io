---
lang: en
slugKey: 10-mongodb-mql-aggregations
order: 10
title: "MQL Queries, Aggregation Pipelines, and explain(\"executionStats\")"
summary: "Hands-on MongoDB queries on sample_mflix covering array operators, $unwind/$group, optimized $lookup, $out materialization, and compound indexes."
category: mongodb
categoryLabel: "MongoDB (NoSQL)"
tags: ["MongoDB", "MQL", "Aggregation Pipeline", "$lookup", "$out", "explain"]
repoUrl: "https://github.com/JUSTSAM3/SQL_Exercises/blob/main/03-mongodb/01_mql_aggregations_mflix.js"
repoLabel: "View 01_mql_aggregations_mflix.js on GitHub"
---

## Context

Practical workshop on MongoDB Query Language (MQL) and the Aggregation Framework built on the `sample_mflix` dataset (`movies` and `comments` collections).

## Problem to Solve

- **Part A (`find` queries):** range filters, negation (`$ne`), exact array matching (`$size` + `$all`), missing/unrated handling (`$exists`), and regex matching (`$regex`).
- **Part B (aggregation pipelines):** genre metrics (`$unwind` + `$group`), top directors with `$slice`, decade grouping, joining `comments` with `movies` (`$lookup`), and heavy commenters.
- **Part C (materialization, DML & indexing):** classifying 2015 films with `$switch` + `$out`, bulk updates/deletes (`updateMany`/`deleteMany`), and verifying execution stats with a compound index.

## Key Aspects of the Solution

A key performance optimization appears in **Part B.9** (Top 10 most-commented movies): instead of running `$lookup` across thousands of comments first, the pipeline groups by `movie_id`, sorts, and applies `$limit: 10` **before** `$lookup`, restricting the join to just 10 documents:

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

In **Part C.14**, creating compound index `{ genres: 1, "imdb.rating": -1, year: 1 }` and running `.explain("executionStats")` confirmed that the Drama query avoids full collection scans (`COLLSCAN`) and in-memory sorting.

## Conclusions and Takeaways

- **Pipeline stage ordering:** filtering (`$match`), aggregating (`$group`), and capping (`$limit`) before `$unwind` or `$lookup` drastically reduces memory and CPU cost.
- **Measure with `explain`:** inspecting `totalKeysExamined` and `totalDocsExamined` verifies whether an index actually serves both filter and sort predicates.

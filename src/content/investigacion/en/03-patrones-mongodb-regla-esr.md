---
lang: en
slugKey: 03-patrones-mongodb-regla-esr
order: 3
title: "MongoDB Document Modeling Patterns and the ESR Rule"
summary: "Technical synthesis of Subset, Attribute, Extended Reference, and Outlier Patterns alongside Equality-Sort-Range compound index trade-offs."
tags: ["MongoDB", "ESR Rule", "Outlier Pattern", "Subset Pattern", "Indexing"]
repoUrl: "https://github.com/JUSTSAM3/SQL_Exercises/blob/main/03-mongodb/README.md"
repoLabel: "View MongoDB guide on GitHub"
---

## Why Document Modeling Starts with Access Patterns

In document databases, you do not normalize first and figure out queries later: collections are shaped around **which fields are read together** and **which arrays may grow unboundedly**, protecting the 16 MB BSON document limit and avoiding expensive `$lookup` joins on hot paths.

---

## Patterns Applied Across the Workshop & `BasesDeDatos2`

1. **Subset Pattern:** embed only the most recent `N` items (`ultimas_resenas` on restaurants, `comentarios_recientes` on posts) while storing the complete archive in a separate collection.
2. **Outlier Pattern:** rather than penalizing regular users for a few institutional accounts with tens of thousands of followers, outliers set `tiene_seguidores_extra: true` and spill into `followers_overflow`.
3. **Attribute Pattern:** collapse sparse product attributes (`nivel_picante`, `apto_vegano`, `adiciones`) into a uniform `[{ k, v }]` array covered by a single compound index.
4. **Extended Reference & Computed Pattern:** denormalize read-heavy fields (`cliente.nombre`) and pre-computed metrics (`calificacion.promedio`) when reads vastly outnumber writes.

---

## The ESR Rule (*Equality → Sort → Range*)

When building compound indexes for queries combining equality predicates, sorting, and range filters, the canonical key order is **Equality → Sort → Range**:

- **Equality first:** narrows the B-Tree search space immediately.
- **Sort before Range:** lets MongoDB walk the index in sort order and skip an in-memory `SORT` stage (subject to the 100 MB memory cap).
- **The trending-posts trade-off (`Caso3.js`):** querying the last 7 days ordered by `interacciones_totales DESC` highlights the trade-off between `{ fecha: -1, interacciones_totales: -1 }` (tight range scan followed by in-memory sort) vs. `{ interacciones_totales: -1, fecha: -1 }` (**Sort → Range**, allowing early exit after `limit(10)` when the 7-day window matches many posts).

```js
// User feed: Equality (user_id) -> Sort (fecha)
db.posts.createIndex({ user_id: 1, fecha: -1 });

// sample_mflix workshop: Equality (genres) -> Sort (rating) -> Range (year)
db.movies.createIndex({ genres: 1, "imdb.rating": -1, year: 1 });
```

---

## Takeaways

- **Optimize for the 99%, isolate the 1%:** *Subset* and *Outlier* keep working-set documents compact without breaking edge cases.
- **Verify ESR empirically:** `.explain("executionStats")` confirms whether a narrow range or a small `limit` wins for your actual data distribution.

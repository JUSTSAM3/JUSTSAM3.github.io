---
lang: en
slugKey: 11-mongodb-modelado-patrones
order: 11
title: "MongoDB Document Modeling: Delivery Platform & Social Network Patterns"
summary: "Applying Subset, Computed, Attribute, Extended Reference, and Outlier Patterns alongside 2dsphere and ESR-guided indexes."
category: mongodb
categoryLabel: "MongoDB (NoSQL)"
tags: ["MongoDB", "Data Modeling", "Outlier Pattern", "Subset Pattern", "2dsphere", "ESR"]
repoUrl: "https://github.com/JUSTSAM3/SQL_Exercises/blob/main/03-mongodb/02_modelado_domicilios.js"
repoLabel: "View 02_modelado_domicilios.js on GitHub"
---

## Context

Unlike normalized relational schemas, MongoDB schemas are driven by application **access patterns**. These two case studies model a food-delivery platform (Case 1) and a university social network (Case 3 — [`03_modelado_red_social.js`](https://github.com/JUSTSAM3/SQL_Exercises/blob/main/03-mongodb/03_modelado_red_social.js)).

## Problem to Solve

- **Case 1 (Food Delivery):** support heterogeneous product attributes, fast customer order history, top-rated/nearby restaurants (`2dsphere`), and recent reviews without bloating documents.
- **Case 3 (Social Network):** prevent institutional accounts with tens of thousands of followers from breaching the 16 MB BSON limit while keeping user feeds and weekly trends fast.

## Key Aspects of the Solution

Five canonical MongoDB design patterns were combined across both models:

1. **Subset Pattern:** `restaurantes` embeds only `ultimas_resenas` for quick detail views while keeping full history in `resenas` (and `comentarios_recientes` on `posts`).
2. **Computed Pattern:** `restaurantes.calificacion` stores pre-aggregated `{ suma, total, promedio }` to avoid runtime averaging on rankings.
3. **Attribute Pattern:** `productos.atributos` uses `{ k, v }` key-value pairs backed by a single compound index `{ "atributos.k": 1, "atributos.v": 1 }`.
4. **Extended Reference Pattern:** `pedidos` embeds immutable snapshots (`cliente.nombre`, `restaurante.nombre`, `ciudad`) so order history requires zero `$lookup`.
5. **Outlier Pattern (Case 3):** institutional accounts exceeding the embedded follower cap set `tiene_seguidores_extra: true` and overflow into `followers_overflow`:

```js
// Case 3: Outlier Pattern for institutional accounts + ESR feed index
{
  "_id": { "$oid": "60d5ec49f1b2c3d4e5f60001" },
  "nombre": "Universidad El Bosque",
  "tipo_cuenta": "institucional",
  "seguidores": [ { "$oid": "60d5ec49f1b2c3d4e5f600a1" } ],
  "tiene_seguidores_extra": true
}

db.posts.createIndex({ user_id: 1, fecha: -1 }); // Feed (Equality -> Sort)
```

*(Note: when publishing Case 3 to GitHub, non-hex placeholder `$oid` strings were normalized to valid 24-character hex ObjectIds.)*

## Conclusions and Takeaways

- **Embed vs. reference:** embed bounded data read together; apply *Subset* and *Outlier* wherever arrays can grow unboundedly to protect the 16 MB document limit.
- **Query-driven indexing:** Case 1 pairs `2dsphere` geospatial indexes with `{ "cliente._id": 1, fecha: -1 }`, while Case 3 applies the **ESR** rule (Equality → Sort → Range).

---
lang: es
slugKey: 03-patrones-mongodb-regla-esr
order: 3
title: "Patrones de modelado documental en MongoDB y la regla ESR"
summary: "Síntesis técnica de Subset, Attribute, Extended Reference y Outlier Pattern junto con el trade-off de ordenar índices compuestos (Equality, Sort, Range)."
tags: ["MongoDB", "ESR Rule", "Outlier Pattern", "Subset Pattern", "Indexing"]
repoUrl: "https://github.com/JUSTSAM3/SQL_Exercises/blob/main/03-mongodb/README.md"
repoLabel: "Ver guía de MongoDB en GitHub"
---

## Por qué el modelado en MongoDB parte de las consultas

En bases de datos documentales no se normaliza primero para preguntar después: las colecciones se estructuran según **qué datos se leen juntos** y **qué arreglos pueden crecer sin cota**, evitando superar el límite de 16 MB por documento y minimizando los `$lookup`.

---

## Patrones aplicados en el taller y en `BasesDeDatos2`

1. **Subset Pattern:** guardar solo los `N` elementos recientes dentro del documento padre (`ultimas_resenas` en restaurantes, `comentarios_recientes` en posts) y dejar el historial completo en su propia colección.
2. **Outlier Pattern:** cuando una cuenta institucional tiene miles de seguidores, no se rompe el modelo estándar para todos; los documentos atípicos activan una bandera (`tiene_seguidores_extra: true`) y derivan el excedente a `followers_overflow`.
3. **Attribute Pattern:** transformar múltiples atributos dispersos (`nivel_picante`, `apto_vegano`, `adiciones`) en un arreglo uniforme `[{ k, v }]` indexable con una sola clave compuesta.
4. **Extended Reference & Computed Pattern:** duplicar campos de lectura frecuente (`cliente.nombre`) y acumulados (`calificacion.promedio`) cuando las lecturas superan ampliamente a las actualizaciones.

---

## La regla ESR (*Equality → Sort → Range*)

Al diseñar índices compuestos para consultas con filtros de igualdad, ordenamiento y rango, el orden óptimo suele ser **Equality → Sort → Range**:

- **Equality primero:** reduce el subconjunto de claves del B-Tree desde el inicio.
- **Sort antes que Range:** si el campo de ordenamiento precede al de rango, MongoDB entrega los documentos ya ordenados y evita un `SORT` en memoria (que falla si supera 100 MB sin `allowDiskUse`).
- **El *trade-off* en tendencias (`Caso3.js`):** para consultar publicaciones de los últimos 7 días ordenadas por `interacciones_totales DESC`, un índice `{ fecha: -1, interacciones_totales: -1 }` sigue el rango primero pero obliga a ordenar en memoria; en cambio, `{ interacciones_totales: -1, fecha: -1 }` sigue **ESR** (`Sort → Range`) si el rango semanal cubre gran parte de la colección activa, deteniéndose apenas completa el `limit(10)`.

```js
// Feed: Equality (user_id) -> Sort (fecha)
db.posts.createIndex({ user_id: 1, fecha: -1 });

// Ranking MQL en sample_mflix: Equality (genres) -> Sort (rating) -> Range (year)
db.movies.createIndex({ genres: 1, "imdb.rating": -1, year: 1 });
```

---

## Conclusiones

- **Modelar para el 99 % y aislar el 1 %:** *Subset* y *Outlier* mantienen los documentos livianos en memoria sin sacrificar casos extremos.
- **ESR no es dogma ciego, se mide:** `.explain("executionStats")` valida si conviene priorizar el rango (cuando es muy selectivo) o el ordenamiento (cuando el `limit` es pequeño).

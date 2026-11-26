---
lang: es
slugKey: 11-mongodb-modelado-patrones
order: 11
title: "Modelado documental en MongoDB: Domicilios y Red Social con patrones NoSQL"
summary: "Aplicación práctica de Subset, Computed, Attribute, Extended Reference y Outlier Pattern junto con índices 2dsphere y reglas ESR."
category: mongodb
categoryLabel: "MongoDB (NoSQL)"
tags: ["MongoDB", "Data Modeling", "Outlier Pattern", "Subset Pattern", "2dsphere", "ESR"]
repoUrl: "https://github.com/JUSTSAM3/SQL_Exercises/blob/main/03-mongodb/02_modelado_domicilios.js"
repoLabel: "Ver 02_modelado_domicilios.js en GitHub"
---

## Contexto

A diferencia del modelo relacional normalizado, en MongoDB el esquema se diseña a partir de las **consultas y patrones de acceso** de la aplicación. En estos dos casos se modelaron una plataforma de domicilios (Caso 1) y una red social universitaria (Caso 3 — [`03_modelado_red_social.js`](https://github.com/JUSTSAM3/SQL_Exercises/blob/main/03-mongodb/03_modelado_red_social.js)).

## Qué se buscaba resolver

- **Caso 1 (Domicilios):** soportar consultas frecuentes de menú por atributos heterogéneos, historial de pedidos del cliente, top restaurantes por ciudad/cercanía y reseñas recientes sin saturar un solo documento.
- **Caso 3 (Red Social):** evitar el límite de 16 MB en cuentas institucionales con decenas de miles de seguidores mientras se mantienen rápidos el *feed* y las tendencias semanales.

## Aspectos relevantes de la solución

Se combinaron cinco patrones clásicos de diseño documental:

1. **Subset Pattern:** `restaurantes` embebe únicamente `ultimas_resenas` para la vista principal y delega el historial completo a `resenas`; lo mismo ocurre con `comentarios_recientes` en `posts`.
2. **Computed Pattern:** `restaurantes.calificacion` almacena `{ suma, total, promedio }` precalculados para evitar `$avg` en tiempo real al listar rankings.
3. **Attribute Pattern:** `productos.atributos` usa pares `{ k, v }` con un único índice compuesto `{ "atributos.k": 1, "atributos.v": 1 }` en lugar de crear un índice por cada atributo posible.
4. **Extended Reference Pattern:** `pedidos` guarda un resumen inmutable (`cliente.nombre`, `restaurante.nombre`, `ciudad`) para mostrar el historial sin `$lookup`.
5. **Outlier Pattern (Caso 3):** cuando una cuenta institucional supera el umbral de seguidores embebidos, marca `tiene_seguidores_extra: true` y deriva el excedente a la colección `followers_overflow`:

```js
// Caso 3: Outlier Pattern en usuarios institucionales + índice ESR para feed
{
  "_id": { "$oid": "60d5ec49f1b2c3d4e5f60001" },
  "nombre": "Universidad El Bosque",
  "tipo_cuenta": "institucional",
  "seguidores": [ { "$oid": "60d5ec49f1b2c3d4e5f600a1" } ],
  "tiene_seguidores_extra": true
}

db.posts.createIndex({ user_id: 1, fecha: -1 }); // Feed (Equality -> Sort)
```

*(Además, durante la publicación técnica en GitHub se normalizaron los `$oid` de ejemplo del Caso 3 a formato hexadecimal válido de 24 caracteres).*

## Conclusiones y aprendizajes

- **Embeber vs. referenciar:** se embebe lo que se lee junto y tiene tamaño acotado; cuando un arreglo puede crecer sin límite (reseñas, comentarios, seguidores), *Subset* y *Outlier* protegen el límite de 16 MB por documento.
- **Índices guiados por consultas:** en Domicilios se combinaron índices `2dsphere` para geolocalización e índices `{ "cliente._id": 1, fecha: -1 }`, mientras en Red Social se aplicó la regla **ESR** (Equality → Sort → Range).

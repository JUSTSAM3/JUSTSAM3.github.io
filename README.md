# Samuel Mesa — E-Portafolio

Portafolio personal y e-portafolio académico bilingüe (**Español / Inglés**) desplegado en [justsam3.github.io](https://justsam3.github.io).

Documenta el proceso de aprendizaje, decisiones de diseño y análisis técnico detrás de proyectos y talleres de **SQL Avanzado (Oracle)**, **PL/SQL**, **PostgreSQL / PL/pgSQL**, **MongoDB** y desarrollo full stack.

---

## Contenido del sitio

- **Evidencias (`/es/evidencias/*`, `/en/evidencias/*`)**: 11 casos representativos estructurados con *contexto → problema a resolver → aspectos clave y fragmentos → enlace al script completo → conclusiones*.
- **Investigación y Profundización (`/es/investigacion/*`, `/en/investigacion/*`)**:
  - Índices GiST y restricciones de exclusión (`EXCLUDE USING gist`) en PostgreSQL.
  - Oracle PL/SQL vs. PostgreSQL PL/pgSQL.
  - Patrones de modelado documental en MongoDB y la regla ESR.
- **Proyectos**: enlaces directos a los repositorios técnicos.

---

## Repositorios relacionados

- **[SQL_Exercises](https://github.com/JUSTSAM3/SQL_Exercises)**: scripts completos de SQL Avanzado (Oracle), PL/SQL (Oracle) y MongoDB (MQL, Aggregation Pipelines y modelado documental).
- **[BasesDeDatos2](https://github.com/JUSTSAM3/BasesDeDatos2)**: sistema de gestión de reservas de espacios con persistencia políglota (PostgreSQL 16 + MongoDB 7), Spring Boot (Java 21), Angular y Docker.
- **[StardewValley](https://github.com/JUSTSAM3/StardewValley)**: sistema de información de gestión de granja en PostgreSQL y Flask.

---

## Stack técnico

- **Framework:** [Astro 5](https://astro.build/) + Content Collections (`src/content.config.ts`)
- **Estilos:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Internacionalización:** `@ariaskit/astro-i18n` (`es` y `en`)
- **Despliegue:** GitHub Pages vía GitHub Actions (`.github/workflows/deploy.yml`)

---

## Estructura principal

```text
JUSTSAM3.github.io/
├── i18n/                        # Traducciones (en.json / es.json)
├── src/
│   ├── components/              # Header, Hero, Evidences, Research, Projects, Experience, Skills, Footer
│   ├── content/
│   │   ├── evidencias/{es,en}/  # Fichas técnicas de evidencias en Markdown
│   │   └── investigacion/{es,en}/ # Notas de profundización en Markdown
│   ├── pages/[lang]/            # Rutas estáticas localizadas (/es, /en, /evidencias/[slug], /investigacion/[slug])
│   └── content.config.ts        # Esquemas Zod de las colecciones
└── .github/workflows/           # Validación i18n y despliegue a GitHub Pages
```

---

## Ejecución local

Requisitos: Node.js 22+ y Corepack (`pnpm@10.34.9`).

```bash
corepack pnpm install
corepack pnpm dev       # Servidor local en http://localhost:4321
corepack pnpm build     # Valida claves i18n y genera el sitio estático en dist/
```

---

## Créditos

Base de diseño inspirada en la plantilla [Void](https://github.com/JorgeRosbel/void) de JorgeRosbel (licencia MIT).

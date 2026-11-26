import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const evidencias = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/evidencias' }),
  schema: z.object({
    lang: z.enum(['es', 'en']),
    slugKey: z.string(),
    order: z.number(),
    title: z.string(),
    summary: z.string(),
    category: z.enum(['sql-avanzado', 'plsql', 'postgresql', 'mongodb']),
    categoryLabel: z.string(),
    tags: z.array(z.string()),
    repoUrl: z.string().url(),
    repoLabel: z.string(),
  }),
});

const investigacion = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/investigacion' }),
  schema: z.object({
    lang: z.enum(['es', 'en']),
    slugKey: z.string(),
    order: z.number(),
    title: z.string(),
    summary: z.string(),
    tags: z.array(z.string()),
    repoUrl: z.string().url().optional(),
    repoLabel: z.string().optional(),
  }),
});

export const collections = { evidencias, investigacion };

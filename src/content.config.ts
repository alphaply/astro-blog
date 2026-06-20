import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/blog' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      updatedDate: z.preprocess(
        (value) => (value === null || value === '' ? undefined : value),
        z.coerce.date().optional(),
      ),
      draft: z.boolean().optional().default(false),
      cover: z
        .union([image(), z.string()])
        .nullable()
        .optional()
        .transform((cover) => cover ?? ''),
      category: z
        .string()
        .nullable()
        .optional()
        .transform((category) => category || '随笔'),
      tags: z
        .array(z.string())
        .nullable()
        .optional()
        .transform((tags) => tags ?? []),
    }),
});

const notes = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    mood: z.string().optional().default('记录'),
    tags: z
      .array(z.string())
      .nullable()
      .optional()
      .transform((tags) => tags ?? []),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = { blog, notes };

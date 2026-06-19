import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updatedDate: z.preprocess(
      (value) => (value === null || value === '' ? undefined : value),
      z.coerce.date().optional(),
    ),
    draft: z.boolean().optional().default(false),
    cover: z
      .string()
      .nullable()
      .optional()
      .transform((cover) => cover ?? ''),
    tags: z
      .array(z.string())
      .nullable()
      .optional()
      .transform((tags) => tags ?? []),
  }),
});

export const collections = { blog };

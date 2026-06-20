# Alpha Blog

Static blog powered by Astro, MDX content collections, Expressive Code, KaTeX, Pagefind, and Giscus.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:4321` for the site.

## Content Workflow

Content is managed directly in the repository:

- Blog posts: `src/content/blog/*.mdx`
- Notes: `src/content/notes/*.mdx`
- Reusable MDX components: `src/components/mdx`
- Local assets: `src/assets`

There is no online writing backend. Edit MDX files, commit, push, and let Vercel deploy.

## Comments

Comments use Giscus and GitHub Discussions. Configure these environment variables in Vercel:

```bash
PUBLIC_GISCUS_REPO=alphaply/astro-blog
PUBLIC_GISCUS_REPO_ID=...
PUBLIC_GISCUS_CATEGORY=...
PUBLIC_GISCUS_CATEGORY_ID=...
```

If the variables are missing, the site shows a static configuration notice instead of failing the build.

## Deploy

Connect the repository to Vercel:

- Build command: `npm run build`
- Output directory: `dist`

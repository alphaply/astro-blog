# Astro Blog

Static blog powered by Astro, MDX content collections, and Sveltia CMS.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:4321` for the site and `http://localhost:4321/admin/` for Sveltia CMS.

## CMS Setup

Content lives in `src/content/blog/*.mdx`. Uploaded media lives in `public/uploads` and is referenced as `/uploads/...`.

Before deploying the CMS, update `public/admin/config.yml`:

```yaml
backend:
  name: github
  repo: your-github-username/astro-blog
  branch: main
```

For GitHub login on a Vercel-hosted site, Sveltia CMS needs a GitHub OAuth flow. The recommended option is the Sveltia CMS Authenticator Cloudflare Worker, then add its URL as `backend.base_url`.

## Deploy

Connect the repository to Vercel. Vercel can use:

- Build command: `npm run build`
- Output directory: `dist`

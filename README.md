# Alpha's Blog

Static blog powered by Astro, MDX content collections, and Sveltia CMS.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:4321` for the site and `http://localhost:4321/admin/` for Sveltia CMS.

Production site: `https://elpha.vercel.app/`

Production CMS: `https://elpha.vercel.app/admin/`

## Theme and CMS Workflow

When adding a reusable writing component, update both sides together:

- Add the front-end rendering or CSS for the component.
- Register a matching Sveltia editor component in `public/admin/cms.js`.
- Add the component ID to the `editor_components` list for the body field in `public/admin/config.yml`.
- Add a short example in an MDX draft before publishing.

## CMS Setup

Content lives in `src/content/blog/*.mdx`. Uploaded media lives in `public/uploads` and is referenced as `/uploads/...`.

The CMS backend is configured in `public/admin/config.yml`:

```yaml
backend:
  name: github
  repo: alphaply/astro-blog
  branch: main
  base_url: https://sveltia-cms-auth.1526147838.workers.dev
```

For GitHub login on the Vercel-hosted site, Sveltia CMS uses the Sveltia CMS Authenticator Cloudflare Worker above.

## Deploy

Connect the repository to Vercel. Vercel can use:

- Build command: `npm run build`
- Output directory: `dist`

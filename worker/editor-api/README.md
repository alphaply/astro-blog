# Alpha blog Editor API

Cloudflare Worker used by `/admin/editor/` to read and save MDX posts through the GitHub Contents API.

## Configure

Set secrets:

```powershell
npx wrangler secret put ADMIN_PASSWORD --config worker/editor-api/wrangler.jsonc
npx wrangler secret put SESSION_SECRET --config worker/editor-api/wrangler.jsonc
npx wrangler secret put GITHUB_TOKEN --config worker/editor-api/wrangler.jsonc
```

`GITHUB_TOKEN` should be a fine-grained GitHub token with repository Contents read/write permission for `alphaply/astro-blog`.

## Deploy

```powershell
npx wrangler deploy --config worker/editor-api/wrangler.jsonc
```

After deployment, open `/admin/editor/`, set the Worker URL, and log in with `ADMIN_PASSWORD`.

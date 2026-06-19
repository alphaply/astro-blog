type Env = {
  ADMIN_PASSWORD: string;
  SESSION_SECRET: string;
  GITHUB_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
  ALLOWED_ORIGIN?: string;
};

const encoder = new TextEncoder();
const contentRoot = 'src/content/blog';

const json = (data: unknown, init: ResponseInit = {}, origin = '*') =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
      ...(init.headers || {}),
    },
  });

const text = (message: string, status = 400, origin = '*') =>
  new Response(message, {
    status,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
    },
  });

const base64Encode = (value: string) => btoa(String.fromCharCode(...new Uint8Array(encoder.encode(value))));
const base64Decode = (value: string) => new TextDecoder().decode(Uint8Array.from(atob(value), (char) => char.charCodeAt(0)));

const resolveOrigin = (request: Request, env: Env) => {
  const origin = request.headers.get('Origin');
  const fallback = env.ALLOWED_ORIGIN || '*';
  if (!origin) return fallback;
  if (origin === env.ALLOWED_ORIGIN) return origin;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return fallback;
};

const hmac = async (secret: string, value: string) => {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
};

const makeSession = async (env: Env) => {
  const payload = base64Encode(JSON.stringify({ exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
  return `${payload}.${await hmac(env.SESSION_SECRET, payload)}`;
};

const getCookie = (request: Request, name: string) => {
  const cookie = request.headers.get('Cookie') || '';
  return cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
};

const assertAuth = async (request: Request, env: Env) => {
  const session = getCookie(request, 'alpha_editor_session');
  if (!session) return false;
  const [payload, signature] = session.split('.');
  if (!payload || !signature) return false;
  if ((await hmac(env.SESSION_SECRET, payload)) !== signature) return false;
  const data = JSON.parse(base64Decode(payload));
  return Number(data.exp) > Date.now();
};

const github = async (env: Env, path: string, init: RequestInit = {}) => {
  const response = await fetch(`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'alpha-blog-editor',
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${await response.text()}`);
  }
  return response.json();
};

const parseFrontmatter = (raw: string) => {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  const yaml = match?.[1] || '';
  const find = (key: string) => yaml.match(new RegExp(`^${key}:\\s*['"]?(.*?)['"]?$`, 'm'))?.[1] || '';
  return {
    title: find('title') || '未命名文章',
    description: find('description'),
    date: find('date'),
    draft: find('draft') === 'true',
    category: find('category') || '随笔',
  };
};

const normalizeSlug = (slug: string) =>
  slug
    .replace(/\.mdx?$/, '')
    .replace(/[\\/#?%*:|"<>]/g, '-')
    .trim();

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = resolveOrigin(request, env);
    if (request.method === 'OPTIONS') return json({}, {}, origin);

    const url = new URL(request.url);
    try {
      if (url.pathname === '/auth/login' && request.method === 'POST') {
        const body = (await request.json()) as { password?: string };
        if (!body.password || body.password !== env.ADMIN_PASSWORD) return text('密码错误', 401, origin);
        const session = await makeSession(env);
        return json(
          { ok: true },
          {
            headers: {
              'Set-Cookie': `alpha_editor_session=${session}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=604800`,
            },
          },
          origin,
        );
      }

      if (!(await assertAuth(request, env))) return text('未登录', 401, origin);

      if (url.pathname === '/posts' && request.method === 'GET') {
        const files = await github(env, `/contents/${contentRoot}?ref=${env.GITHUB_BRANCH}`);
        const posts = await Promise.all(
          files
            .filter((file: { name: string; type: string }) => file.type === 'file' && /\.mdx?$/.test(file.name))
            .map(async (file: { name: string; path: string; sha: string }) => {
              const item = await github(env, `/contents/${file.path}?ref=${env.GITHUB_BRANCH}`);
              const raw = base64Decode(String(item.content || '').replace(/\n/g, ''));
              return { slug: file.name.replace(/\.mdx?$/, ''), path: file.path, sha: item.sha, ...parseFrontmatter(raw) };
            }),
        );
        posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
        return json({ posts }, {}, origin);
      }

      if (url.pathname === '/posts' && request.method === 'POST') {
        const body = (await request.json()) as { slug: string; raw: string; message?: string };
        const slug = normalizeSlug(body.slug);
        const path = `${contentRoot}/${slug}.mdx`;
        const result = await github(env, `/contents/${path}`, {
          method: 'PUT',
          body: JSON.stringify({
            message: body.message || `Create post: ${slug}`,
            content: base64Encode(body.raw),
            branch: env.GITHUB_BRANCH,
          }),
        });
        return json({ sha: result.content?.sha, commit: result.commit?.sha, path, slug }, {}, origin);
      }

      const postMatch = url.pathname.match(/^\/posts\/(.+)$/);
      if (postMatch && request.method === 'GET') {
        const slug = normalizeSlug(decodeURIComponent(postMatch[1]));
        const path = `${contentRoot}/${slug}.mdx`;
        const item = await github(env, `/contents/${path}?ref=${env.GITHUB_BRANCH}`);
        return json({ slug, path, sha: item.sha, raw: base64Decode(String(item.content || '').replace(/\n/g, '')) }, {}, origin);
      }

      if (postMatch && request.method === 'PUT') {
        const slug = normalizeSlug(decodeURIComponent(postMatch[1]));
        const body = (await request.json()) as { raw: string; sha: string; message?: string };
        if (!body.sha) return text('更新文章必须提供 sha', 400, origin);
        const path = `${contentRoot}/${slug}.mdx`;
        const result = await github(env, `/contents/${path}`, {
          method: 'PUT',
          body: JSON.stringify({
            message: body.message || `Update post: ${slug}`,
            content: base64Encode(body.raw),
            sha: body.sha,
            branch: env.GITHUB_BRANCH,
          }),
        });
        return json({ sha: result.content?.sha, commit: result.commit?.sha, path, slug }, {}, origin);
      }

      return text('Not found', 404, origin);
    } catch (error) {
      return text(error instanceof Error ? error.message : String(error), 500, origin);
    }
  },
};

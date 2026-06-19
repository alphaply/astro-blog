import { useMemo, useState } from 'react';
import { BlockNoteView } from '@blocknote/mantine';
import { useCreateBlockNote } from '@blocknote/react';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import {
  createBlock,
  createEmptyPost,
  parseMdxToBlocks,
  serializeBlocksToMdx,
  type EditorBlock,
  type Frontmatter,
} from '../../lib/editor/codec';
import './editor.css';

type PostSummary = {
  slug: string;
  path: string;
  sha: string;
  title: string;
  description: string;
  date: string;
  draft: boolean;
  category: string;
};

type LoadedPost = {
  slug: string;
  path: string;
  sha: string;
  raw: string;
};

const blockTypes: Array<{ type: EditorBlock['type']; label: string }> = [
  { type: 'paragraph', label: '段落' },
  { type: 'heading', label: '标题' },
  { type: 'list', label: '列表' },
  { type: 'table', label: '表格' },
  { type: 'callout', label: '提示块' },
  { type: 'details', label: '折叠框' },
  { type: 'code', label: '代码' },
  { type: 'math', label: '公式' },
  { type: 'mermaid', label: 'Mermaid' },
  { type: 'blur', label: '隐藏文字' },
  { type: 'columns', label: '双列' },
  { type: 'plan', label: '计划' },
  { type: 'timeline', label: '时间线' },
  { type: 'gallery', label: '图库' },
  { type: 'rawMarkdown', label: 'Raw' },
];

const apiBaseKey = 'alpha-editor-api-base';
const initialApiBase = () => localStorage.getItem(apiBaseKey) || 'https://alpha-blog-editor-api.your-subdomain.workers.dev';

export default function EditorApp() {
  const [apiBase, setApiBase] = useState(initialApiBase);
  const [password, setPassword] = useState('');
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [current, setCurrent] = useState<LoadedPost | null>(null);
  const [frontmatter, setFrontmatter] = useState<Frontmatter>(createEmptyPost().frontmatter);
  const [blocks, setBlocks] = useState<EditorBlock[]>(createEmptyPost().blocks);
  const [status, setStatus] = useState('请先登录并加载文章。');
  const [saving, setSaving] = useState(false);
  const previewMdx = useMemo(() => serializeBlocksToMdx(frontmatter, blocks), [frontmatter, blocks]);
  const noteEditor = useCreateBlockNote({
    initialContent: [
      {
        type: 'paragraph',
        content: '这是 BlockNote 富文本沙盒：用于临时起草段落、列表和表格。正式保存请使用下方结构化块。',
      },
    ],
  });

  const request = async (path: string, options: RequestInit = {}) => {
    const response = await fetch(`${apiBase.replace(/\/$/, '')}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Request failed: ${response.status}`);
    }
    return response.json();
  };

  const login = async () => {
    localStorage.setItem(apiBaseKey, apiBase);
    await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    setStatus('登录成功，正在加载文章列表。');
    await loadPosts();
  };

  const loadPosts = async () => {
    const data = await request('/posts');
    setPosts(data.posts || []);
    setStatus(`已加载 ${data.posts?.length || 0} 篇文章。`);
  };

  const openPost = async (slug: string) => {
    const post = await request(`/posts/${encodeURIComponent(slug)}`);
    const parsed = parseMdxToBlocks(post.raw);
    setCurrent(post);
    setFrontmatter(parsed.frontmatter);
    setBlocks(parsed.blocks.length ? parsed.blocks : createEmptyPost().blocks);
    setStatus(`已打开：${parsed.frontmatter.title}`);
  };

  const newPost = () => {
    const empty = createEmptyPost();
    const slug = `new-post-${new Date().toISOString().slice(0, 10)}`;
    setCurrent({ slug, path: `src/content/blog/${slug}.mdx`, sha: '', raw: '' });
    setFrontmatter(empty.frontmatter);
    setBlocks(empty.blocks);
    setStatus('已创建本地新文章，保存后会提交到 GitHub。');
  };

  const savePost = async () => {
    if (!current) return;
    setSaving(true);
    try {
      const raw = serializeBlocksToMdx(frontmatter, blocks);
      const method = current.sha ? 'PUT' : 'POST';
      const path = current.sha ? `/posts/${encodeURIComponent(current.slug)}` : '/posts';
      const result = await request(path, {
        method,
        body: JSON.stringify({
          slug: current.slug,
          path: current.path,
          sha: current.sha,
          raw,
          message: `Update post: ${frontmatter.title}`,
        }),
      });
      setCurrent({ ...current, sha: result.sha || current.sha, raw });
      setStatus(`保存成功：${result.commit || 'GitHub commit 已创建'}`);
      await loadPosts();
    } finally {
      setSaving(false);
    }
  };

  const updateBlock = (id: string, patch: Partial<EditorBlock>) => {
    setBlocks((items) => items.map((item) => (item.id === id ? ({ ...item, ...patch } as EditorBlock) : item)));
  };

  const addBlock = (type: EditorBlock['type']) => setBlocks((items) => [...items, createBlock(type)]);
  const removeBlock = (id: string) => setBlocks((items) => items.filter((item) => item.id !== id));
  const moveBlock = (id: string, delta: -1 | 1) => {
    setBlocks((items) => {
      const index = items.findIndex((item) => item.id === id);
      const next = index + delta;
      if (index < 0 || next < 0 || next >= items.length) return items;
      const copy = [...items];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
  };

  return (
    <div className="editor-app">
      <aside className="editor-sidebar">
        <div className="editor-panel">
          <h1>Alpha editor</h1>
          <label>
            Worker API
            <input value={apiBase} onChange={(event) => setApiBase(event.target.value)} />
          </label>
          <label>
            后台密码
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <div className="editor-actions">
            <button onClick={login}>登录</button>
            <button onClick={newPost} className="secondary">
              新文章
            </button>
          </div>
        </div>
        <div className="editor-panel post-list">
          <h2>文章</h2>
          {posts.map((post) => (
            <button key={post.path} onClick={() => openPost(post.slug)} className={current?.slug === post.slug ? 'active' : ''}>
              <strong>{post.title}</strong>
              <span>{post.category} / {post.date}</span>
            </button>
          ))}
        </div>
      </aside>

      <main className="editor-main">
        <section className="editor-panel editor-meta">
          <label>
            标题
            <input value={frontmatter.title} onChange={(event) => setFrontmatter({ ...frontmatter, title: event.target.value })} />
          </label>
          <label>
            摘要
            <textarea value={frontmatter.description} onChange={(event) => setFrontmatter({ ...frontmatter, description: event.target.value })} />
          </label>
          <div className="meta-grid">
            <label>
              日期
              <input type="date" value={frontmatter.date} onChange={(event) => setFrontmatter({ ...frontmatter, date: event.target.value })} />
            </label>
            <label>
              更新
              <input
                type="date"
                value={frontmatter.updatedDate || ''}
                onChange={(event) => setFrontmatter({ ...frontmatter, updatedDate: event.target.value })}
              />
            </label>
            <label>
              分类
              <input value={frontmatter.category} onChange={(event) => setFrontmatter({ ...frontmatter, category: event.target.value })} />
            </label>
            <label>
              标签
              <input
                value={frontmatter.tags.join(', ')}
                onChange={(event) => setFrontmatter({ ...frontmatter, tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })}
              />
            </label>
          </div>
          <label className="checkbox">
            <input type="checkbox" checked={frontmatter.draft} onChange={(event) => setFrontmatter({ ...frontmatter, draft: event.target.checked })} />
            草稿
          </label>
        </section>

        <section className="editor-panel blocknote-panel">
          <h2>富文本草稿区</h2>
          <BlockNoteView editor={noteEditor} />
        </section>

        <section className="block-toolbar">
          {blockTypes.map((item) => (
            <button key={item.type} onClick={() => addBlock(item.type)}>
              + {item.label}
            </button>
          ))}
        </section>

        <section className="blocks">
          {blocks.map((block, index) => (
            <BlockCard
              key={block.id}
              block={block}
              index={index}
              updateBlock={updateBlock}
              removeBlock={removeBlock}
              moveBlock={moveBlock}
            />
          ))}
        </section>
      </main>

      <aside className="editor-inspector">
        <div className="editor-panel">
          <h2>保存</h2>
          <p>{status}</p>
          <button onClick={savePost} disabled={!current || saving}>
            {saving ? '保存中...' : '保存到 GitHub'}
          </button>
          <a href="/admin/">Sveltia 兜底入口</a>
        </div>
        <details className="editor-panel">
          <summary>MDX 预览</summary>
          <pre>{previewMdx}</pre>
        </details>
      </aside>
    </div>
  );
}

function BlockCard({
  block,
  index,
  updateBlock,
  removeBlock,
  moveBlock,
}: {
  block: EditorBlock;
  index: number;
  updateBlock: (id: string, patch: Partial<EditorBlock>) => void;
  removeBlock: (id: string) => void;
  moveBlock: (id: string, delta: -1 | 1) => void;
}) {
  const title = block.type;
  return (
    <article className={`block-card block-${block.type}`}>
      <header>
        <span>{index + 1}. {title}</span>
        <div>
          <button onClick={() => moveBlock(block.id, -1)}>↑</button>
          <button onClick={() => moveBlock(block.id, 1)}>↓</button>
          <button onClick={() => removeBlock(block.id)}>删除</button>
        </div>
      </header>
      <BlockFields block={block} updateBlock={updateBlock} />
    </article>
  );
}

function BlockFields({ block, updateBlock }: { block: EditorBlock; updateBlock: (id: string, patch: Partial<EditorBlock>) => void }) {
  if (block.type === 'paragraph') return <textarea value={block.text} onChange={(event) => updateBlock(block.id, { text: event.target.value } as Partial<EditorBlock>)} />;
  if (block.type === 'heading') {
    return (
      <div className="inline-fields">
        <select value={block.level} onChange={(event) => updateBlock(block.id, { level: Number(event.target.value) as 1 | 2 | 3 } as Partial<EditorBlock>)}>
          <option value={1}>H1</option>
          <option value={2}>H2</option>
          <option value={3}>H3</option>
        </select>
        <input value={block.text} onChange={(event) => updateBlock(block.id, { text: event.target.value } as Partial<EditorBlock>)} />
      </div>
    );
  }
  if (block.type === 'list') {
    return <textarea value={block.items.join('\n')} onChange={(event) => updateBlock(block.id, { items: event.target.value.split('\n') } as Partial<EditorBlock>)} />;
  }
  if (block.type === 'table') return <TableEditor block={block} updateBlock={updateBlock} />;
  if (block.type === 'code') {
    return (
      <>
        <div className="inline-fields">
          <input value={block.language} onChange={(event) => updateBlock(block.id, { language: event.target.value } as Partial<EditorBlock>)} />
          <input value={block.title} onChange={(event) => updateBlock(block.id, { title: event.target.value } as Partial<EditorBlock>)} />
        </div>
        <textarea value={block.code} onChange={(event) => updateBlock(block.id, { code: event.target.value } as Partial<EditorBlock>)} />
      </>
    );
  }
  if (block.type === 'math') return <textarea value={block.equation} onChange={(event) => updateBlock(block.id, { equation: event.target.value } as Partial<EditorBlock>)} />;
  if (block.type === 'mermaid') return <textarea value={block.diagram} onChange={(event) => updateBlock(block.id, { diagram: event.target.value } as Partial<EditorBlock>)} />;
  if (block.type === 'callout') {
    return (
      <>
        <div className="inline-fields">
          <select value={block.calloutType} onChange={(event) => updateBlock(block.id, { calloutType: event.target.value } as Partial<EditorBlock>)}>
            {['info', 'note', 'tip', 'success', 'warning', 'danger'].map((type) => <option key={type}>{type}</option>)}
          </select>
          <input value={block.title} onChange={(event) => updateBlock(block.id, { title: event.target.value } as Partial<EditorBlock>)} />
        </div>
        <textarea value={block.content} onChange={(event) => updateBlock(block.id, { content: event.target.value } as Partial<EditorBlock>)} />
      </>
    );
  }
  if (block.type === 'details') {
    return (
      <>
        <input value={block.title} onChange={(event) => updateBlock(block.id, { title: event.target.value } as Partial<EditorBlock>)} />
        <textarea value={block.content} onChange={(event) => updateBlock(block.id, { content: event.target.value } as Partial<EditorBlock>)} />
      </>
    );
  }
  if (block.type === 'blur') return <input value={block.text} onChange={(event) => updateBlock(block.id, { text: event.target.value } as Partial<EditorBlock>)} />;
  if (block.type === 'columns') {
    return (
      <div className="two-fields">
        <textarea value={block.left} onChange={(event) => updateBlock(block.id, { left: event.target.value } as Partial<EditorBlock>)} />
        <textarea value={block.right} onChange={(event) => updateBlock(block.id, { right: event.target.value } as Partial<EditorBlock>)} />
      </div>
    );
  }
  if (block.type === 'plan') {
    return (
      <div className="two-fields">
        <input value={block.todo} onChange={(event) => updateBlock(block.id, { todo: event.target.value } as Partial<EditorBlock>)} />
        <input value={block.doing} onChange={(event) => updateBlock(block.id, { doing: event.target.value } as Partial<EditorBlock>)} />
        <input value={block.done} onChange={(event) => updateBlock(block.id, { done: event.target.value } as Partial<EditorBlock>)} />
      </div>
    );
  }
  if (block.type === 'timeline') return <TimelineEditor block={block} updateBlock={updateBlock} />;
  if (block.type === 'gallery') return <textarea value={block.images.map((image) => `${image.src} | ${image.alt}`).join('\n')} onChange={(event) => updateBlock(block.id, { images: event.target.value.split('\n').filter(Boolean).map((line) => { const [src, alt = ''] = line.split('|').map((part) => part.trim()); return { src, alt }; }) } as Partial<EditorBlock>)} />;
  return <textarea value={block.markdown} onChange={(event) => updateBlock(block.id, { markdown: event.target.value } as Partial<EditorBlock>)} />;
}

function TableEditor({ block, updateBlock }: { block: Extract<EditorBlock, { type: 'table' }>; updateBlock: (id: string, patch: Partial<EditorBlock>) => void }) {
  const setCell = (rowIndex: number, colIndex: number, value: string) => {
    const rows = block.rows.map((row, r) => row.map((cell, c) => (r === rowIndex && c === colIndex ? value : cell)));
    updateBlock(block.id, { rows } as Partial<EditorBlock>);
  };
  return (
    <div className="table-editor">
      <div className="table-actions">
        <button onClick={() => updateBlock(block.id, { headers: [...block.headers, '新列'], rows: block.rows.map((row) => [...row, '']) } as Partial<EditorBlock>)}>加列</button>
        <button onClick={() => updateBlock(block.id, { rows: [...block.rows, block.headers.map(() => '')] } as Partial<EditorBlock>)}>加行</button>
      </div>
      <table>
        <thead>
          <tr>
            {block.headers.map((header, index) => (
              <th key={index}><input value={header} onChange={(event) => updateBlock(block.id, { headers: block.headers.map((item, i) => (i === index ? event.target.value : item)) } as Partial<EditorBlock>)} /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {block.headers.map((_, colIndex) => (
                <td key={colIndex}><input value={row[colIndex] || ''} onChange={(event) => setCell(rowIndex, colIndex, event.target.value)} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TimelineEditor({ block, updateBlock }: { block: Extract<EditorBlock, { type: 'timeline' }>; updateBlock: (id: string, patch: Partial<EditorBlock>) => void }) {
  return (
    <div className="timeline-editor">
      {block.items.map((item, index) => (
        <div className="inline-fields" key={index}>
          <input value={item.date} onChange={(event) => updateBlock(block.id, { items: block.items.map((value, i) => i === index ? { ...value, date: event.target.value } : value) } as Partial<EditorBlock>)} />
          <input value={item.text} onChange={(event) => updateBlock(block.id, { items: block.items.map((value, i) => i === index ? { ...value, text: event.target.value } : value) } as Partial<EditorBlock>)} />
        </div>
      ))}
      <button onClick={() => updateBlock(block.id, { items: [...block.items, { date: '2026-06', text: '新事件' }] } as Partial<EditorBlock>)}>加事件</button>
    </div>
  );
}

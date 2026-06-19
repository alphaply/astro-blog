import yaml from 'js-yaml';

export type Frontmatter = {
  title: string;
  description: string;
  date: string;
  updatedDate?: string;
  draft: boolean;
  cover: string;
  category: string;
  tags: string[];
};

export type EditorBlock =
  | { id: string; type: 'paragraph'; text: string }
  | { id: string; type: 'heading'; level: 1 | 2 | 3; text: string }
  | { id: string; type: 'list'; ordered: boolean; items: string[] }
  | { id: string; type: 'table'; headers: string[]; rows: string[][] }
  | { id: string; type: 'code'; language: string; title: string; code: string }
  | { id: string; type: 'math'; equation: string }
  | { id: string; type: 'mermaid'; diagram: string }
  | { id: string; type: 'callout'; calloutType: string; title: string; content: string }
  | { id: string; type: 'details'; title: string; content: string }
  | { id: string; type: 'blur'; text: string }
  | { id: string; type: 'columns'; left: string; right: string }
  | { id: string; type: 'plan'; todo: string; doing: string; done: string }
  | { id: string; type: 'timeline'; items: Array<{ date: string; text: string }> }
  | { id: string; type: 'gallery'; caption: string; images: Array<{ src: string; alt: string }> }
  | { id: string; type: 'rawMarkdown'; markdown: string };

export type ParsedPost = {
  frontmatter: Frontmatter;
  blocks: EditorBlock[];
};

const newId = () => Math.random().toString(36).slice(2, 10);

const defaultFrontmatter = (): Frontmatter => ({
  title: '新文章',
  description: '',
  date: new Date().toISOString().slice(0, 10),
  updatedDate: new Date().toISOString().slice(0, 10),
  draft: true,
  cover: '',
  category: '随笔',
  tags: [],
});

export const splitMdx = (raw: string) => {
  const normalized = raw.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return { frontmatter: defaultFrontmatter(), body: normalized };
  }
  const data = (yaml.load(match[1]) || {}) as Record<string, unknown>;
  return {
    frontmatter: {
      ...defaultFrontmatter(),
      title: String(data.title || '未命名文章'),
      description: String(data.description || ''),
      date: String(data.date || new Date().toISOString().slice(0, 10)).slice(0, 10),
      updatedDate: data.updatedDate ? String(data.updatedDate).slice(0, 10) : '',
      draft: Boolean(data.draft),
      cover: String(data.cover || ''),
      category: String(data.category || '随笔'),
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    },
    body: normalized.slice(match[0].length).trim(),
  };
};

const takeUntil = (lines: string[], start: number, endMarker: string) => {
  const buffer: string[] = [];
  let index = start;
  while (index < lines.length && lines[index] !== endMarker) {
    buffer.push(lines[index]);
    index += 1;
  }
  return { text: buffer.join('\n').trim(), next: index + 1 };
};

export const parseMdxToBlocks = (raw: string): ParsedPost => {
  const { frontmatter, body } = splitMdx(raw);
  const lines = body.split('\n');
  const blocks: EditorBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] || '';
    if (!line.trim()) {
      i += 1;
      continue;
    }

    const callout = line.match(/^:::callout\{type="([^"]+)" title="([^"]*)"\}$/);
    if (callout) {
      const taken = takeUntil(lines, i + 1, ':::');
      blocks.push({ id: newId(), type: 'callout', calloutType: callout[1], title: callout[2], content: taken.text });
      i = taken.next;
      continue;
    }

    const details = line.match(/^:::details\{title="([^"]*)"\}$/);
    if (details) {
      const taken = takeUntil(lines, i + 1, ':::');
      blocks.push({ id: newId(), type: 'details', title: details[1], content: taken.text });
      i = taken.next;
      continue;
    }

    if (line === '::::columns') {
      const rawBlock = takeUntil(lines, i + 1, '::::');
      const columnMatch = rawBlock.text.match(/^:::column\n([\s\S]*?)\n:::\n:::column\n([\s\S]*?)\n:::$/);
      blocks.push({
        id: newId(),
        type: 'columns',
        left: columnMatch?.[1]?.trim() || '',
        right: columnMatch?.[2]?.trim() || '',
      });
      i = rawBlock.next;
      continue;
    }

    if (line === ':::plan') {
      const taken = takeUntil(lines, i + 1, ':::');
      blocks.push({
        id: newId(),
        type: 'plan',
        todo: taken.text.match(/^- \[todo\] (.*)$/m)?.[1] || '',
        doing: taken.text.match(/^- \[doing\] (.*)$/m)?.[1] || '',
        done: taken.text.match(/^- \[done\] (.*)$/m)?.[1] || '',
      });
      i = taken.next;
      continue;
    }

    if (line === ':::timeline') {
      const taken = takeUntil(lines, i + 1, ':::');
      const items = taken.text
        .split('\n')
        .map((item) => item.match(/^- \*\*(.*?)\*\*[：:]\s*(.*)$/))
        .filter(Boolean)
        .map((item) => ({ date: item![1], text: item![2] }));
      blocks.push({ id: newId(), type: 'timeline', items: items.length ? items : [{ date: '2026-06', text: '时间线内容' }] });
      i = taken.next;
      continue;
    }

    const gallery = line.match(/^:::gallery\{caption="([^"]*)"\}$/);
    if (gallery) {
      const taken = takeUntil(lines, i + 1, ':::');
      const images = taken.text
        .split('\n')
        .map((item) => item.match(/^!\[(.*?)\]\((.*?)\)$/))
        .filter(Boolean)
        .map((item) => ({ alt: item![1], src: item![2] }));
      blocks.push({ id: newId(), type: 'gallery', caption: gallery[1], images });
      i = taken.next;
      continue;
    }

    const code = line.match(/^```([^\s`]*)\s*(?:title="([^"]*)")?$/);
    if (code) {
      const taken = takeUntil(lines, i + 1, '```');
      blocks.push(
        code[1] === 'mermaid'
          ? { id: newId(), type: 'mermaid', diagram: taken.text }
          : { id: newId(), type: 'code', language: code[1] || 'text', title: code[2] || '', code: taken.text },
      );
      i = taken.next;
      continue;
    }

    if (line === '$$') {
      const taken = takeUntil(lines, i + 1, '$$');
      blocks.push({ id: newId(), type: 'math', equation: taken.text });
      i = taken.next;
      continue;
    }

    const tableStart = line.startsWith('|') && lines[i + 1]?.startsWith('| ---');
    if (tableStart) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i]);
        i += 1;
      }
      const cells = tableLines.map((row) => row.split('|').slice(1, -1).map((cell) => cell.trim()));
      blocks.push({ id: newId(), type: 'table', headers: cells[0] || [], rows: cells.slice(2) });
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      blocks.push({ id: newId(), type: 'heading', level: heading[1].length as 1 | 2 | 3, text: heading[2] });
      i += 1;
      continue;
    }

    const blur = line.match(/^:blur\[(.*)\]$/);
    if (blur) {
      blocks.push({ id: newId(), type: 'blur', text: blur[1] });
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const ordered = /^\d+\.\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\d+\.\s+/.test(lines[i]) : /^[-*]\s+/.test(lines[i]))) {
        items.push(lines[i].replace(ordered ? /^\d+\.\s+/ : /^[-*]\s+/, ''));
        i += 1;
      }
      blocks.push({ id: newId(), type: 'list', ordered, items });
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim()) {
      paragraph.push(lines[i]);
      i += 1;
    }
    blocks.push({ id: newId(), type: 'paragraph', text: paragraph.join('\n') });
  }

  return { frontmatter, blocks };
};

const quoteAttr = (value = '') => value.replace(/"/g, "'");

export const serializeBlocksToMdx = (frontmatter: Frontmatter, blocks: EditorBlock[]) => {
  const data = {
    title: frontmatter.title || '未命名文章',
    description: frontmatter.description || '',
    date: frontmatter.date || new Date().toISOString().slice(0, 10),
    updatedDate: frontmatter.updatedDate || new Date().toISOString().slice(0, 10),
    draft: Boolean(frontmatter.draft),
    cover: frontmatter.cover || '',
    category: frontmatter.category || '随笔',
    tags: frontmatter.tags || [],
  };

  const body = blocks
    .map((block) => {
      switch (block.type) {
        case 'paragraph':
          return block.text;
        case 'heading':
          return `${'#'.repeat(block.level)} ${block.text}`;
        case 'list':
          return block.items.map((item, index) => (block.ordered ? `${index + 1}. ${item}` : `- ${item}`)).join('\n');
        case 'table':
          return [
            `| ${block.headers.join(' | ')} |`,
            `| ${block.headers.map(() => '---').join(' | ')} |`,
            ...block.rows.map((row) => `| ${row.join(' | ')} |`),
          ].join('\n');
        case 'code':
          return `\`\`\`${block.language || 'text'}${block.title ? ` title="${quoteAttr(block.title)}"` : ''}\n${block.code}\n\`\`\``;
        case 'math':
          return `$$\n${block.equation}\n$$`;
        case 'mermaid':
          return `\`\`\`mermaid\n${block.diagram}\n\`\`\``;
        case 'callout':
          return `:::callout{type="${block.calloutType || 'info'}" title="${quoteAttr(block.title || '提示')}"}\n${block.content}\n:::`;
        case 'details':
          return `:::details{title="${quoteAttr(block.title || '展开查看')}"}\n${block.content}\n:::`;
        case 'blur':
          return `:blur[${block.text.replace(/]/g, ')')}]`;
        case 'columns':
          return `::::columns\n:::column\n${block.left}\n:::\n:::column\n${block.right}\n:::\n::::`;
        case 'plan':
          return `:::plan\n- [todo] ${block.todo}\n- [doing] ${block.doing}\n- [done] ${block.done}\n:::`;
        case 'timeline':
          return `:::timeline\n${block.items.map((item) => `- **${item.date}**：${item.text}`).join('\n')}\n:::`;
        case 'gallery':
          return `:::gallery{caption="${quoteAttr(block.caption)}"}\n${block.images.map((image) => `![${image.alt}](${image.src})`).join('\n')}\n:::`;
        case 'rawMarkdown':
          return block.markdown;
      }
    })
    .filter((value) => value.trim())
    .join('\n\n');

  return `---\n${yaml.dump(data, { lineWidth: 120 }).trim()}\n---\n\n${body}\n`;
};

export const createEmptyPost = (): ParsedPost => ({
  frontmatter: defaultFrontmatter(),
  blocks: [{ id: newId(), type: 'paragraph', text: '开始写作...' }],
});

export const createBlock = (type: EditorBlock['type']): EditorBlock => {
  switch (type) {
    case 'heading':
      return { id: newId(), type, level: 2, text: '标题' };
    case 'list':
      return { id: newId(), type, ordered: false, items: ['列表项'] };
    case 'table':
      return { id: newId(), type, headers: ['项目', '状态', '备注'], rows: [['示例', 'done', '内容']] };
    case 'code':
      return { id: newId(), type, language: 'ts', title: 'example.ts', code: 'const message = "Hello";' };
    case 'math':
      return { id: newId(), type, equation: 'E = mc^2' };
    case 'mermaid':
      return { id: newId(), type, diagram: 'graph TD\n  A[开始] --> B[完成]' };
    case 'callout':
      return { id: newId(), type, calloutType: 'info', title: '提示', content: '这里写提示内容。' };
    case 'details':
      return { id: newId(), type, title: '展开查看', content: '这里是折叠内容。' };
    case 'blur':
      return { id: newId(), type, text: '点击显示的隐藏文字' };
    case 'columns':
      return { id: newId(), type, left: '左列内容', right: '右列内容' };
    case 'plan':
      return { id: newId(), type, todo: '待办事项', doing: '进行中', done: '已完成' };
    case 'timeline':
      return { id: newId(), type, items: [{ date: '2026-06', text: '完成第一阶段。' }] };
    case 'gallery':
      return { id: newId(), type, caption: '图库说明', images: [{ src: '/uploads/example.jpg', alt: '示例图片' }] };
    case 'rawMarkdown':
      return { id: newId(), type, markdown: '' };
    case 'paragraph':
    default:
      return { id: newId(), type: 'paragraph', text: '段落内容' };
  }
};

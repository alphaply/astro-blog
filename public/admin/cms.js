(function () {
  const escapeHtml = (value = '') =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const escapeAttribute = (value = '') => escapeHtml(value).replace(/`/g, '&#096;');
  const directiveAttribute = (value = '') => String(value).replace(/"/g, "'").replace(/\r?\n/g, ' ').trim();
  const normalizeBlock = (value = '') => String(value).replace(/\r\n/g, '\n').trim();
  const block = (value = '') => `\n\n${value.trim()}\n\n`;
  const previewParagraphs = (value = '') =>
    normalizeBlock(value)
      .split(/\n{2,}/)
      .filter(Boolean)
      .map((line) => `<p>${escapeHtml(line).replace(/\n/g, '<br />')}</p>`)
      .join('\n');

  const registerComponent = (definition) => window.CMS.registerEditorComponent(definition);

  const register = () => {
    if (!window.CMS) {
      window.setTimeout(register, 50);
      return;
    }

    window.CMS.registerPreviewStyle('/admin/preview.css');

    registerComponent({
      id: 'callout',
      label: '提示块',
      icon: 'campaign',
      mode: 'dialog',
      summary: '{{title}}',
      fields: [
        {
          name: 'type',
          label: '类型',
          widget: 'select',
          options: [
            { label: '信息', value: 'info' },
            { label: '笔记', value: 'note' },
            { label: '技巧', value: 'tip' },
            { label: '成功', value: 'success' },
            { label: '警告', value: 'warning' },
            { label: '危险', value: 'danger' },
          ],
          default: 'info',
        },
        { name: 'title', label: '标题', default: '提示' },
        { name: 'message', label: '内容', widget: 'text', default: '在这里写提示内容。' },
      ],
      pattern: /^:::callout\{type="(?<type>[^"]+)" title="(?<title>[^"]*)"\}\n(?<message>[\s\S]*?)\n:::/m,
      fromBlock: ({ groups = {} }) => ({
        type: groups.type || 'info',
        title: groups.title || '提示',
        message: groups.message || '',
      }),
      toBlock: ({ type = 'info', title = '提示', message = '' }) =>
        block(`:::callout{type="${type}" title="${directiveAttribute(title)}"}\n${normalizeBlock(message)}\n:::`),
      toPreview: ({ type = 'info', title = '提示', message = '' }) =>
        `<aside class="callout callout-${type}"><p class="callout-title">${escapeHtml(title)}</p>${previewParagraphs(message)}</aside>`,
    });

    registerComponent({
      id: 'math',
      label: '数学公式',
      icon: 'functions',
      mode: 'dialog',
      summary: 'Math: {{equation}}',
      fields: [{ name: 'equation', label: 'LaTeX', widget: 'text', default: 'E = mc^2' }],
      pattern: /^\$\$\n(?<equation>[\s\S]*?)\n\$\$/m,
      fromBlock: ({ groups = {} }) => ({ equation: groups.equation || '' }),
      toBlock: ({ equation = '' }) => block(`$$\n${normalizeBlock(equation)}\n$$`),
      toPreview: ({ equation = '' }) => `<div class="math-preview">$$<br />${escapeHtml(equation)}<br />$$</div>`,
    });

    registerComponent({
      id: 'code-template',
      label: '代码块',
      icon: 'code',
      mode: 'dialog',
      summary: '{{language}} {{title}}',
      fields: [
        { name: 'language', label: '语言', default: 'ts' },
        { name: 'title', label: '标题', required: false },
        {
          name: 'code',
          label: '代码',
          widget: 'text',
          default: 'const message = "Hello";\nconsole.log(message);',
        },
      ],
      pattern: /^```(?<language>[^\s`]*)\s*(?:title="(?<title>[^"]*)")?\n(?<code>[\s\S]*?)\n```/m,
      fromBlock: ({ groups = {} }) => ({
        language: groups.language || 'text',
        title: groups.title || '',
        code: groups.code || '',
      }),
      toBlock: ({ language = 'text', title = '', code = '' }) => {
        const titleMeta = title ? ` title="${escapeAttribute(title)}"` : '';
        return block(`\`\`\`${language}${titleMeta}\n${String(code).replace(/```/g, '\\`\\`\\`')}\n\`\`\``);
      },
      toPreview: ({ language = 'text', title = '', code = '' }) =>
        `<pre class="code-preview"><code>${escapeHtml(`${language}${title ? ` / ${title}` : ''}\n${code}`)}</code></pre>`,
    });

    registerComponent({
      id: 'mermaid',
      label: 'Mermaid 图表',
      icon: 'account_tree',
      mode: 'dialog',
      summary: 'Mermaid diagram',
      fields: [
        {
          name: 'diagram',
          label: '图表代码',
          widget: 'text',
          default: 'graph TD\n  A[Start] --> B[Build]\n  B --> C[Deploy]',
        },
      ],
      pattern: /^```mermaid\n(?<diagram>[\s\S]*?)\n```/m,
      fromBlock: ({ groups = {} }) => ({ diagram: groups.diagram || '' }),
      toBlock: ({ diagram = '' }) => block(`\`\`\`mermaid\n${normalizeBlock(diagram)}\n\`\`\``),
      toPreview: ({ diagram = '' }) => `<pre class="mermaid-preview">${escapeHtml(diagram)}</pre>`,
    });

    registerComponent({
      id: 'details',
      label: '折叠框',
      icon: 'unfold_more',
      mode: 'dialog',
      summary: '{{title}}',
      fields: [
        { name: 'title', label: '标题', default: '展开查看' },
        { name: 'content', label: '内容', widget: 'text', default: '这里是折叠内容。' },
      ],
      pattern: /^:::details\{title="(?<title>[^"]*)"\}\n(?<content>[\s\S]*?)\n:::/m,
      fromBlock: ({ groups = {} }) => ({
        title: groups.title || '展开查看',
        content: groups.content || '',
      }),
      toBlock: ({ title = '展开查看', content = '' }) =>
        block(`:::details{title="${directiveAttribute(title)}"}\n${normalizeBlock(content)}\n:::`),
      toPreview: ({ title = '展开查看', content = '' }) =>
        `<details class="content-details" open><summary>${escapeHtml(title)}</summary>${previewParagraphs(content)}</details>`,
    });

    registerComponent({
      id: 'blur-reveal',
      label: '点击揭示文字',
      icon: 'visibility',
      mode: 'dialog',
      summary: '{{text}}',
      fields: [{ name: 'text', label: '隐藏文字', default: '点击显示的内容' }],
      pattern: /^:blur\[(?<text>.*?)\]/m,
      fromBlock: ({ groups = {} }) => ({ text: groups.text || '' }),
      toBlock: ({ text = '' }) => block(`:blur[${String(text).replace(/]/g, ')')}]`),
      toPreview: ({ text = '' }) => `<span class="blur-reveal is-revealed" tabindex="0">${escapeHtml(text)}</span>`,
    });

    registerComponent({
      id: 'columns',
      label: '双列布局',
      icon: 'view_column',
      mode: 'dialog',
      summary: 'Two columns',
      fields: [
        { name: 'left', label: '左列', widget: 'text', default: '左列内容' },
        { name: 'right', label: '右列', widget: 'text', default: '右列内容' },
      ],
      pattern: /^::::columns\n:::column\n(?<left>[\s\S]*?)\n:::\n:::column\n(?<right>[\s\S]*?)\n:::\n::::/m,
      fromBlock: ({ groups = {} }) => ({
        left: groups.left || '',
        right: groups.right || '',
      }),
      toBlock: ({ left = '', right = '' }) =>
        block(`::::columns\n:::column\n${normalizeBlock(left)}\n:::\n:::column\n${normalizeBlock(right)}\n:::\n::::`),
      toPreview: ({ left = '', right = '' }) =>
        `<div class="content-columns"><div>${previewParagraphs(left)}</div><div>${previewParagraphs(right)}</div></div>`,
    });

    registerComponent({
      id: 'timeline',
      label: '时间线',
      icon: 'timeline',
      mode: 'dialog',
      summary: '{{date1}}',
      fields: [
        { name: 'date1', label: '时间 1', default: '2026-06' },
        { name: 'text1', label: '内容 1', default: '完成第一阶段。' },
        { name: 'date2', label: '时间 2', required: false },
        { name: 'text2', label: '内容 2', required: false },
      ],
      pattern: /^:::timeline\n- \*\*(?<date1>.*?)\*\*：(?<text1>.*?)(?:\n- \*\*(?<date2>.*?)\*\*：(?<text2>.*?))?\n:::/m,
      fromBlock: ({ groups = {} }) => ({
        date1: groups.date1 || '2026-06',
        text1: groups.text1 || '',
        date2: groups.date2 || '',
        text2: groups.text2 || '',
      }),
      toBlock: ({ date1 = '', text1 = '', date2 = '', text2 = '' }) => {
        const item2 = date2 || text2 ? `\n- **${date2}**：${text2}` : '';
        return block(`:::timeline\n- **${date1}**：${text1}${item2}\n:::`);
      },
      toPreview: ({ date1 = '', text1 = '', date2 = '', text2 = '' }) => {
        const item2 = date2 || text2 ? `<li><strong>${escapeHtml(date2)}</strong>：${escapeHtml(text2)}</li>` : '';
        return `<div class="content-timeline"><ul><li><strong>${escapeHtml(date1)}</strong>：${escapeHtml(text1)}</li>${item2}</ul></div>`;
      },
    });

    registerComponent({
      id: 'plan',
      label: '计划 / 任务',
      icon: 'task_alt',
      mode: 'dialog',
      summary: 'Plan',
      fields: [
        { name: 'todo', label: '待办', default: '待办事项' },
        { name: 'doing', label: '进行中', default: '进行中的事项' },
        { name: 'done', label: '已完成', default: '已完成事项' },
      ],
      pattern: /^:::plan\n- \[todo\] (?<todo>.*?)\n- \[doing\] (?<doing>.*?)\n- \[done\] (?<done>.*?)\n:::/m,
      fromBlock: ({ groups = {} }) => ({
        todo: groups.todo || '',
        doing: groups.doing || '',
        done: groups.done || '',
      }),
      toBlock: ({ todo = '', doing = '', done = '' }) =>
        block(`:::plan\n- [todo] ${todo}\n- [doing] ${doing}\n- [done] ${done}\n:::`),
      toPreview: ({ todo = '', doing = '', done = '' }) =>
        `<div class="content-plan"><ul><li>[todo] ${escapeHtml(todo)}</li><li>[doing] ${escapeHtml(doing)}</li><li>[done] ${escapeHtml(done)}</li></ul></div>`,
    });

    registerComponent({
      id: 'table-template',
      label: '表格',
      icon: 'table_chart',
      mode: 'dialog',
      summary: '表格',
      fields: [{ name: 'title', label: '说明', default: '表格' }],
      pattern: /^\| 项目 \| 状态 \| 备注 \|\n\| --- \| --- \| --- \|\n\| (?<item>.*?) \| (?<status>.*?) \| (?<note>.*?) \|/m,
      fromBlock: () => ({ title: '表格' }),
      toBlock: () => block('| 项目 | 状态 | 备注 |\n| --- | --- | --- |\n| 示例 | done | 内容 |'),
      toPreview: () =>
        '<table><thead><tr><th>项目</th><th>状态</th><th>备注</th></tr></thead><tbody><tr><td>示例</td><td>done</td><td>内容</td></tr></tbody></table>',
    });

    registerComponent({
      id: 'gallery',
      label: '图库',
      icon: 'photo_library',
      mode: 'dialog',
      summary: '{{caption}}',
      fields: [
        { name: 'image1', label: '图片 1', widget: 'image' },
        { name: 'alt1', label: '图片 1 描述', required: false },
        { name: 'image2', label: '图片 2', widget: 'image', required: false },
        { name: 'alt2', label: '图片 2 描述', required: false },
        { name: 'caption', label: '图库说明', required: false },
      ],
      pattern:
        /^:::gallery\{caption="(?<caption>[^"]*)"\}\n!\[(?<alt1>.*?)\]\((?<image1>.*?)\)(?:\n!\[(?<alt2>.*?)\]\((?<image2>.*?)\))?\n:::/m,
      fromBlock: ({ groups = {} }) => ({
        image1: groups.image1 || '',
        alt1: groups.alt1 || '',
        image2: groups.image2 || '',
        alt2: groups.alt2 || '',
        caption: groups.caption || '',
      }),
      toBlock: ({ image1 = '', alt1 = '', image2 = '', alt2 = '', caption = '' }) => {
        const second = image2 ? `\n![${alt2}](${image2})` : '';
        return block(`:::gallery{caption="${directiveAttribute(caption)}"}\n![${alt1}](${image1})${second}\n:::`);
      },
      toPreview: ({ image1 = '', alt1 = '', image2 = '', alt2 = '', caption = '' }) => {
        const second = image2 ? `\n<img src="${escapeAttribute(image2)}" alt="${escapeAttribute(alt2)}" />` : '';
        const captionBlock = caption ? `\n<figcaption>${escapeHtml(caption)}</figcaption>` : '';
        return `<figure class="content-gallery">\n<img src="${escapeAttribute(image1)}" alt="${escapeAttribute(alt1)}" />${second}${captionBlock}\n</figure>`;
      },
    });

    window.CMS.init();
  };

  register();
})();

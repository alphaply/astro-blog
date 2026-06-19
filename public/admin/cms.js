(function () {
  const escapeHtml = (value = '') =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const escapeAttribute = (value = '') => escapeHtml(value).replace(/`/g, '&#096;');
  const normalizeBlock = (value = '') => String(value).replace(/\r\n/g, '\n').trim();
  const mdxBreaks = (value = '') => escapeHtml(value).replace(/\n/g, '<br />');
  const paragraphs = (value = '') =>
    normalizeBlock(value)
      .split(/\n{2,}/)
      .filter(Boolean)
      .map((line) => `<p>${mdxBreaks(line)}</p>`)
      .join('\n');
  const block = (value = '') => `\n\n${value.trim()}\n\n`;
  const stripParagraphs = (value = '') =>
    String(value)
      .replace(/<\/?p>/g, '')
      .replace(/<br\s*\/?>/g, '\n')
      .trim();

  const registerComponent = (definition) => window.CMS.registerEditorComponent(definition);

  const register = () => {
    if (!window.CMS) {
      window.setTimeout(register, 50);
      return;
    }

    window.CMS.registerPreviewStyle('/admin/preview.css');

    registerComponent({
      id: 'callout',
      label: 'Callout',
      icon: 'campaign',
      mode: 'dialog',
      summary: '{{title}}',
      fields: [
        {
          name: 'type',
          label: 'Type',
          widget: 'select',
          options: [
            { label: 'Info', value: 'info' },
            { label: 'Note', value: 'note' },
            { label: 'Tip', value: 'tip' },
            { label: 'Success', value: 'success' },
            { label: 'Warning', value: 'warning' },
            { label: 'Danger', value: 'danger' },
          ],
          default: 'info',
        },
        { name: 'title', label: 'Title', default: '提示' },
        { name: 'message', label: 'Message', widget: 'text', default: '在这里写提示内容。' },
      ],
      pattern:
        /^<aside class="callout callout-(?<type>info|note|tip|success|warning|danger)">\s*<p class="callout-title">(?<title>.*?)<\/p>\s*(?<message>[\s\S]*?)\s*<\/aside>/m,
      fromBlock: ({ groups = {} }) => ({
        type: groups.type || 'info',
        title: groups.title || '提示',
        message: stripParagraphs(groups.message || ''),
      }),
      toBlock: ({ type = 'info', title = '提示', message = '' }) =>
        block(
          `<aside class="callout callout-${type}">\n<p class="callout-title">${escapeHtml(title)}</p>\n${paragraphs(message)}\n</aside>`,
        ),
      toPreview: ({ type = 'info', title = '提示', message = '' }) =>
        `<aside class="callout callout-${type}">\n<p class="callout-title">${escapeHtml(title)}</p>\n${paragraphs(message)}\n</aside>`,
    });

    registerComponent({
      id: 'math',
      label: 'Math Formula',
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
      label: 'Code Block',
      icon: 'code',
      mode: 'dialog',
      summary: '{{language}} {{title}}',
      fields: [
        { name: 'language', label: 'Language', default: 'ts' },
        { name: 'title', label: 'Title', required: false },
        {
          name: 'code',
          label: 'Code',
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
        `<pre class="code-preview"><code>${escapeHtml(`${language}${title ? ` · ${title}` : ''}\n${code}`)}</code></pre>`,
    });

    registerComponent({
      id: 'mermaid',
      label: 'Mermaid Diagram',
      icon: 'account_tree',
      mode: 'dialog',
      summary: 'Mermaid diagram',
      fields: [
        {
          name: 'diagram',
          label: 'Diagram',
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
      label: 'Collapsible Section',
      icon: 'unfold_more',
      mode: 'dialog',
      summary: '{{title}}',
      fields: [
        { name: 'title', label: 'Title', default: '展开查看' },
        { name: 'content', label: 'Content', widget: 'text', default: '这里是折叠内容。' },
      ],
      pattern:
        /^<details class="content-details">\s*<summary>(?<title>.*?)<\/summary>\s*(?<content>[\s\S]*?)\s*<\/details>/m,
      fromBlock: ({ groups = {} }) => ({
        title: groups.title || '展开查看',
        content: stripParagraphs(groups.content || ''),
      }),
      toBlock: ({ title = '展开查看', content = '' }) =>
        block(`<details class="content-details">\n<summary>${escapeHtml(title)}</summary>\n${paragraphs(content)}\n</details>`),
      toPreview: ({ title = '展开查看', content = '' }) =>
        `<details class="content-details" open>\n<summary>${escapeHtml(title)}</summary>\n${paragraphs(content)}\n</details>`,
    });

    registerComponent({
      id: 'blur-reveal',
      label: 'Blur Reveal',
      icon: 'visibility',
      mode: 'dialog',
      summary: '{{text}}',
      fields: [{ name: 'text', label: 'Hidden Text', default: '点击显示的内容' }],
      pattern: /^<span class="blur-reveal" tabindex="0">(?<text>.*?)<\/span>/m,
      fromBlock: ({ groups = {} }) => ({ text: groups.text || '' }),
      toBlock: ({ text = '' }) => block(`<span class="blur-reveal" tabindex="0">${escapeHtml(text)}</span>`),
      toPreview: ({ text = '' }) => `<span class="blur-reveal is-revealed" tabindex="0">${escapeHtml(text)}</span>`,
    });

    registerComponent({
      id: 'columns',
      label: 'Two Columns',
      icon: 'view_column',
      mode: 'dialog',
      summary: 'Two columns',
      fields: [
        { name: 'left', label: 'Left Column', widget: 'text', default: '左列内容' },
        { name: 'right', label: 'Right Column', widget: 'text', default: '右列内容' },
      ],
      pattern:
        /^<div class="content-columns">\s*<div>(?<left>[\s\S]*?)<\/div>\s*<div>(?<right>[\s\S]*?)<\/div>\s*<\/div>/m,
      fromBlock: ({ groups = {} }) => ({
        left: stripParagraphs(groups.left || ''),
        right: stripParagraphs(groups.right || ''),
      }),
      toBlock: ({ left = '', right = '' }) =>
        block(`<div class="content-columns">\n<div>\n${paragraphs(left)}\n</div>\n<div>\n${paragraphs(right)}\n</div>\n</div>`),
      toPreview: ({ left = '', right = '' }) =>
        `<div class="content-columns">\n<div>\n${paragraphs(left)}\n</div>\n<div>\n${paragraphs(right)}\n</div>\n</div>`,
    });

    registerComponent({
      id: 'timeline',
      label: 'Timeline',
      icon: 'timeline',
      mode: 'dialog',
      summary: '{{date1}}',
      fields: [
        { name: 'date1', label: 'Date 1', default: '2026-06' },
        { name: 'text1', label: 'Text 1', default: '完成第一阶段。' },
        { name: 'date2', label: 'Date 2', required: false },
        { name: 'text2', label: 'Text 2', required: false },
      ],
      pattern: /^<div class="content-timeline">(?<items>[\s\S]*?)<\/div>/m,
      fromBlock: () => ({ date1: '2026-06', text1: '完成第一阶段。', date2: '', text2: '' }),
      toBlock: ({ date1 = '', text1 = '', date2 = '', text2 = '' }) => {
        const item1 = `<div class="timeline-item"><time>${escapeHtml(date1)}</time><p>${mdxBreaks(text1)}</p></div>`;
        const item2 = date2 || text2 ? `\n<div class="timeline-item"><time>${escapeHtml(date2)}</time><p>${mdxBreaks(text2)}</p></div>` : '';
        return block(`<div class="content-timeline">\n${item1}${item2}\n</div>`);
      },
      toPreview: ({ date1 = '', text1 = '', date2 = '', text2 = '' }) => {
        const item1 = `<div class="timeline-item"><time>${escapeHtml(date1)}</time><p>${mdxBreaks(text1)}</p></div>`;
        const item2 = date2 || text2 ? `\n<div class="timeline-item"><time>${escapeHtml(date2)}</time><p>${mdxBreaks(text2)}</p></div>` : '';
        return `<div class="content-timeline">\n${item1}${item2}\n</div>`;
      },
    });

    registerComponent({
      id: 'plan',
      label: 'Plan / Tasks',
      icon: 'task_alt',
      mode: 'dialog',
      summary: 'Plan',
      fields: [
        { name: 'todo', label: 'Todo', default: '待办事项' },
        { name: 'doing', label: 'Doing', default: '进行中的事项' },
        { name: 'done', label: 'Done', default: '已完成事项' },
      ],
      pattern: /^<div class="content-plan">(?<items>[\s\S]*?)<\/div>/m,
      fromBlock: () => ({ todo: '待办事项', doing: '进行中的事项', done: '已完成事项' }),
      toBlock: ({ todo = '', doing = '', done = '' }) =>
        block(
          `<div class="content-plan">\n<div data-status="todo">${escapeHtml(todo)}</div>\n<div data-status="doing">${escapeHtml(doing)}</div>\n<div data-status="done">${escapeHtml(done)}</div>\n</div>`,
        ),
      toPreview: ({ todo = '', doing = '', done = '' }) =>
        `<div class="content-plan">\n<div data-status="todo">${escapeHtml(todo)}</div>\n<div data-status="doing">${escapeHtml(doing)}</div>\n<div data-status="done">${escapeHtml(done)}</div>\n</div>`,
    });

    registerComponent({
      id: 'table-template',
      label: 'Table',
      icon: 'table_chart',
      mode: 'dialog',
      summary: '{{title}}',
      fields: [{ name: 'title', label: 'Caption', default: '表格' }],
      pattern: /^\| 项目 \| 状态 \| 备注 \|\n\| --- \| --- \| --- \|\n\| (?<item>.*?) \| (?<status>.*?) \| (?<note>.*?) \|/m,
      fromBlock: () => ({ title: '表格' }),
      toBlock: () => block('| 项目 | 状态 | 备注 |\n| --- | --- | --- |\n| 示例 | done | 内容 |'),
      toPreview: () =>
        '<table><thead><tr><th>项目</th><th>状态</th><th>备注</th></tr></thead><tbody><tr><td>示例</td><td>done</td><td>内容</td></tr></tbody></table>',
    });

    registerComponent({
      id: 'gallery',
      label: 'Gallery',
      icon: 'photo_library',
      mode: 'dialog',
      summary: '{{caption}}',
      fields: [
        { name: 'image1', label: 'Image 1', widget: 'image' },
        { name: 'alt1', label: 'Image 1 Alt', required: false },
        { name: 'image2', label: 'Image 2', widget: 'image', required: false },
        { name: 'alt2', label: 'Image 2 Alt', required: false },
        { name: 'caption', label: 'Caption', required: false },
      ],
      pattern:
        /^<figure class="content-gallery">[\s\S]*?<img src="(?<image1>.*?)" alt="(?<alt1>.*?)" \/>[\s\S]*?(?:<img src="(?<image2>.*?)" alt="(?<alt2>.*?)" \/>[\s\S]*?)?(?:<figcaption>(?<caption>.*?)<\/figcaption>)?\s*<\/figure>/m,
      fromBlock: ({ groups = {} }) => ({
        image1: groups.image1 || '',
        alt1: groups.alt1 || '',
        image2: groups.image2 || '',
        alt2: groups.alt2 || '',
        caption: groups.caption || '',
      }),
      toBlock: ({ image1 = '', alt1 = '', image2 = '', alt2 = '', caption = '' }) => {
        const second = image2 ? `\n<img src="${escapeAttribute(image2)}" alt="${escapeAttribute(alt2)}" />` : '';
        const captionBlock = caption ? `\n<figcaption>${escapeHtml(caption)}</figcaption>` : '';
        return block(`<figure class="content-gallery">\n<img src="${escapeAttribute(image1)}" alt="${escapeAttribute(alt1)}" />${second}${captionBlock}\n</figure>`);
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

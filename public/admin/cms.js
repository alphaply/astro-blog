(function () {
  const escapeHtml = (value = '') =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const escapeAttribute = (value = '') => escapeHtml(value).replace(/`/g, '&#096;');
  const paragraphLines = (value = '') =>
    String(value)
      .split(/\n{2,}/)
      .map((line) => `<p>${escapeHtml(line).replace(/\n/g, '<br>')}</p>`)
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
            { label: 'Tip', value: 'tip' },
            { label: 'Warning', value: 'warning' },
          ],
          default: 'info',
        },
        { name: 'title', label: 'Title', default: 'Note' },
        { name: 'message', label: 'Message', widget: 'text' },
      ],
      pattern:
        /^<aside class="callout callout-(?<type>info|tip|warning)">\s*<p class="callout-title">(?<title>.*?)<\/p>\s*(?<message>[\s\S]*?)\s*<\/aside>/m,
      fromBlock: ({ groups = {} }) => ({
        type: groups.type || 'info',
        title: groups.title || 'Note',
        message: (groups.message || '').replace(/<\/?p>/g, '').replace(/<br\s*\/?>/g, '\n'),
      }),
      toBlock: ({ type = 'info', title = 'Note', message = '' }) =>
        `<aside class="callout callout-${type}">\n<p class="callout-title">${escapeHtml(title)}</p>\n${paragraphLines(message)}\n</aside>`,
      toPreview: ({ type = 'info', title = 'Note', message = '' }) =>
        `<aside class="callout callout-${type}">\n<p class="callout-title">${escapeHtml(title)}</p>\n${paragraphLines(message)}\n</aside>`,
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
      toBlock: ({ equation = '' }) => `$$\n${equation.trim()}\n$$`,
      toPreview: ({ equation = '' }) => `<div class="math-preview">$$<br>${escapeHtml(equation)}<br>$$</div>`,
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
        return `\`\`\`${language}${titleMeta}\n${code.replace(/```/g, '\\`\\`\\`')}\n\`\`\``;
      },
      toPreview: ({ language = 'text', title = '', code = '' }) =>
        `<pre class="code-preview"><code>${escapeHtml(`${language}${title ? ` · ${title}` : ''}\n${code}`)}</code></pre>`,
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
        content: (groups.content || '').replace(/<\/?p>/g, '').replace(/<br\s*\/?>/g, '\n'),
      }),
      toBlock: ({ title = '展开查看', content = '' }) =>
        `<details class="content-details">\n<summary>${escapeHtml(title)}</summary>\n${paragraphLines(content)}\n</details>`,
      toPreview: ({ title = '展开查看', content = '' }) =>
        `<details class="content-details" open>\n<summary>${escapeHtml(title)}</summary>\n${paragraphLines(content)}\n</details>`,
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
      toBlock: ({ text = '' }) => `<span class="blur-reveal" tabindex="0">${escapeHtml(text)}</span>`,
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
        left: (groups.left || '').replace(/<\/?p>/g, '').replace(/<br\s*\/?>/g, '\n'),
        right: (groups.right || '').replace(/<\/?p>/g, '').replace(/<br\s*\/?>/g, '\n'),
      }),
      toBlock: ({ left = '', right = '' }) =>
        `<div class="content-columns">\n<div>\n${paragraphLines(left)}\n</div>\n<div>\n${paragraphLines(right)}\n</div>\n</div>`,
      toPreview: ({ left = '', right = '' }) =>
        `<div class="content-columns">\n<div>\n${paragraphLines(left)}\n</div>\n<div>\n${paragraphLines(right)}\n</div>\n</div>`,
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
        return `<figure class="content-gallery">\n<img src="${escapeAttribute(image1)}" alt="${escapeAttribute(alt1)}" />${second}${captionBlock}\n</figure>`;
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

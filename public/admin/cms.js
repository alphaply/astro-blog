(function () {
  const escapeHtml = (value = '') =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const lineBreaks = (value = '') => escapeHtml(value).replace(/\n/g, '<br>');

  const register = () => {
    if (!window.CMS) {
      window.setTimeout(register, 50);
      return;
    }

    window.CMS.registerEditorComponent({
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
        /^<aside class="callout callout-(?<type>info|tip|warning)">\s*<p class="callout-title">(?<title>.*?)<\/p>\s*<p>(?<message>[\s\S]*?)<\/p>\s*<\/aside>/m,
      fromBlock: ({ groups = {} }) => ({
        type: groups.type || 'info',
        title: groups.title || 'Note',
        message: (groups.message || '').replace(/<br\s*\/?>/g, '\n'),
      }),
      toBlock: ({ type = 'info', title = 'Note', message = '' }) =>
        `<aside class="callout callout-${type}">\n<p class="callout-title">${escapeHtml(title)}</p>\n<p>${lineBreaks(message)}</p>\n</aside>`,
      toPreview: ({ type = 'info', title = 'Note', message = '' }) =>
        `<aside class="callout callout-${type}">\n<p class="callout-title">${escapeHtml(title)}</p>\n<p>${lineBreaks(message)}</p>\n</aside>`,
    });

    window.CMS.init();
  };

  register();
})();

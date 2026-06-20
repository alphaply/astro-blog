import { visit } from 'unist-util-visit';

const allowedCallouts = new Set(['info', 'note', 'tip', 'success', 'warning', 'danger']);

const text = (value = '') => String(value);

const escapeHtml = (value = '') =>
  text(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const classList = (...values) => values.filter(Boolean).join(' ');

const htmlNode = (value) => ({ type: 'html', value });

export default function remarkContentBlocks() {
  return (tree) => {
    visit(tree, (node) => {
      if (node.type === 'textDirective' && node.name === 'blur') {
        node.data = {
          hName: 'span',
          hProperties: {
            className: 'spoiler-text',
            tabIndex: 0,
          },
        };
        return;
      }

      if (node.type !== 'containerDirective' && node.type !== 'leafDirective') return;

      const attrs = node.attributes || {};

      if (node.name === 'callout') {
        const type = allowedCallouts.has(attrs.type) ? attrs.type : 'info';
        const title = attrs.title || '提示';
        node.data = {
          hName: 'aside',
          hProperties: { className: classList('callout', `callout-${type}`) },
        };
        node.children = [htmlNode(`<p class="callout-title">${escapeHtml(title)}</p>`), ...(node.children || [])];
        return;
      }

      if (node.name === 'details') {
        const title = attrs.title || '展开查看';
        node.data = {
          hName: 'details',
          hProperties: { className: 'content-details' },
        };
        node.children = [htmlNode(`<summary>${escapeHtml(title)}</summary>`), ...(node.children || [])];
        return;
      }

      if (node.name === 'columns') {
        node.data = {
          hName: 'div',
          hProperties: { className: 'content-columns' },
        };
        return;
      }

      if (node.name === 'column') {
        node.data = {
          hName: 'div',
          hProperties: { className: 'content-column' },
        };
        return;
      }

      if (node.name === 'timeline') {
        node.data = {
          hName: 'div',
          hProperties: { className: 'content-timeline' },
        };
        return;
      }

      if (node.name === 'plan') {
        node.data = {
          hName: 'div',
          hProperties: { className: 'content-plan' },
        };
        return;
      }

      if (node.name === 'gallery') {
        node.data = {
          hName: 'figure',
          hProperties: { className: 'content-gallery' },
        };
        if (attrs.caption) {
          node.children = [...(node.children || []), htmlNode(`<figcaption>${escapeHtml(attrs.caption)}</figcaption>`)];
        }
      }
    });
  };
}

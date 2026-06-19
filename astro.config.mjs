import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import expressiveCode from 'astro-expressive-code';
import { unified } from '@astrojs/markdown-remark';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import remarkDirective from 'remark-directive';
import remarkContentBlocks from './src/lib/remark-content-blocks.mjs';

export default defineConfig({
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath, remarkDirective, remarkContentBlocks],
      rehypePlugins: [rehypeKatex],
    }),
  },
  integrations: [
    expressiveCode({
      themes: ['github-dark', 'github-light'],
      styleOverrides: {
        borderRadius: '8px',
        codeFontSize: '0.92rem',
        frames: {
          frameBoxShadowCssValue: 'none',
        },
      },
    }),
    mdx(),
  ],
  output: 'static',
});

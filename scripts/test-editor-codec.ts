import assert from 'node:assert/strict';
import { parseMdxToBlocks, serializeBlocksToMdx } from '../src/lib/editor/codec';

const sample = `---
title: 示例
description: 示例摘要
date: 2026-06-20
updatedDate: 2026-06-20
draft: false
cover: ''
category: 随笔
tags:
  - 测试
---

| 项目 | 状态 | 备注 |
| --- | --- | --- |
| 示例 | done | 内容 |

:::callout{type="tip" title="提示"}
内容
:::

\`\`\`ts title="a.ts"
const a = 1;
\`\`\`

$$
E = mc^2
$$

\`\`\`mermaid
graph TD
  A --> B
\`\`\`

:::details{title="展开查看"}
折叠内容
:::

:blur[隐藏文字]

::::columns
:::column
左列
:::
:::column
右列
:::
::::

:::plan
- [todo] 待办
- [doing] 进行
- [done] 完成
:::

:::timeline
- **2026-06**：完成第一阶段。
:::
`;

const parsed = parseMdxToBlocks(sample);
const types = parsed.blocks.map((block) => block.type);

for (const type of ['table', 'callout', 'code', 'math', 'mermaid', 'details', 'blur', 'columns', 'plan', 'timeline']) {
  assert(types.includes(type as never), `missing block: ${type}`);
}

const output = serializeBlocksToMdx(parsed.frontmatter, parsed.blocks);

assert(output.includes(':::callout{type="tip" title="提示"}'));
assert(output.includes('| 项目 | 状态 | 备注 |'));
assert(output.includes('```ts title="a.ts"'));
assert(output.includes(':::details{title="展开查看"}'));
assert(output.includes('::::columns'));
assert(output.includes(':::plan'));
assert(output.includes(':::timeline'));

console.log('editor codec roundtrip ok');

/**
 * parse() 单元测试
 *
 * 覆盖场景：
 * - 基本 Markdown 标题 → 节点树结构正确
 * - 多层嵌套标题 → 层级关系正确
 * - YAML frontmatter 解析
 * - 富文本内容（列表、代码块）
 * - 空字符串
 * - features 和 assets 字段存在
 *
 * 注意：markmap-lib 会将非 ASCII 字符输出为 HTML 实体编码
 * （如 "根节点" → "&#x6839;&#x8282;&#x70b9;"），因此需要解码后断言。
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { parse } = require('../src/index');

/**
 * 解码 HTML 实体字符串（仅支持 &#xXXXX; 格式的数字实体）
 */
function decodeHtmlEntities(text) {
  return text.replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
    String.fromCodePoint(parseInt(hex, 16))
  );
}

describe('parse()', () => {
  it('应正确解析一级标题', () => {
    const result = parse('# Hello Mindmap');
    assert.ok(result.root, 'root 应存在');
    assert.equal(decodeHtmlEntities(result.root.content), 'Hello Mindmap');
    assert.ok(Array.isArray(result.root.children));
    assert.equal(result.root.children.length, 0);
  });

  it('应正确解析多级嵌套标题', () => {
    const md = `# 根节点
## 子节点 A
### 孙节点 A1
## 子节点 B`;
    const result = parse(md);
    assert.equal(decodeHtmlEntities(result.root.content), '根节点');
    assert.equal(result.root.children.length, 2);

    const childA = result.root.children[0];
    assert.equal(decodeHtmlEntities(childA.content), '子节点 A');
    assert.equal(childA.children.length, 1);
    assert.equal(decodeHtmlEntities(childA.children[0].content), '孙节点 A1');

    const childB = result.root.children[1];
    assert.equal(decodeHtmlEntities(childB.content), '子节点 B');
    assert.equal(childB.children.length, 0);
  });

  it('应正确解析 YAML frontmatter', () => {
    const md = `---
title: 测试文档
author: 测试
---

# 正文标题`;
    const result = parse(md);
    assert.ok(result.frontmatter, 'frontmatter 应存在');
    assert.equal(result.frontmatter.title, '测试文档');
    assert.equal(result.frontmatter.author, '测试');
    // 正文标题仍被解析为 root
    assert.equal(decodeHtmlEntities(result.root.content), '正文标题');
  });

  it('应返回 features 字段', () => {
    const result = parse('# Hello');
    assert.ok(result.features, 'features 应存在');
    // features 至少应是一个对象
    assert.equal(typeof result.features, 'object');
  });

  it('应返回 assets 字段', () => {
    const result = parse('# Hello');
    assert.ok(result.assets, 'assets 应存在');
    assert.ok(result.assets, 'assets 应是一个对象');
    // assets 应包含 styles 和 scripts
    if (result.assets.styles) {
      assert.ok(Array.isArray(result.assets.styles));
    }
    if (result.assets.scripts) {
      assert.ok(Array.isArray(result.assets.scripts));
    }
  });

  it('应正确解析富文本内容：列表', () => {
    const md = `# 列表测试
- 项目 A
- 项目 B
  - 子项目 B1
- 项目 C`;
    const result = parse(md);
    assert.equal(decodeHtmlEntities(result.root.content), '列表测试');
    // 列表项应存在于 children 中（markmap 会将列表项转为子节点）
    assert.ok(result.root.children.length > 0);
  });

  it('应正确解析包含代码块的 Markdown', () => {
    const md = `# 代码示例

\`\`\`javascript
console.log('hello');
\`\`\``;
    const result = parse(md);
    assert.equal(decodeHtmlEntities(result.root.content), '代码示例');
    assert.ok(result.root.children.length > 0);
  });

  it('处理空字符串时不应抛出异常', () => {
    assert.doesNotThrow(() => parse(''));
    const result = parse('');
    assert.ok(result.root);
  });

  it('处理只有文本无标题的 Markdown', () => {
    const result = parse('这是一段纯文本，没有标题');
    assert.ok(result.root);
    // markmap 会将纯文本包装为根节点，但 content 可能为空
    // 仅验证 root 对象存在且格式正确
    assert.equal(typeof result.root, 'object');
    assert.ok(Array.isArray(result.root.children));
  });
});

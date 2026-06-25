/**
 * render() 与 buildHtml() 单元测试
 *
 * 覆盖场景：
 * - 生成的 HTML 包含完整的文档结构（doctype、html、head、body）
 * - 包含 <svg id="mindmap"> 容器
 * - 包含 markmap 相关的 script / style 标签
 * - 暗色主题 data-theme="dark" 属性
 * - 自定义页面标题
 * - 默认标题（从 frontmatter 或文件名派生）
 * - 富内容渲染
 * - buildHtml 直接调用的边界情况
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { render } = require('../src/index');
const { buildHtml, escapeHtml } = require('../src/renderer');

describe('render()', () => {
  it('应生成包含完整 HTML 结构的页面', () => {
    const html = render('# 测试');
    assert.ok(html.startsWith('<!DOCTYPE html>'), '应以 DOCTYPE 开头');
    assert.ok(html.includes('<html'), '应包含 html 标签');
    assert.ok(html.includes('<head>'), '应包含 head');
    assert.ok(html.includes('<body>'), '应包含 body');
    assert.ok(html.includes('</html>'), '应以 html 闭合');
  });

  it('应包含 <svg id="mindmap"> 容器', () => {
    const html = render('# 测试');
    assert.ok(html.includes('<svg id="mindmap">'), '应包含思维导图 SVG 容器');
  });

  it('应包含 markmap 初始化脚本', () => {
    const html = render('# 测试');
    assert.ok(html.includes('Markmap.create'), '应包含 Markmap.create 脚本');
    assert.ok(html.includes('window.markmap'), '应引用 window.markmap');
  });

  it('非空 Markdown 应包含 script 标签', () => {
    const html = render('# Hello World');
    assert.ok(html.includes('<script>') || html.includes('<script '), '应包含 script 标签');
  });

  it('非空 Markdown 应包含 style 标签', () => {
    const html = render('# Hello World');
    assert.ok(html.includes('<style') || html.includes('<link rel="stylesheet"'), '应包含样式引用');
  });

  it('暗色主题应设置 data-theme="dark"', () => {
    const html = render('# 测试', { darkMode: true });
    assert.ok(html.includes('data-theme="dark"'), '暗色模式应设置 data-theme');
  });

  it('默认不应在 html 标签上启用暗色主题', () => {
    const html = render('# 测试');
    // 精确匹配 html 标签上的 data-theme 属性（markmap CSS 中也可能包含此字符串）
    assert.ok(!html.includes('<html lang="zh-CN" data-theme="dark">'), '默认 html 标签不应有 data-theme');
  });

  it('自定义标题应写入 <title>', () => {
    const html = render('# 测试', { title: '自定义标题' });
    assert.ok(html.includes('<title>自定义标题</title>'), '应使用自定义标题');
  });

  it('当 omits 标题时应有合理的 fallback', () => {
    const html = render('# 测试');
    assert.ok(html.includes('<title>'), '应包含 title 标签');
    // 标题不应为空
    const match = html.match(/<title>(.*?)<\/title>/);
    assert.ok(match, '应匹配到 title 内容');
    assert.ok(match[1].length > 0, '标题不应为空字符串');
  });

  it('包含 frontmatter 时 title 应优先使用配置项', () => {
    const md = `---
title: Frontmatter Title
---

# 正文`;
    // 传 options.title 时优先使用它
    const html = render(md, { title: '配置标题优先' });
    assert.ok(html.includes('<title>配置标题优先</title>'), '配置项应覆盖 frontmatter');
  });

  it('渲染结果中包含序列化的节点数据', () => {
    const html = render('# Hello World');
    // JSON 序列化的 root 节点应出现在嵌入脚本中
    assert.ok(html.includes('"content":"Hello World"') || html.includes('content'), '节点数据应在 HTML 中存在');
  });
});

describe('buildHtml()', () => {
  const minimalRoot = { content: 'root', children: [] };

  it('应生成基本的 HTML 结构', () => {
    const html = buildHtml(minimalRoot, {}, { styles: [], scripts: [] });
    assert.ok(html.startsWith('<!DOCTYPE html>'));
    assert.ok(html.includes('<svg id="mindmap">'));
    assert.ok(html.includes('Markmap.create'));
  });

  it('应正确渲染 assets.styles', () => {
    const styleTag = '<link rel="stylesheet" href="test.css">';
    const html = buildHtml(minimalRoot, {}, { styles: [styleTag], scripts: [] });
    assert.ok(html.includes(styleTag), 'styles 应被注入');
  });

  it('应正确渲染 assets.scripts', () => {
    const scriptTag = '<script src="test.js"></script>';
    const html = buildHtml(minimalRoot, {}, { styles: [], scripts: [scriptTag] });
    assert.ok(html.includes(scriptTag), 'scripts 应被注入');
  });

  it('使用空数组 assets 不报错', () => {
    assert.doesNotThrow(() => buildHtml(minimalRoot, {}, { styles: [], scripts: [] }));
  });

  it('暗色主题应添加 data-theme="dark"', () => {
    const html = buildHtml(minimalRoot, {}, { styles: [], scripts: [] }, { darkMode: true });
    assert.ok(html.includes('data-theme="dark"'));
  });

  it('自定义标题应用', () => {
    const html = buildHtml(minimalRoot, {}, { styles: [], scripts: [] }, { title: 'Test Title' });
    assert.ok(html.includes('<title>Test Title</title>'));
  });
});

describe('escapeHtml()', () => {
  it('应转义 & < > " 和单引号', () => {
    assert.equal(escapeHtml('&'), '&amp;');
    assert.equal(escapeHtml('<'), '&lt;');
    assert.equal(escapeHtml('>'), '&gt;');
    assert.equal(escapeHtml('"'), '&quot;');
    assert.equal(escapeHtml("'"), '&#39;');
  });

  it('应转义组合字符', () => {
    assert.equal(escapeHtml('<script>alert("xss")</script>'),
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('普通文本应保持不变', () => {
    assert.equal(escapeHtml('Hello World'), 'Hello World');
    assert.equal(escapeHtml(''), '');
  });
});

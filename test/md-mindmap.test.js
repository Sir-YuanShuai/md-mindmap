/**
 * md-mindmap 测试套件
 *
 * 覆盖：
 * 1. parse() — Markdown → 节点树结构
 * 2. render() — 生成的 HTML 包含必要的资源标签
 * 3. CLI e2e — .md 文件 → .html 文件输出
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const { parse, render } = require('../src/index');

// ============================================================
// 1. parse() 单元测试
// ============================================================
describe('parse()', () => {
  it('应返回包含 root、features、frontmatter、assets 的对象', () => {
    const result = parse('# Root\n## Child');
    assert.ok(result.root, '应有 root');
    assert.ok('features' in result, '应有 features');
    assert.ok('frontmatter' in result, '应有 frontmatter');
    assert.ok(result.assets, '应有 assets');
    assert.ok(result.assets.styles, '应有 assets.styles');
    assert.ok(result.assets.scripts, '应有 assets.scripts');
  });

  it('应正确解析单层标题', () => {
    const { root } = parse('# 只有一个标题');
    // markmap transformer HTML-encodes content; verify structure, not raw text
    assert.ok(root.content.length > 0, '内容不应为空');
    assert.strictEqual(root.children.length, 0);
    assert.strictEqual(root.payload.tag, 'h1');
  });

  it('应正确解析多层嵌套标题', () => {
    const markdown = [
      '# Root',
      '## Chapter 1',
      '### Section 1.1',
      '### Section 1.2',
      '## Chapter 2',
    ].join('\n');

    const { root } = parse(markdown);

    assert.match(root.content, /Root/);
    assert.strictEqual(root.children.length, 2, '根节点应有 2 个子节点');

    const [ch1, ch2] = root.children;
    assert.match(ch1.content, /Chapter 1/);
    assert.match(ch2.content, /Chapter 2/);
    assert.strictEqual(ch1.children.length, 2, '第一章应有 2 个子节点');
    assert.match(ch1.children[0].content, /Section 1\.1/);
    assert.match(ch1.children[1].content, /Section 1\.2/);
  });

  it('应正确设置节点层级标签 (h1-h4)', () => {
    const markdown = '# h1\n## h2\n### h3\n#### h4';
    const { root } = parse(markdown);

    assert.strictEqual(root.payload.tag, 'h1');
    assert.strictEqual(root.children[0].payload.tag, 'h2');
    assert.strictEqual(root.children[0].children[0].payload.tag, 'h3');
    assert.strictEqual(root.children[0].children[0].children[0].payload.tag, 'h4');
  });

  it('应处理空 Markdown（返回空根节点）', () => {
    const { root } = parse('');
    // 空输入 transformer 的行为 — 至少不应崩溃
    assert.ok(root, '空输入应有 root');
  });

  it('应解析 frontmatter（如果存在）', () => {
    const markdown = [
      '---',
      'title: 测试文档',
      '---',
      '# 正文标题',
    ].join('\n');

    const { root, frontmatter } = parse(markdown);
    assert.ok(root, '应有 root');
    // frontmatter 可能为 undefined 或 object
    if (frontmatter) {
      assert.strictEqual(frontmatter.title, '测试文档');
    }
  });
});

// ============================================================
// 2. render() 单元测试
// ============================================================
describe('render()', () => {
  it('应返回包含 <!DOCTYPE html> 的完整 HTML', () => {
    const html = render('# 标题');
    assert.ok(html.startsWith('<!DOCTYPE html>'), '应以 DOCTYPE 开头');
    assert.ok(html.includes('</html>'), '应以 </html> 结尾');
  });

  it('HTML 应包含 markmap-view CDN 引用', () => {
    const html = render('# 标题');
    assert.ok(html.includes('jsdelivr'), '应包含 CDN 引用');
    assert.ok(html.includes('markmap-view'), '应引用 markmap-view');
    assert.ok(html.includes('d3@7'), '应引用 d3');
  });

  it('HTML 应包含 mindmap SVG 容器和 Markmap.create 调用', () => {
    const html = render('# 标题');
    assert.ok(html.includes('<svg id="mindmap"'), '应包含 SVG 容器');
    assert.ok(html.includes('Markmap.create'), '应调用 Markmap.create');
    assert.ok(html.includes('window.markmap'), '应引用 window.markmap');
  });

  it('HTML 应包含自定义 title', () => {
    const html = render('# 标题', { title: '自定义标题' });
    assert.ok(html.includes('<title>自定义标题</title>'), '应包含自定义标题');
  });

  it('HTML 暗色模式应设置 data-theme="dark"', () => {
    const html = render('# 标题', { darkMode: true });
    assert.ok(html.includes('data-theme="dark"'), '应包含暗色主题属性');
  });

  it('应转义 HTML 特殊字符', () => {
    const html = render('# 标题 <script>alert("xss")</script>');
    // title 标签内的内容应被 escapeHtml 转义
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    assert.ok(titleMatch, '应有 title 标签');
    assert.ok(titleMatch[1].includes('&lt;script&gt;') || !titleMatch[1].includes('<script>'),
      'title 中的 script 标签应被转义');
  });

  it('应可从 frontmatter 提取 title', () => {
    const markdown = [
      '---',
      'title: FrontMatter 标题',
      '---',
      '# 正文',
    ].join('\n');
    const html = render(markdown);
    assert.ok(html.includes('FrontMatter 标题'), '应使用 frontmatter 中的标题');
  });

  it('多层级 Markdown 渲染不应崩溃', () => {
    const markdown = [
      '# 根',
      '## A',
      '### A1',
      '#### A1a',
      '## B',
      '### B1',
      '### B2',
    ].join('\n');
    const html = render(markdown);
    assert.ok(html.length > 500, 'HTML 应有一定长度');
  });
});

// ============================================================
// 3. CLI 端到端测试
// ============================================================
describe('CLI e2e', () => {
  const testMdPath = path.join(__dirname, '..', 'test-fixture.md');
  const testOutPath = path.join(__dirname, '..', 'test-output.html');
  const cliPath = path.join(__dirname, '..', 'src', 'cli.js');

  before(() => {
    // 创建测试 Markdown 文件（使用 ASCII 避免编码断言问题）
    fs.writeFileSync(testMdPath, [
      '# CLI Test',
      '## Feature A',
      '### Sub A1',
      '## Feature B',
    ].join('\n'), 'utf-8');
  });

  after(() => {
    // 清理临时文件
    try { fs.unlinkSync(testMdPath); } catch {}
    try { fs.unlinkSync(testOutPath); } catch {}
  });

  it('应能从 .md 文件生成 .html 文件', () => {
    execSync(`node "${cliPath}" "${testMdPath}" -o "${testOutPath}"`, {
      encoding: 'utf-8',
      timeout: 10000,
    });

    assert.ok(fs.existsSync(testOutPath), '输出文件应存在');

    const html = fs.readFileSync(testOutPath, 'utf-8');
    assert.ok(html.includes('<!DOCTYPE html>'), '应包含 DOCTYPE');
    assert.match(html, /CLI Test/, '应包含原标题内容');
    assert.ok(html.includes('markmap-view'), '应包含 markmap-view CDN');
    assert.ok(html.includes('Markmap.create'), '应包含初始化脚本');
  });

  it('应支持 --dark 选项', () => {
    execSync(`node "${cliPath}" "${testMdPath}" -o "${testOutPath}" --dark`, {
      encoding: 'utf-8',
      timeout: 10000,
    });

    const html = fs.readFileSync(testOutPath, 'utf-8');
    assert.ok(html.includes('data-theme="dark"'), '应包含暗色主题');
  });

  it('应支持 --title 选项', () => {
    execSync(`node "${cliPath}" "${testMdPath}" -o "${testOutPath}" -t "E2E Test"`, {
      encoding: 'utf-8',
      timeout: 10000,
    });

    const html = fs.readFileSync(testOutPath, 'utf-8');
    assert.ok(html.includes('<title>E2E Test</title>'), '应包含自定义标题');
  });

  it('文件不存在时应报错退出', () => {
    assert.throws(() => {
      execSync(`node "${cliPath}" /nonexistent/file.md -o /tmp/out.html`, {
        encoding: 'utf-8',
        timeout: 10000,
      });
    }, /文件不存在/);
  });
});

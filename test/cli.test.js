/**
 * CLI 端到端测试
 *
 * 覆盖场景：
 * - 输入 .md 文件 → 输出 .html 文件（-o）
 * - 输出到 stdout
 * - 文件不存在时正确报错
 * - 暗色模式选项
 * - 自定义标题选项
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const os = require('node:os');

const CLI_PATH = path.resolve(__dirname, '..', 'src', 'cli.js');

/**
 * 在临时目录中创建一组测试资源，避免污染工作目录。
 * 返回 { tmpDir, mdPath, htmlPath }。
 */
function setupTestFiles() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'md-mindmap-test-'));
  const mdPath = path.join(tmpDir, 'test.md');
  const htmlPath = path.join(tmpDir, 'output.html');
  return { tmpDir, mdPath, htmlPath };
}

describe('CLI 端到端', () => {
  it('应将 .md 文件渲染为 .html 文件（-o 选项）', () => {
    const { tmpDir, mdPath, htmlPath } = setupTestFiles();
    try {
      fs.writeFileSync(mdPath, '# Hello CLI', 'utf-8');

      execSync(`node "${CLI_PATH}" "${mdPath}" -o "${htmlPath}"`, {
        cwd: tmpDir,
        encoding: 'utf-8',
      });

      // 文件应存在
      assert.ok(fs.existsSync(htmlPath), '输出 HTML 文件应存在');

      const html = fs.readFileSync(htmlPath, 'utf-8');
      assert.ok(html.startsWith('<!DOCTYPE html>'), '输出应包含 DOCTYPE');
      assert.ok(html.includes('<svg id="mindmap">'), '输出应包含 SVG 容器');
      assert.ok(html.includes('Markmap.create'), '输出应包含 Markmap 初始化');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('应将 .md 渲染至 stdout（无 -o 选项）', () => {
    const { tmpDir, mdPath } = setupTestFiles();
    try {
      fs.writeFileSync(mdPath, '# Stdout Test', 'utf-8');

      const stdout = execSync(`node "${CLI_PATH}" "${mdPath}"`, {
        cwd: tmpDir,
        encoding: 'utf-8',
      });

      assert.ok(stdout.startsWith('<!DOCTYPE html>'), 'stdout 应以 DOCTYPE 开头');
      assert.ok(stdout.includes('<svg id="mindmap">'), 'stdout 应包含 SVG');
      assert.ok(stdout.includes('Stdout Test') || stdout.includes('"content":"Stdout Test"'),
        '节点内容应在 HTML 中');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('暗色模式选项 (-d) 应生成 data-theme="dark"', () => {
    const { tmpDir, mdPath, htmlPath } = setupTestFiles();
    try {
      fs.writeFileSync(mdPath, '# Dark Mode', 'utf-8');

      execSync(`node "${CLI_PATH}" "${mdPath}" -o "${htmlPath}" -d`, {
        cwd: tmpDir,
        encoding: 'utf-8',
      });

      const html = fs.readFileSync(htmlPath, 'utf-8');
      assert.ok(html.includes('data-theme="dark"'), '暗色模式应有 data-theme');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('自定义标题选项 (-t) 应写入 <title>', () => {
    const { tmpDir, mdPath, htmlPath } = setupTestFiles();
    try {
      fs.writeFileSync(mdPath, '# Title Test', 'utf-8');

      execSync(`node "${CLI_PATH}" "${mdPath}" -o "${htmlPath}" -t "我的自定义标题"`, {
        cwd: tmpDir,
        encoding: 'utf-8',
      });

      const html = fs.readFileSync(htmlPath, 'utf-8');
      assert.ok(html.includes('<title>我的自定义标题</title>'), '自定义标题应生效');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('文件不存在时应以非零退出码退出并输出错误信息', () => {
    const { tmpDir } = setupTestFiles();
    try {
      const nonExistent = path.join(tmpDir, 'nonexistent.md');

      assert.throws(() => {
        execSync(`node "${CLI_PATH}" "${nonExistent}"`, {
          cwd: tmpDir,
          encoding: 'utf-8',
        });
      }, '文件不存在时应抛出错误');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('应正确处理含 frontmatter 的文件', () => {
    const { tmpDir, mdPath, htmlPath } = setupTestFiles();
    try {
      const md = `---
title: Front Matter Doc
---

# 标题来自正文`;
      fs.writeFileSync(mdPath, md, 'utf-8');

      execSync(`node "${CLI_PATH}" "${mdPath}" -o "${htmlPath}"`, {
        cwd: tmpDir,
        encoding: 'utf-8',
      });

      const html = fs.readFileSync(htmlPath, 'utf-8');
      // 默认无自定义标题时使用文件名
      assert.ok(html.includes('<title>'), '应包含 title');
      assert.ok(html.includes('Markmap.create'), '应包含 Markmap 初始化');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

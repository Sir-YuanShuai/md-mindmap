#!/usr/bin/env node

/**
 * md-mindmap CLI — 将 Markdown 文件渲染为交互式思维导图
 *
 * 用法:
 *   md-mindmap <markdown-file>                 输出 HTML 到 stdout
 *   md-mindmap <markdown-file> -o out.html      输出 HTML 到文件
 *   md-mindmap <markdown-file> --format json    输出 JSON 节点树
 *   md-mindmap <markdown-file> --depth 2        展开到第 2 层
 *   md-mindmap <markdown-file> --no-fit         禁用自动缩放
 */

const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const { parse, render } = require('./index');

const program = new Command();

program
  .name('md-mindmap')
  .description('将 Markdown 文件渲染为交互式思维导图')
  .version('1.0.0')
  .argument('<file>', 'Markdown 文件路径')
  .option('-o, --output <file>', '输出文件路径')
  .option('-t, --title <title>', '自定义页面标题')
  .option('-d, --dark', '使用暗色主题')
  .option('-f, --format <format>', '输出格式: html 或 json', 'html')
  .option('--depth <n>', '初始展开层级（默认全部展开）', parseInt)
  .option('--no-fit', '禁用自动缩放适配')
  .action(async (filePath, options) => {
    try {
      // 读取 Markdown 文件
      const absPath = path.resolve(filePath);
      if (!fs.existsSync(absPath)) {
        console.error(`错误: 文件不存在 — ${absPath}`);
        process.exit(1);
      }

      const markdown = fs.readFileSync(absPath, 'utf-8');
      const fileName = path.basename(filePath, path.extname(filePath));

      // 解析
      const { root, features, frontmatter } = parse(markdown);

      if (options.format === 'json') {
        // JSON 输出
        const json = JSON.stringify({ root, features, frontmatter }, null, 2);
        if (options.output) {
          const outPath = path.resolve(options.output);
          fs.writeFileSync(outPath, json, 'utf-8');
          console.log(`✅ JSON 已生成: ${outPath}`);
        } else {
          process.stdout.write(json);
        }
        return;
      }

      // HTML 渲染（默认）
      const html = render(markdown, {
        title: options.title || fileName,
        darkMode: options.dark,
        depth: options.depth,
        autoFit: options.fit,
      });

      if (options.output) {
        // 输出到文件
        const outPath = path.resolve(options.output);
        fs.writeFileSync(outPath, html, 'utf-8');
        console.log(`✅ 思维导图已生成: ${outPath}`);

        // 尝试自动打开浏览器
        try {
          const open = require('open');
          await open(outPath);
        } catch {
          // open 失败不影响主流程
        }
      } else {
        // 输出到 stdout
        process.stdout.write(html);
      }
    } catch (err) {
      console.error(`错误: ${err.message}`);
      process.exit(1);
    }
  });

program.parse();

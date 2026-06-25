#!/usr/bin/env node

/**
 * md-mindmap CLI — 将 Markdown 文件渲染为交互式思维导图
 *
 * 用法:
 *   md-mindmap <markdown-file>               输出 HTML 到 stdout
 *   md-mindmap <markdown-file> -o out.html    输出 HTML 到文件
 *   md-mindmap <markdown-file> --format png   输出 PNG 截图
 *   md-mindmap <markdown-file> -o m.png -f png --width 1920 --height 1080
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
  .option('-f, --format <format>', '输出格式: html 或 png', 'html')
  .option('--width <pixels>', 'PNG 宽度（像素）', '1280')
  .option('--height <pixels>', 'PNG 高度（像素）', '800')
  .action(async (filePath, options) => {
    try {
      const format = options.format.toLowerCase();

      // 验证格式
      if (!['html', 'png'].includes(format)) {
        console.error(`错误: 不支持的格式 "${options.format}"，仅支持 html 和 png`);
        process.exit(1);
      }

      // 读取 Markdown 文件
      const absPath = path.resolve(filePath);
      if (!fs.existsSync(absPath)) {
        console.error(`错误: 文件不存在 — ${absPath}`);
        process.exit(1);
      }

      const markdown = fs.readFileSync(absPath, 'utf-8');
      const fileName = path.basename(filePath, path.extname(filePath));

      // 渲染 HTML
      const html = render(markdown, {
        title: options.title || fileName,
        darkMode: options.dark,
      });

      if (format === 'png') {
        // PNG 导出模式
        const outPath = path.resolve(options.output || `${fileName}.png`);
        const { exportPng } = require('./png-exporter');
        await exportPng(html, {
          width: parseInt(options.width, 10) || 1280,
          height: parseInt(options.height, 10) || 800,
          output: outPath,
        });
        console.log(`✅ 思维导图已生成: ${outPath}`);
      } else if (options.output) {
        // HTML 输出到文件
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
        // HTML 输出到 stdout
        process.stdout.write(html);
      }
    } catch (err) {
      console.error(`错误: ${err.message}`);
      process.exit(1);
    }
  });

program.parse();

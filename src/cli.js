#!/usr/bin/env node

/**
 * md-mindmap CLI — 将 Markdown 文件渲染为交互式思维导图
 *
 * 用法:
 *   md-mindmap <markdown-file>                   输出 HTML 到 stdout
 *   md-mindmap <markdown-file> -o out.html       输出 HTML 到文件
 *   md-mindmap <markdown-file> --format json     输出 JSON 节点树
 *   md-mindmap <markdown-file> --format png -o mindmap.png  输出 PNG 图片
 *   md-mindmap <markdown-file> --format png --quality high  高质量 PNG
 *   md-mindmap <markdown-file> --depth 2         展开到第 2 层
 *   md-mindmap <markdown-file> --no-fit          禁用自动缩放
 */

const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const { parse, render, exportPng } = require('./index');

const program = new Command();

program
  .name('md-mindmap')
  .description('将 Markdown 文件渲染为交互式思维导图')
  .version('1.0.0')
  .argument('<file>', 'Markdown 文件路径')
  .option('-o, --output <file>', '输出文件路径')
  .option('-t, --title <title>', '自定义页面标题')
  .option('-d, --dark', '使用暗色主题')
  .option('-f, --format <format>', '输出格式: html、json 或 png', 'html')
  .option('-q, --quality <level>', 'PNG 质量等级: low / medium / high（默认 high）', 'high')
  .option('--depth <n>', '初始展开层级（默认全部展开）', parseInt)
  .option('--no-fit', '禁用自动缩放适配')
  .option('--width <px>', '[已弃用] 请使用 --quality 替代', parseInt)
  .option('--height <px>', '[已弃用] 请使用 --quality 替代', parseInt)
  .action(async (filePath, options) => {
    try {
      const format = options.format.toLowerCase();

      // 验证格式
      if (!['html', 'json', 'png'].includes(format)) {
        console.error(`错误: 不支持的格式 "${options.format}"，仅支持 html、json 和 png`);
        process.exit(1);
      }

      // 弃用提醒
      if (options.width || options.height) {
        console.warn('⚠️  警告: --width / --height 已弃用，请使用 --quality (low/medium/high) 替代');
      }

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

      if (format === 'json') {
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

      if (format === 'png') {
        await renderPng(markdown, options, fileName);
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

/**
 * 使用 Puppeteer 渲染 HTML 并导出 PNG（通过 exportPng 模块）
 */
async function renderPng(markdown, options, fileName) {
  const outPath = options.output
    ? path.resolve(options.output)
    : path.resolve(`${fileName}.png`);

  // 验证质量等级
  const validQualities = ['low', 'medium', 'high'];
  const quality = validQualities.includes(options.quality) ? options.quality : 'high';

  // 生成 HTML（隐藏导出工具栏避免截图包含按钮）
  const html = render(markdown, {
    title: options.title || fileName,
    darkMode: options.dark,
    depth: options.depth,
    autoFit: options.fit,
    noExport: true,
  });

  try {
    const info = await exportPng(html, {
      quality,
      darkMode: options.dark,
      output: outPath,
    });
    console.log(`✅ PNG 已导出: ${outPath} (${info.width}×${info.height}, ${quality} ${info.scale}x)`);
  } catch (err) {
    console.error(`错误: PNG 导出失败 — ${err.message}`);
    process.exit(1);
  }
}

program.parse();

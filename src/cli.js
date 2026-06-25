#!/usr/bin/env node

/**
 * md-mindmap CLI — 将 Markdown 文件渲染为交互式思维导图
 *
 * 用法:
 *   md-mindmap <markdown-file>                   输出 HTML 到 stdout
 *   md-mindmap <markdown-file> -o out.html       输出 HTML 到文件
 *   md-mindmap <markdown-file> --format json     输出 JSON 节点树
 *   md-mindmap <markdown-file> --format png -o mindmap.png  输出 PNG 图片
 *   md-mindmap <markdown-file> --format png --width 1280 --height 720
 *   md-mindmap <markdown-file> --depth 2         展开到第 2 层
 *   md-mindmap <markdown-file> --no-fit          禁用自动缩放
 */

const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const os = require('os');
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
  .option('-f, --format <format>', '输出格式: html | json | png', 'html')
  .option('--depth <n>', '初始展开层级（默认全部展开）', parseInt)
  .option('--no-fit', '禁用自动缩放适配')
  .option('--width <px>', 'PNG 宽度（默认 1920）', parseInt)
  .option('--height <px>', 'PNG 高度（默认 1080）', parseInt)
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

      if (options.format === 'png') {
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

/**
 * 使用 Puppeteer 渲染 HTML 并导出 PNG
 */
async function renderPng(markdown, options, fileName) {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch {
    console.error('错误: --format png 需要安装 puppeteer: npm install puppeteer');
    process.exit(1);
  }

  const outPath = options.output
    ? path.resolve(options.output)
    : path.resolve(`${fileName}.png`);

  // 生成 HTML（隐藏导出工具栏避免截图包含按钮）
  const html = render(markdown, {
    title: options.title || fileName,
    darkMode: options.dark,
    depth: options.depth,
    autoFit: options.fit,
    noExport: true,
  });

  const tmpFile = path.join(os.tmpdir(), `mdm-${Date.now()}.html`);
  fs.writeFileSync(tmpFile, html, 'utf-8');

  const width = options.width || 1920;
  const height = options.height || 1080;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    await page.goto(`file://${tmpFile}`, { waitUntil: 'load', timeout: 30000 });

    // 等待 markmap 初始化完成
    await page.waitForFunction(() => {
      const svg = document.getElementById('mindmap');
      return svg && svg.querySelector('g') && svg.getBoundingClientRect().width > 100;
    }, { timeout: 20000 });

    // 设置背景色 + 采集 foreignObject 尺寸 + 渲染 PNG
    const pngBase64 = await page.evaluate((dark) => {
      document.body.style.backgroundColor = dark ? '#1e1e2e' : '#ffffff';

      const svg = document.getElementById('mindmap');
      const svgRect = svg.getBoundingClientRect();
      const w = Math.round(svgRect.width) || 1920;
      const h = Math.round(svgRect.height) || 1080;

      // 先采集原始 foreignObject 的尺寸（clone 不在 DOM 中 getBoundingClientRect 不可用）
      const foData = [];
      svg.querySelectorAll('foreignObject').forEach(fo => {
        const div = fo.querySelector('div');
        const text = div ? div.textContent.trim() : '';
        if (!text) return;
        const rect = fo.getBoundingClientRect();
        foData.push({
          x: parseFloat(fo.getAttribute('x')) || 0,
          y: parseFloat(fo.getAttribute('y')) || 0,
          w: rect.width || parseFloat(fo.getAttribute('width')) || 200,
          h: rect.height || parseFloat(fo.getAttribute('height')) || 30,
          text,
        });
      });

      // 克隆并替换
      const clone = svg.cloneNode(true);
      const foEls = clone.querySelectorAll('foreignObject');
      foEls.forEach((fo, i) => {
        const d = foData[i];
        if (!d) { fo.remove(); return; }
        const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textEl.setAttribute('x', String(d.x + d.w / 2));
        textEl.setAttribute('y', String(d.y + d.h / 2));
        textEl.setAttribute('text-anchor', 'middle');
        textEl.setAttribute('dominant-baseline', 'central');
        textEl.setAttribute('font-size', '14px');
        textEl.setAttribute('font-family', 'sans-serif');
        textEl.setAttribute('fill', dark ? '#cdd6f4' : '#000000');
        textEl.textContent = d.text;
        fo.parentNode.replaceChild(textEl, fo);
      });

      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', String(w));
      clone.setAttribute('height', String(h));
      const svgData = new XMLSerializer().serializeToString(clone);

      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = dark ? '#1e1e2e' : '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => reject(new Error('SVG conversion failed'));
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
      });
    }, options.dark);

    // base64 → 文件
    const buf = Buffer.from(pngBase64.replace(/^data:image\/png;base64,/, ''), 'base64');
    fs.writeFileSync(outPath, buf);
    console.log(`✅ PNG 已导出: ${outPath} (${width}x${height})`);
  } catch (err) {
    console.error(`错误: PNG 导出失败 — ${err.message}`);
    console.error('提示: 请确保网络可访问 cdn.jsdelivr.net');
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

program.parse();

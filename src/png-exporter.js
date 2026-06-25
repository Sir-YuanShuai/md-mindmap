/**
 * PNG 导出模块 — 使用 Puppeteer 将思维导图 HTML 渲染为高保真 PNG
 *
 * 流程:
 *   1. 将 HTML 写入临时文件
 *   2. 启动无头浏览器 (headless Chromium)
 *   3. 加载 HTML 页面并等待 markmap SVG 渲染完成
 *   4. 将 foreignObject 替换为 SVG <text> 元素（Canvas 无法渲染 foreignObject）
 *   5. 通过 Canvas 将 SVG 渲染为 PNG（保真度高于 page.screenshot）
 *   6. 保存 PNG 文件并清理临时文件
 */

const fs = require('fs');
const os = require('os');

/**
 * 将 HTML 渲染为高保真 PNG 截图并保存到文件
 *
 * @param {string} html - 完整的 HTML 字符串（由 renderer.buildHtml 生成）
 * @param {object} options
 * @param {number} [options.width=1920] - 视口宽度（像素）
 * @param {number} [options.height=1080] - 视口高度（像素）
 * @param {boolean} [options.dark=false] - 暗色背景
 * @param {string} options.output - 输出 PNG 文件路径
 * @returns {Promise<void>}
 */
async function exportPng(html, options = {}) {
  const width = options.width || 1920;
  const height = options.height || 1080;
  const outputPath = options.output;
  const dark = options.dark || false;

  if (!outputPath) {
    throw new Error('缺少 output 参数: 请指定 PNG 输出路径');
  }

  // Lazy require puppeteer — 避免 puppeteer 未安装时 require('md-mindmap') 报错
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch {
    throw new Error(
      'PNG 导出需要安装 puppeteer。请运行: npm install puppeteer'
    );
  }

  // 将 HTML 写入临时文件（page.goto(file://) 比 page.setContent() 更可靠）
  const tmpFile = path.join(os.tmpdir(), `mdm-${Date.now()}.html`);
  fs.writeFileSync(tmpFile, html, 'utf-8');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    await page.goto(`file://${tmpFile}`, { waitUntil: 'load', timeout: 30000 });

    // 等待 markmap 渲染出 <g> 节点
    await page.waitForFunction(() => {
      const svg = document.getElementById('mindmap');
      return svg && svg.querySelector('g') && svg.getBoundingClientRect().width > 100;
    }, { timeout: 20000 });

    // 在浏览器内执行: foreignObject→<text> 替换 + Canvas SVG→PNG
    // 必须在浏览器内做，因为 Canvas drawImage 无法渲染 foreignObject
    const pngBase64 = await page.evaluate((isDark) => {
      document.body.style.backgroundColor = isDark ? '#1e1e2e' : '#ffffff';

      const svg = document.getElementById('mindmap');
      const svgRect = svg.getBoundingClientRect();
      const w = Math.round(svgRect.width) || 1920;
      const h = Math.round(svgRect.height) || 1080;

      // 采集原始 foreignObject 的尺寸和文本（clone 不在 DOM 中，getBoundingClientRect 不可用）
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

      // 克隆 SVG 并将 foreignObject 替换为 <text> 元素
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
        textEl.setAttribute('fill', isDark ? '#cdd6f4' : '#000000');
        textEl.textContent = d.text;
        fo.parentNode.replaceChild(textEl, fo);
      });

      // 设置 SVG 尺寸并序列化
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', String(w));
      clone.setAttribute('height', String(h));
      const svgData = new XMLSerializer().serializeToString(clone);

      // Canvas 渲染 SVG → PNG（保真度高于 page.screenshot）
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = isDark ? '#1e1e2e' : '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => reject(new Error('SVG conversion failed'));
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
      });
    }, dark);

    // base64 → 文件
    const buf = Buffer.from(pngBase64.replace(/^data:image\/png;base64,/, ''), 'base64');
    fs.writeFileSync(outputPath, buf);
  } finally {
    if (browser) await browser.close();
    // 清理临时文件
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

module.exports = { exportPng };

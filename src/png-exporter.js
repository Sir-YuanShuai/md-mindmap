/**
 * PNG 导出模块 — 使用 Puppeteer 将思维导图 HTML 渲染为 PNG 截图
 *
 * 流程:
 *   1. 启动无头浏览器 (headless Chromium)
 *   2. 加载生成的 HTML 页面
 *   3. 等待 markmap SVG 渲染完成
 *   4. 获取内容实际尺寸，按质量倍率渲染
 *   5. 截图并保存为 PNG 文件
 *   6. 关闭浏览器
 *
 * Puppeteer 为可选依赖，仅在 --format png 时需要。
 */

/**
 * 质量等级 → 渲染倍率映射
 *   low    = 1x（快速预览）
 *   medium = 2x（平衡）
 *   high   = 3x（出版级，默认）
 */
const QUALITY_SCALES = { low: 1, medium: 2, high: 3 };
const DEFAULT_QUALITY = 'high';

/**
 * 将 HTML 渲染为 PNG 截图并保存到文件
 *
 * @param {string} html - 完整的 HTML 字符串（由 renderer.buildHtml 生成）
 * @param {object} options
 * @param {string} [options.quality='high'] - 质量等级: 'low' | 'medium' | 'high'
 * @param {boolean} [options.darkMode=false] - 暗色主题（设置背景色）
 * @param {string} options.output - 输出 PNG 文件路径
 * @returns {Promise<{width: number, height: number, scale: number}>}
 */
async function exportPng(html, options = {}) {
  const quality = options.quality || DEFAULT_QUALITY;
  const scale = QUALITY_SCALES[quality];
  if (scale == null) {
    throw new Error(
      `无效的质量等级 "${quality}"，可选: ${Object.keys(QUALITY_SCALES).join(', ')}`
    );
  }

  const outputPath = options.output;
  if (!outputPath) {
    throw new Error('缺少 output 参数: 请指定 PNG 输出路径');
  }

  const puppeteer = loadPuppeteer();

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // 先用一个较大的视口加载页面，让 markmap 能完整渲染
    await page.setViewport({ width: 2560, height: 1440 });

    // 加载 HTML 内容，等待所有网络请求（CDN 资源）完成
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // 等待 markmap 在 <svg id="mindmap"> 内渲染出 <g> 节点
    await page.waitForSelector('#mindmap g', { timeout: 15000 });

    // 额外等待以确保动画/过渡完成
    await new Promise(resolve => setTimeout(resolve, 500));

    // 获取内容实际尺寸并设置背景色
    const info = await page.evaluate((q) => {
      const svg = document.getElementById('mindmap');
      const g = svg.querySelector('g');
      const bbox = g.getBBox();

      // 内容区域（含 padding）
      const padding = 40;
      const x = Math.floor(bbox.x) - padding;
      const y = Math.floor(bbox.y) - padding;
      const w = Math.ceil(bbox.width) + padding * 2;
      const h = Math.ceil(bbox.height) + padding * 2;

      return { x, y, w, h };
    }, quality);

    // 设置精确视口以匹配内容尺寸
    await page.setViewport({
      width: Math.ceil(info.w * scale),
      height: Math.ceil(info.h * scale),
      deviceScaleFactor: scale,
    });

    // 重建页面以应用新的 deviceScaleFactor（setViewport 对已加载页面不改变 deviceScaleFactor）
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });
    await page.waitForSelector('#mindmap g', { timeout: 15000 });
    await new Promise(resolve => setTimeout(resolve, 500));

    // 设置背景色
    await page.evaluate((dark) => {
      document.body.style.backgroundColor = dark ? '#1e1e2e' : '#ffffff';
    }, options.darkMode || false);

    // 获取精确的内容边界进行 clip 截图
    const clip = await page.evaluate((pad) => {
      const svg = document.getElementById('mindmap');
      const g = svg.querySelector('g');
      const bbox = g.getBBox();
      return {
        x: Math.max(0, Math.floor(bbox.x) - pad),
        y: Math.max(0, Math.floor(bbox.y) - pad),
        width: Math.ceil(bbox.width) + pad * 2,
        height: Math.ceil(bbox.height) + pad * 2,
      };
    }, 40);

    // 截图 — 精确截取内容区域
    await page.screenshot({
      path: outputPath,
      type: 'png',
      clip,
    });

    return { width: clip.width, height: clip.height, scale };
  } finally {
    await browser.close();
  }
}

/**
 * 懒加载 Puppeteer，未安装时给出友好提示
 */
function loadPuppeteer() {
  try {
    return require('puppeteer');
  } catch {
    throw new Error(
      'PNG 导出需要 puppeteer。请运行:\n' +
      '  npm install puppeteer\n' +
      '或使用 --format html 导出 HTML 后用浏览器打开'
    );
  }
}

module.exports = { exportPng, QUALITY_SCALES, DEFAULT_QUALITY };

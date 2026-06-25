/**
 * PNG 导出模块 — 使用 Puppeteer 将思维导图 HTML 渲染为 PNG 截图
 *
 * 流程:
 *   1. 获取共享的无头浏览器实例（复用，避免重复启动）
 *   2. 创建新页面，加载 HTML
 *   3. 等待 markmap SVG 渲染完成
 *   4. 截图并保存为 PNG 文件
 *   5. 关闭页面（保留浏览器实例供后续使用）
 *
 * 性能优化:
 *   - 使用 browser-pool 单例复用浏览器，首次启动后后续导出仅需 ~0.5s
 *   - HTML 模板已内联所有 JS 依赖，消除了 CDN 网络请求
 */

const { getBrowser } = require('./browser-pool');

/**
 * 将 HTML 渲染为 PNG 截图并保存到文件
 *
 * @param {string} html - 完整的 HTML 字符串（由 renderer.buildHtml 生成）
 * @param {object} options
 * @param {number} [options.width=1280] - 视口宽度（像素）
 * @param {number} [options.height=800] - 视口高度（像素）
 * @param {string} options.output - 输出 PNG 文件路径
 * @returns {Promise<void>}
 */
async function exportPng(html, options = {}) {
  const width = options.width || 1280;
  const height = options.height || 800;
  const outputPath = options.output;

  if (!outputPath) {
    throw new Error('缺少 output 参数: 请指定 PNG 输出路径');
  }

  const browser = await getBrowser();

  const page = await browser.newPage();

  try {
    // 设置视口尺寸
    await page.setViewport({ width, height });

    // 加载 HTML 内容（JS/CSS 已内联，无需等待网络请求）
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 15000,
    });

    // 等待 markmap 在 <svg id="mindmap"> 内渲染出 <g> 节点
    await page.waitForSelector('#mindmap g', { timeout: 10000 });

    // 额外等待以确保动画/过渡完成
    await new Promise(resolve => setTimeout(resolve, 300));

    // 截图
    await page.screenshot({
      path: outputPath,
      type: 'png',
      fullPage: false,
    });
  } finally {
    await page.close();
  }
}

module.exports = { exportPng };

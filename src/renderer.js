/**
 * 将 markmap 的节点数据渲染为独立可用的 HTML 页面
 *
 * 所有 JS 依赖（d3、markmap-view）均从 node_modules 内联打包，
 * 不依赖任何外部 CDN，离线环境也可正常渲染。
 */

const { getInlineScripts } = require('./local-assets');

/**
 * 导出工具栏 CSS 和 JS — HTML 内嵌 PNG / SVG 导出功能
 */
const EXPORT_TOOLBAR = `
<style>
  .mdm-toolbar {
    position: fixed;
    bottom: 20px;
    right: 20px;
    display: flex;
    gap: 8px;
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  .mdm-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    color: #fff;
    transition: opacity 0.2s;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }
  .mdm-btn:hover { opacity: 0.85; }
  .mdm-btn-png { background: #4f46e5; }
  .mdm-btn-svg { background: #059669; }
  [data-theme="dark"] .mdm-btn { box-shadow: 0 2px 8px rgba(0,0,0,0.4); }
</style>
<div class="mdm-toolbar">
  <button class="mdm-btn mdm-btn-png" onclick="mdmExportPNG()">⬇ PNG</button>
  <button class="mdm-btn mdm-btn-svg" onclick="mdmExportSVG()">⬇ SVG</button>
</div>
<script>
  function mdmExportSVG() {
    const svg = document.getElementById('mindmap');
    const clone = svg.cloneNode(true);
    // 获取当前视图的 transform，保留缩放和平移状态
    const g = clone.querySelector('g');
    const origG = svg.querySelector('g');
    if (g && origG) {
      g.setAttribute('transform', origG.getAttribute('transform') || '');
    }
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const data = new XMLSerializer().serializeToString(clone);
    const blob = new Blob(['<?xml version="1.0"?>\\n' + data], {type: 'image/svg+xml'});
    mdmDownload(blob, 'mindmap.svg');
  }
  function mdmExportPNG() {
    const svg = document.getElementById('mindmap');
    const rect = svg.getBoundingClientRect();
    const w = Math.round(rect.width) || 1920;
    const h = Math.round(rect.height) || 1080;

    // 获取当前主题颜色
    const bodyStyle = getComputedStyle(document.body);
    const bgColor = bodyStyle.backgroundColor || '#ffffff';
    const textColor = bodyStyle.color || '#000000';

    // 克隆 SVG 并将 foreignObject 转为 text（Canvas drawImage 无法渲染 foreignObject）
    const clone = svg.cloneNode(true);
    const fos = clone.querySelectorAll('foreignObject');
    fos.forEach(fo => {
      const div = fo.querySelector('div');
      if (!div) { fo.remove(); return; }
      const text = div.textContent.trim();
      if (!text) { fo.remove(); return; }

      const x = parseFloat(fo.getAttribute('x')) || 0;
      const y = parseFloat(fo.getAttribute('y')) || 0;
      const fw = parseFloat(fo.getAttribute('width')) || 200;
      const fh = parseFloat(fo.getAttribute('height')) || 40;

      // 获取原始元素的计算样式
      const origFo = svg.querySelector('foreignObject[x="' + fo.getAttribute('x') + '"][y="' + fo.getAttribute('y') + '"]');
      let fontSize = '14px';
      if (origFo) {
        const foDiv = origFo.querySelector('div');
        if (foDiv) fontSize = getComputedStyle(foDiv).fontSize || '14px';
      }

      const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textEl.setAttribute('x', String(x + fw / 2));
      textEl.setAttribute('y', String(y + fh / 2 + 1));
      textEl.setAttribute('text-anchor', 'middle');
      textEl.setAttribute('dominant-baseline', 'middle');
      textEl.setAttribute('font-size', fontSize);
      textEl.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif');
      textEl.setAttribute('fill', textColor);
      textEl.textContent = text;

      fo.parentNode.replaceChild(textEl, fo);
    });

    // 保留当前视图的 transform
    const g = clone.querySelector('g');
    const origG = svg.querySelector('g');
    if (g && origG) {
      g.setAttribute('transform', origG.getAttribute('transform') || '');
    }

    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', String(w));
    clone.setAttribute('height', String(h));

    const data = new XMLSerializer().serializeToString(clone);
    const img = new Image();
    const svgBlob = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      const scale = Math.min(window.devicePixelRatio || 2, 2);
      const canvas = document.createElement('canvas');
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(b => {
        if (b) mdmDownload(b, 'mindmap.png');
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      console.error('PNG 导出失败，请尝试 SVG 导出');
    };
    img.src = url;
  }
  function mdmDownload(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
</script>`;

/**
 * 构建包含思维导图的完整 HTML 页面
 * @param {object} root - markmap 的节点树根节点
 * @param {object} features - markmap 的 feature flags
 * @param {object} assets - transformer.getUsedAssets(features) 的返回值
 * @param {object} [options]
 * @param {string} [options.title='Mind Map'] - HTML 页面标题
 * @param {boolean} [options.darkMode=false] - 是否启用暗色主题
 * @param {number} [options.depth] - 初始展开层级（undefined = 全部展开）
 * @param {boolean} [options.autoFit=true] - 是否自动缩放适配
 * @param {boolean} [options.noExport=false] - 是否隐藏导出按钮
 * @returns {string} 完整 HTML 字符串
 */
function buildHtml(root, features, assets, options = {}) {
  const title = options.title || 'Mind Map';
  const darkMode = options.darkMode || false;

  const { styles, scripts } = assets || { styles: [], scripts: [] };

  const themeAttr = darkMode ? ' data-theme="dark"' : '';
  const coreScripts = getInlineScripts();

  // 构建 markmap 配置
  const markmapOpts = {};
  if (options.depth != null) markmapOpts.initialExpandLevel = options.depth;
  if (options.autoFit === false) markmapOpts.autoFit = false;

  // 导出工具栏
  const toolbar = options.noExport ? '' : EXPORT_TOOLBAR;

  return `<!DOCTYPE html>
<html lang="zh-CN"${themeAttr}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body,
    html,
    #mindmap {
      width: 100%;
      height: 100%;
    }
    /* 暗色主题背景 */
    [data-theme="dark"] {
      background: #1e1e2e;
    }
    [data-theme="dark"] .markmap-foreign {
      color: #cdd6f4;
    }
  </style>
  ${styles.join('\n')}
</head>
<body>
  <svg id="mindmap"></svg>
  ${coreScripts}
  ${scripts.join('\n')}
  <script>
    (() => {
      const { Markmap } = window.markmap;
      const svg = document.getElementById('mindmap');
      Markmap.create(svg, ${JSON.stringify(markmapOpts)}, ${JSON.stringify(root)});
    })();
  </script>
  ${toolbar}
</body>
</html>`;
}

/**
 * 转义 HTML 特殊字符
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = { buildHtml, escapeHtml };

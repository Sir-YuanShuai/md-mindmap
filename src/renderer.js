/**
 * 将 markmap 的节点数据渲染为独立可用的 HTML 页面
 */

/**
 * CDN 资源地址 — 当 getUsedAssets() 返回空时确保 markmap-view 始终可用
 */
const MARKMAP_CDN_SCRIPTS = [
  '<script src="https://cdn.jsdelivr.net/npm/d3@7"></script>',
  '<script src="https://cdn.jsdelivr.net/npm/markmap-view@0.18.11/dist/browser/index.js"></script>',
];

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
 * @returns {string} 完整 HTML 字符串
 */
function buildHtml(root, features, assets, options = {}) {
  const title = options.title || 'Mind Map';
  const darkMode = options.darkMode || false;

  const { styles, scripts } = assets || { styles: [], scripts: [] };

  // CDN 兜底：getUsedAssets() 对纯标题 Markdown 返回空数组，导致 HTML 缺少 markmap-view
  const allScripts = scripts.length > 0 ? scripts : MARKMAP_CDN_SCRIPTS;

  const themeAttr = darkMode ? ' data-theme="dark"' : '';

  // 构建 markmap 配置
  const markmapOpts = {};
  if (options.depth != null) markmapOpts.initialExpandLevel = options.depth;
  if (options.autoFit === false) markmapOpts.autoFit = false;

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
  ${allScripts.join('\n')}
  <script>
    (() => {
      const { Markmap } = window.markmap;
      const svg = document.getElementById('mindmap');
      Markmap.create(svg, ${JSON.stringify(markmapOpts)}, ${JSON.stringify(root)});
    })();
  </script>
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

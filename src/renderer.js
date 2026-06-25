/**
 * 将 markmap 的节点数据渲染为独立可用的 HTML 页面
 */

const fs = require('fs');
const path = require('path');

/**
 * 定位 npm 包的根目录
 * @param {string} pkgName - 包名
 * @returns {string} 包根目录的绝对路径
 */
function getPkgRoot(pkgName) {
  let dir = path.dirname(require.resolve(pkgName));
  // 向上查找包含 package.json 的目录，即包根目录
  while (true) {
    const parent = path.dirname(dir);
    if (parent === dir) break; // 到达文件系统根目录
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    dir = parent;
  }
  throw new Error(`无法定位 ${pkgName} 的包根目录`);
}

/**
 * 读取 node_modules 中的脚本文件内容，生成内联 <script> 标签
 * @param {string} pkgName - 包名
 * @param {string} relativePath - 相对于包根目录的文件路径
 */
function inlineScript(pkgName, relativePath) {
  const pkgRoot = getPkgRoot(pkgName);
  const absPath = path.join(pkgRoot, relativePath);
  const content = fs.readFileSync(absPath, 'utf-8');
  return `<script>${content}</script>`;
}

// 缓存内联脚本，避免每次都读磁盘
let _cachedScripts = null;
function getCoreScripts() {
  if (!_cachedScripts) {
    _cachedScripts = [
      inlineScript('d3', 'dist/d3.min.js'),
      inlineScript('markmap-view', 'dist/browser/index.js'),
    ].join('\n');
  }
  return _cachedScripts;
}

/**
 * 构建包含思维导图的完整 HTML 页面
 * @param {object} root - markmap 的节点树根节点
 * @param {object} features - markmap 的 feature flags
 * @param {object} assets - transformer.getUsedAssets(features) 的返回值
 * @param {object} [options]
 * @param {string} [options.title='Mind Map'] - HTML 页面标题
 * @param {boolean} [options.darkMode=false] - 是否启用暗色主题
 * @returns {string} 完整 HTML 字符串
 */
function buildHtml(root, features, assets, options = {}) {
  const title = options.title || 'Mind Map';
  const darkMode = options.darkMode || false;

  const { styles, scripts } = assets || { styles: [], scripts: [] };

  const themeAttr = darkMode ? ' data-theme="dark"' : '';
  const coreScripts = getCoreScripts();

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
      Markmap.create(svg, null, ${JSON.stringify(root)});
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

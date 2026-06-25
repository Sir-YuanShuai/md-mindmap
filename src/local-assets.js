/**
 * 本地资源加载模块 — 将 markmap 生态的核心 JS 从 node_modules 读取并缓存
 *
 * 解决的问题:
 *   - 消除对 cdn.jsdelivr.net 的网络依赖
 *   - 离线环境可正常工作
 *   - 大幅加快 Puppeteer 渲染速度（无需等待网络请求）
 */

const fs = require('fs');
const path = require('path');

// ── 缓存 ──────────────────────────────────────────────────────────
let _d3Script = null;
let _markmapScript = null;

/**
 * 读取文件内容并包装为内联 <script> 标签
 * @param {string} filePath - 绝对路径
 * @returns {string} `<script>...</script>`
 */
function inlineScriptTag(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return `<script>${content}</script>`;
}

/**
 * 获取 d3 内联 <script> 标签（首次调用读取文件，后续走缓存）
 * @returns {string}
 */
function getMarkmapD3Script() {
  if (_d3Script) return _d3Script;

  // 从 markmap-view 的依赖中查找 d3，fallback 到项目自身的 node_modules
  const candidates = [
    path.resolve(__dirname, '..', 'node_modules', 'd3', 'dist', 'd3.min.js'),
    // 如果作为依赖被安装在其他位置
    path.resolve(require.resolve('d3'), '..', 'dist', 'd3.min.js'),
  ];

  let resolved = null;
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) { resolved = p; break; }
    } catch { /* 继续 */ }
  }

  // 最后尝试用 require.resolve 找到 d3 入口再反推 dist
  if (!resolved) {
    try {
      const d3Entry = require.resolve('d3');
      const d3Dist = path.resolve(path.dirname(d3Entry), 'dist', 'd3.min.js');
      if (fs.existsSync(d3Dist)) resolved = d3Dist;
    } catch { /* 继续 */ }
  }

  if (!resolved) {
    throw new Error(
      '找不到 d3/dist/d3.min.js。请确保 d3 已安装: npm install d3'
    );
  }

  _d3Script = inlineScriptTag(resolved);
  return _d3Script;
}

/**
 * 获取 markmap-view 内联 <script> 标签（首次调用读取文件，后续走缓存）
 * @returns {string}
 */
function getMarkmapViewScript() {
  if (_markmapScript) return _markmapScript;

  const candidates = [
    path.resolve(
      __dirname, '..', 'node_modules', 'markmap-view',
      'dist', 'browser', 'index.js'
    ),
  ];

  let resolved = null;
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) { resolved = p; break; }
    } catch { /* 继续 */ }
  }

  if (!resolved) {
    try {
      const mvEntry = require.resolve('markmap-view');
      const mvDist = path.resolve(
        path.dirname(mvEntry), 'dist', 'browser', 'index.js'
      );
      if (fs.existsSync(mvDist)) resolved = mvDist;
    } catch { /* 继续 */ }
  }

  if (!resolved) {
    throw new Error(
      '找不到 markmap-view/dist/browser/index.js。请确保 markmap-view 已安装: npm install markmap-view'
    );
  }

  _markmapScript = inlineScriptTag(resolved);
  return _markmapScript;
}

/**
 * 获取所有本地内联脚本（d3 + markmap-view）拼接后的字符串
 * @returns {string}
 */
function getInlineScripts() {
  return getMarkmapD3Script() + '\n' + getMarkmapViewScript();
}

/**
 * 清除缓存（主要用于测试）
 */
function clearCache() {
  _d3Script = null;
  _markmapScript = null;
}

module.exports = {
  getMarkmapD3Script,
  getMarkmapViewScript,
  getInlineScripts,
  clearCache,
};

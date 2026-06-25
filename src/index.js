/**
 * md-mindmap — 将 Markdown 渲染为交互式思维导图
 *
 * 提供两种使用方式：
 * 1. CLI：md-mindmap <markdown-file>
 * 2. API：require('md-mindmap').render(markdown, options)
 */

const { Transformer } = require('markmap-lib');
const { buildHtml } = require('./renderer');
const { exportPng } = require('./png-exporter');

const transformer = new Transformer();

/**
 * 解析 Markdown 文本，返回 markmap 需要的节点树和资源
 * @param {string} markdown - Markdown 文本内容
 * @returns {{ root: object, features: object, frontmatter: object, assets: object }}
 */
function parse(markdown) {
  const { root, features, frontmatter } = transformer.transform(markdown);
  const assets = transformer.getUsedAssets(features);
  return { root, features, frontmatter, assets };
}

/**
 * 将 Markdown 渲染为完整的思维导图 HTML
 * @param {string} markdown - Markdown 文本内容
 * @param {object} [options] - 可选配置
 * @param {string} [options.title] - 页面标题
 * @param {boolean} [options.darkMode] - 是否使用暗色主题
 * @param {number} [options.depth] - 初始展开层级
 * @param {boolean} [options.autoFit] - 是否自动缩放适配
 * @returns {string} 完整的 HTML 字符串
 */
function render(markdown, options = {}) {
  const { root, features, frontmatter, assets } = parse(markdown);
  const title = options.title || frontmatter?.title || 'Mind Map';
  return buildHtml(root, features, assets, { ...options, title });
}

module.exports = { parse, render, exportPng, transformer };

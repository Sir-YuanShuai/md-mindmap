/**
 * Puppeteer 浏览器实例池 — 单例复用
 *
 * 解决的问题:
 *   - 避免每次导出 PNG 都重新启动 Chromium（启动耗时 ~1-3s）
 *   - 连续导出多个 PNG 时共享同一个浏览器进程
 *   - 提供优雅关闭接口
 */

let puppeteer = null;
let _browser = null;
let _launchPromise = null;

/**
 * 获取（或创建）共享的 Puppeteer 浏览器实例
 *
 * @param {object} [opts]
 * @param {object} [opts.launchOptions] - 传给 puppeteer.launch() 的选项
 * @returns {Promise<import('puppeteer').Browser>}
 */
async function getBrowser(opts = {}) {
  if (_browser && _browser.isConnected()) {
    return _browser;
  }

  // 如果正在启动中，等待同一个 Promise
  if (_launchPromise) {
    const browser = await _launchPromise;
    if (browser && browser.isConnected()) return browser;
  }

  if (!puppeteer) {
    try {
      puppeteer = require('puppeteer');
    } catch {
      throw new Error(
        'puppeteer 未安装。请运行: npm install puppeteer'
      );
    }
  }

  _launchPromise = puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    ...opts.launchOptions,
  });

  try {
    _browser = await _launchPromise;
    _launchPromise = null;

    // 监听断开事件，自动清理状态
    _browser.on('disconnected', () => {
      _browser = null;
      _launchPromise = null;
    });

    return _browser;
  } catch (err) {
    _launchPromise = null;
    throw err;
  }
}

/**
 * 关闭共享的浏览器实例
 * @returns {Promise<void>}
 */
async function closeBrowser() {
  if (_browser) {
    try {
      await _browser.close();
    } catch {
      // 忽略关闭错误（可能已断开）
    }
  }
  _browser = null;
  _launchPromise = null;
}

/**
 * 重置内部状态（用于测试）
 */
function reset() {
  _browser = null;
  _launchPromise = null;
  puppeteer = null;
}

module.exports = { getBrowser, closeBrowser, reset };

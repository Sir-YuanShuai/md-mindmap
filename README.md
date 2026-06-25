# md-mindmap

将 Markdown 渲染为交互式思维导图的 CLI 工具和 JavaScript 库，基于 [markmap](https://markmap.js.org/)。

## 安装

```bash
npm install -g md-mindmap
```

## CLI 使用

```bash
# 将 Markdown 渲染为 HTML 并输出到文件
md-mindmap notes.md -o mindmap.html

# 使用暗色主题
md-mindmap notes.md -o mindmap.html --dark

# 自定义页面标题
md-mindmap notes.md -o mindmap.html -t "我的笔记"

# 直接输出 HTML 到标准输出
md-mindmap notes.md > mindmap.html
```

## API 使用

```js
const { parse, render } = require('md-mindmap');

// 渲染为完整 HTML
const html = render('# 根节点\n## 子节点 A\n## 子节点 B', {
  title: '我的思维导图',
  darkMode: false,
});

// 只解析，获取节点树
const { root, features, frontmatter } = parse('# Markdown 内容');
```

## Markdown 语法

使用标准 Markdown 标题层级来定义思维导图结构：

```markdown
# 根节点
## 一级分支
### 二级分支
#### 三级分支
## 另一个一级分支
### 另一个二级分支
```

- `#` → 根节点
- `##` → 一级分支
- `###` → 二级分支
- `####` → 三级分支（以此类推）

支持列表、链接、代码块、图片等标准 Markdown 语法。

## 功能特性

- 🎨 交互式思维导图（缩放、拖拽、折叠/展开节点）
- 🌙 亮色 / 暗色主题
- 📝 标准 Markdown 语法，无需学习新格式
- 📦 同时提供 CLI 和编程 API
- ⚡ 零配置，开箱即用

## License

MIT

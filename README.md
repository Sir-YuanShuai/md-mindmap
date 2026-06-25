# md-mindmap

将 Markdown 渲染为交互式思维导图的 CLI 工具和 JavaScript 库，基于 [markmap](https://markmap.js.org/)。

## 安装

```bash
npm install -g md-mindmap
```

## 快速使用（零安装 / npx）

无需全局安装，只需 Node.js 环境即可使用：

```bash
# 将 Markdown 渲染为 HTML 并输出到文件
npx md-mindmap notes.md -o mindmap.html

# 使用暗色主题
npx md-mindmap notes.md -o mindmap.html --dark

# 自定义页面标题
npx md-mindmap notes.md -o mindmap.html -t "我的笔记"

# 直接输出 HTML 到标准输出
npx md-mindmap notes.md > mindmap.html
```

## CLI 使用

```bash
# 全局安装后使用
npm install -g md-mindmap

# 将 Markdown 渲染为 HTML 并输出到文件
md-mindmap notes.md -o mindmap.html

# 使用暗色主题
md-mindmap notes.md -o mindmap.html --dark

# 自定义页面标题
md-mindmap notes.md -o mindmap.html -t "我的笔记"

# 直接输出 HTML 到标准输出
md-mindmap notes.md > mindmap.html
```

### CLI 参数

| 参数 | 说明 |
|------|------|
| `<file>` | Markdown 文件路径（必填） |
| `-o, --output <file>` | 输出 HTML 文件路径 |
| `-t, --title <title>` | 自定义页面标题（默认使用文件名） |
| `-d, --dark` | 使用暗色主题 |
| `-V, --version` | 显示版本号 |
| `-h, --help` | 显示帮助信息 |

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
- ⚡ 零配置，npx 即用
- 🤖 Claude Code Skill 支持

## Claude Code Skill

md-mindmap 提供了 Claude Code Skill 定义文件，让 AI 助手可以直接调用此工具。

### 安装 Skill

将 `.claude/skills/md-mindmap/SKILL.md` 复制到你的项目或用户技能目录：

```bash
# 项目级技能（仅当前项目可用）
mkdir -p .claude/skills/md-mindmap
cp .claude/skills/md-mindmap/SKILL.md .claude/skills/md-mindmap/

# 或用户级技能（所有项目可用）
mkdir -p ~/.claude/skills/md-mindmap
cp .claude/skills/md-mindmap/SKILL.md ~/.claude/skills/md-mindmap/
```

安装后，当你对 Claude Code 说"把这个文档转成思维导图"或"生成一个 mindmap"时，它会自动调用 `npx md-mindmap` 完成。

### Skill 工作原理

1. Skill 文件告诉 Claude Code 何时使用此工具
2. Claude Code 通过 `npx md-mindmap` 调用，无需预先安装
3. 只需 Node.js 环境即可运行

## License

MIT

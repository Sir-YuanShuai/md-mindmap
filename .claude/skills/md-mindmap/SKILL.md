---
name: md-mindmap
description: Use this skill whenever the user wants to create an interactive mind map from Markdown. This includes converting .md files to mind map HTML, visualizing Markdown document structure as a mind map, generating mind map diagrams from headings, or rendering hierarchical notes as an interactive brain map. If the user asks to "create a mind map", "visualize markdown as mindmap", "generate a mind map from this document", or similar, use this skill.
---

# md-mindmap — Markdown 转交互式思维导图

## 概述

md-mindmap 将 Markdown 文件渲染为交互式思维导图 HTML。基于 [markmap](https://markmap.js.org/) 生态，使用 Markdown 标题层级定义思维导图结构。

**零安装使用** — 只需 Node.js 环境，通过 `npx` 直接运行，无需全局安装。

## 快速使用 (npx)

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

## CLI 参数

| 参数 | 说明 |
|------|------|
| `<file>` | Markdown 文件路径（必填） |
| `-o, --output <file>` | 输出 HTML 文件路径 |
| `-t, --title <title>` | 自定义页面标题（默认使用文件名） |
| `-d, --dark` | 使用暗色主题 |
| `-V, --version` | 显示版本号 |
| `-h, --help` | 显示帮助信息 |

## Markdown 语法

使用标准 Markdown 标题层级定义思维导图结构：

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

## 工作流

1. 用户提供 Markdown 内容（可以是文件路径，也可以让你先创建 .md 文件）
2. 使用 `npx md-mindmap <file> -o <output.html>` 生成思维导图
3. 向用户报告输出文件位置

如果用户没有现成的 .md 文件，先用写文件工具创建 Markdown 文件，再调用 npx 生成思维导图。

## 功能特性

- 🎨 交互式思维导图（缩放、拖拽、折叠/展开节点）
- 🌙 亮色 / 暗色主题
- 📝 标准 Markdown 语法，无需学习新格式
- ⚡ 零配置，npx 即用

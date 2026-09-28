# Changelog

All notable changes to `omni-rich-text` will be documented in this file.

---

## [0.1.1] - 2026-09-28

### 🚀 Major Improvements & Architecture Upgrades

- **组件正式更名为 `OmniRichText`**
  - 与 NPM 包名 `omni-rich-text` 完全统一，核心主导出组件名更新为 `OmniRichText`（Taro、UniApp、React Native、原生小程序全平台对齐）。
  - 保留并完全兼容 `UniversalRichText` 历史别名导出，确保现有项目平滑升级不破坏现有代码。

- **1:1 原貌保真渲染（彻底废除 0.5 减半/缩水逻辑）**
  - 核心样式处理器中的 `DEFAULT_REM_SCALE` 从 `0.5` 修正为 **`1.0`**。
  - HTML 内容内联样式声明的 `margin`、`padding`、`border-radius`、`font-size` 等尺寸 100% 原始呈现，彻底解决“部分元素应有间距却间距丢失”、“文字意外偏小”的问题。
  - 超出屏幕宽度的块级容器保持 `max-width: 100%` 响应式自适应防溢出保护。

- **外层宿主容器零侵入与真实 DOM 层级隔离**
  - 外层宿主卡片容器彻底移除强制性背景色与固定内边距（padding），默认透明且零边距。
  - 完全由富文本 HTML 各标签（`<section>`、`<div>`、`<span>` 等）自身的内联样式决定各节点的背景与延展范围，彻底消除“背景色误覆盖全文章文字”或“背景色被外层挤压无法贴边”的失真现象。

- **图片精准混排排版与异常资源静默**
  - 移除原先硬编码剥离图片 `width`、`height`、`display` 的逻辑。
  - 对行内混排图、徽章图标（如 `display: inline-block`）及指定固定尺寸的图片忠实保留原始流式结构，不再强行撑满屏幕；仅对全宽主图保持自适应撑满。
  - **加载失败彻底静默隐藏**：当图片加载失败时直接隐藏（`return null`），不再显示带有虚线边框与 `🖼️ 图片加载失败` 的灰色破损方框。

- **公众号全特性高保真对齐**
  - 完整保留微信 SVG 矢量图及色块纹理、深度嵌套 Section 结构、CSS `background-image` 背景图纹理与 `data-ratio` 比例骨架屏。
  - 安全过滤微信专有空白标签（如 `mpvoice`、`mp-vote`、`mp-miniprogram`）。

- **Demo 体验全面升级**
  - 移除 Demo 中冗余的自定义源码输入框及占位卡片，默认展示真实的微信公众号案例与长文排版。
  - 新增实战图文案例 Tab，直观检验复杂嵌套与背景装饰效果。

---

## [0.0.11] - 2026-09-27

- 修复微信小程序自定义组件 `virtualHost: true` 隔离导致的样式穿透问题。
- 完善微信公众号文章 `<style>` 标签类名解析与内联化转换。
- 增强 `LRUCache` 缓存机制，提升长文再次解析性能。

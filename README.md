# Omni Rich Text (全能跨端富文本渲染引擎)

<p align="center">
  <strong>一款专为现代跨端生态打造的高性能、高保真富文本渲染引擎</strong><br>
  原生支持 <b>Taro (React)</b>、<b>UniApp (Vue 3)</b>、<b>React Native</b> 与 <b>微信原生小程序</b>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/omni-rich-text"><img src="https://img.shields.io/npm/v/omni-rich-text.svg?color=cb3837" alt="npm version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/tests-41%20passed-brightgreen.svg" alt="Tests">
  <img src="https://img.shields.io/badge/build-tsup%20ESM%20%2B%20CJS%20%2B%20DTS-blue.svg" alt="Build Status">
  <a href="https://github.com/Agions/omni-rich-text"><img src="https://img.shields.io/github/stars/Agions/omni-rich-text?style=social" alt="GitHub stars"></a>
</p>

---

## 🌟 核心特性与架构亮点

### 1. ⚡ AST 解析 LRU 内存高速缓存
- 内置零依赖 32 位 FNV-1a 哈希与 LRU 缓存池（默认容量 50 条）。
- 页面回退、列表复用或重新挂载时 **0ms 瞬间还原**，彻底杜绝重复的正则分词、样式内联与 DOM 树构建开销。
- 支持通过 `cache: false` 禁用，并对外导出 `clearASTCache()` 和 `getASTCacheSize()` 控制接口。

### 2. 📜 超长图文按需触底追加 (Scroll Append)
- **拒绝首屏卡顿**：支持 `appendMode: 'scroll'` 模式，首屏仅加载首批 chunk（如 15 个根节点）。
- **视口哨兵探测**：通过底部 `IntersectionObserver` 哨兵自动感知用户滚动，临近视口底部（350px 缓冲带）时才动态挂载下一批节点，极大节省深层 DOM 与内存开销。
- **平滑空闲调度**：在 `stream` 模式下采用 `requestIdleCallback` 调频，不阻塞主线程手势交互与动画。

### 3. 🖼️ 图片 CLS 零抖动与优雅 Fallback
- **智能宽高比提取**：自动从微信文章特有的 `data-ratio`、`data-w`/`data-h`、HTML `width`/`height` 及 inline style 计算图片宽高比（`aspectRatio` 与 `paddingBottom` 占位）。
- **告别排版跳跃（Zero CLS）**：图片在网络加载完成前即精准预占高位，内容不被突然撑开。
- **容错降级**：图片遇到 404 或网络加载失败时，自动切换为优雅虚线占位与错误提示，绝不撕裂排版。
- **原生懒加载**：全端开启 `loading="lazy"` / `lazy-load`。

### 4. 🛡️ 纯净模式（Zero-Default-Styles）与全事件接管
- **组件不设任何强制预设样式**（无强制外边距、无预置灰色背景），样式 100% 完全由富文本内容驱动，保证跨端高度纯净与设计保真。
- 彻底摒弃受限的原生 `<rich-text>`，全节点采用跨端基元组件递归渲染，100% 支持事件拦截与动态交互。

### 5. 📦 标准预编译产物与现代化单包分发
- 使用 `tsup` 预编译打包，提供完整的 **ESM (`.mjs`)**、**CJS (`.js`)** 与 **TypeScript 类型声明 (`.d.ts`)**，开箱即用，无需依赖方强配 Babel/TS 转译规则。
- 现代化子路径设计：`omni-rich-text/taro`、`omni-rich-text/uni`、`omni-rich-text/react-native`、`omni-rich-text/core`、`omni-rich-text/wechat`。

---

## 📦 安装

```bash
npm install omni-rich-text
# 或
pnpm add omni-rich-text
# 或
yarn add omni-rich-text
```

---

## 🚀 跨端多框架使用指南

### 1. Taro (React) 适配层 (`omni-rich-text/taro`)

```tsx
import React from 'react';
import { View } from '@tarojs/components';
import { UniversalRichText } from 'omni-rich-text/taro';

export default function ArticleDetail() {
  const htmlContent = `
    <section>
      <h2>文章主标题</h2>
      <p>这是正文段落，完美还原排版样式与视觉设计。</p>
      <img src="https://picsum.photos/800/450" data-ratio="0.5625" alt="技术架构图" />
      <p>支持包含 <a href="https://github.com/Agions/omni-rich-text">外部链接</a> 和自定义高亮。</p>
    </section>
  `;

  return (
    <View style={{ padding: '0 16px' }}>
      <UniversalRichText
        content={htmlContent}
        mode="wechat"
        appendMode="scroll"
        imageSkeleton
        theme={{
          linkColor: '#1677ff',
          blockquoteBorderColor: '#07c160'
        }}
        webviewPath="/pages/webview/index"
        tabBarList={['/pages/index/index', '/pages/user/index']}
        onLinkTap={(ctx) => console.log('点击链接:', ctx.href)}
        onImageTap={({ src, index }) => console.log('查看大图:', src, index)}
      />
    </View>
  );
}
```

### 2. UniApp (Vue 3) 适配层 (`omni-rich-text/uni`)

```vue
<template>
  <view class="article-container">
    <UniversalRichText
      :content="htmlContent"
      mode="wechat"
      :image-skeleton="true"
      :theme="{ linkColor: '#07c160' }"
      webview-path="/pages/webview/index"
      :tab-bar-list="['/pages/home/index']"
      @link-tap="handleLinkTap"
      @image-tap="handleImageTap"
    />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { UniversalRichText } from 'omni-rich-text/uni';

const htmlContent = ref(`
  <p>欢迎使用 UniApp 跨端富文本适配组件。</p>
`);

function handleLinkTap({ href }: { href: string }) {
  console.log('点击链接:', href);
}

function handleImageTap({ src, index }: { src: string; index: number }) {
  console.log('点击图片预览:', src, index);
}
</script>
```

### 3. React Native 适配层 (`omni-rich-text/react-native` 或 `omni-rich-text/rn`)

```tsx
import React from 'react';
import { ScrollView } from 'react-native';
import { UniversalRichText } from 'omni-rich-text/react-native';

export default function NativeArticle() {
  const htmlContent = `
    <h2>React Native 原生富文本</h2>
    <p>完美支持样式到 ViewStyle 转换、代码横向滚动与图片渐显。</p>
    <img src="https://picsum.photos/600/400" width="600" height="400" />
  `;

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <UniversalRichText
        content={htmlContent}
        imageSkeleton
        theme={{
          linkColor: '#2563eb',
          codeBgColor: '#1e293b'
        }}
        onLinkTap={({ href }) => console.log('打开链接:', href)}
        onImageTap={({ src, index }) => console.log('大图预览:', index)}
      />
    </ScrollView>
  );
}
```

### 4. 原生微信小程序 (`omni-rich-text/wechat`)

在页面配置 `index.json` 中声明组件：

```json
{
  "usingComponents": {
    "omni-rich-text": "omni-rich-text/wechat/components/omni-rich-text/index"
  }
}
```

在页面 `index.wxml` 中使用：

```xml
<omni-rich-text
  content="{{htmlContent}}"
  mode="wechat"
  theme="{{themeConfig}}"
  bind:linkTap="onLinkTap"
  bind:imageTap="onImageTap"
/>
```

### 5. 纯核心解析引擎 (`omni-rich-text/core` 或 `omni-rich-text`)

如果您只需要将富文本解析并优化为标准化 AST 树，无需任何 UI 组件（支持 Node.js / SSR）：

```ts
import { parseRichContent, clearASTCache } from 'omni-rich-text/core';

const { ast, galleryList } = parseRichContent('<p>Hello <strong>World</strong></p>', {
  mode: 'wechat',
  cache: true
});

console.log(ast);          // 结构化 AST 树
console.log(galleryList);  // 全文图片有序 URL 列表
```

---

## ⚙️ 完整 API 配置属性说明

| 属性名 | 类型 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- |
| `content` | `string` | **必填** | 富文本内容（HTML 或 Markdown 字符串） |
| `format` | `'html' \| 'markdown'` | `'html'` | 内容格式 |
| `mode` | `'default' \| 'wechat'` | `'default'` | 渲染模式。`wechat` 模式自动内联 `<style>` 块并适配公众号卡片 |
| `rootFontSize` | `number` | `18.75` | 小程序 rem 换算基准（375px 屏宽 20rem 规则，1rem = 18.75px） |
| `remScale` | `number` | `0.5` | rem 缩放因子。默认 0.5（750 视网膜设计稿尺寸折半适配） |
| `fontSizeResolver` | `Function` | `undefined` | 外部自定义字号解析函数 `(sourcePx, raw) => string \| number`，支持业务自主规则 |
| `imageLinkAction` | `'link' \| 'preview' \| 'both'` | `'link'` | 图片带链接时的交互策略：`link`（优先跳转链接，默认）、`preview`（预览大图）、`both` |
| `appendMode` | `'stream' \| 'scroll'` | `'stream'` | 长文挂载策略：`scroll` 为视口按需触底追加，`stream` 为空闲调频流式 |
| `cache` | `boolean` | `true` | 是否启用 AST 解析 LRU 内存缓存池（0ms 复用） |
| `chunked` | `boolean` | `true` | 是否启用分片渐进渲染，防止长文阻塞主线程 |
| `chunkSize` | `number` | `15` | 每个分片渲染的根节点数量 |
| `imageSkeleton` | `boolean` | `true` | 是否启用图片骨架屏与淡入动画（基于宽高比预占高，防 CLS 抖动） |
| `selectable` | `boolean` | `false` | 文本是否支持选中复制（默认 `false` 防止排版长按误触） |
| `theme` | `ThemeConfig` | `{}` | 细粒度主题配色定制（超链接、引用块、代码块、表格、分割线等） |
| `webviewPath` | `string` | `undefined` | 小程序内承载外链跳转的自定义 webview 页面路由 |
| `tabBarList` | `string[]` | `[]` | TabBar 页面路由列表，命中链接自动调用 `switchTab` |
| `components` | `Record<string, Component>` | `undefined` | 声明式自定义组件映射表，如 `{ 'product-card': ProductCard }` |
| `customRender` | `(node: ASTNode) => ReactNode` | `undefined` | 针对特定节点返回自定义渲染结果的拦截 Hook |
| `onLinkTap` / `@link-tap` | `Function` | - | 链接点击拦截器，返回 `false` 可阻止默认跳转行为 |
| `onImageTap` / `@image-tap` | `Function` | - | 图片点击回调事件，携带当前图 URL 与全局画廊索引 |
| `onLongPressText` / `@long-press-text` | `Function` | - | 文本长按事件回调 |
| `onMediaEvent` / `@media-event` | `Function` | - | 音视频播放、暂停、结束等媒体事件回调 |

---

## 🎨 主题配置 (ThemeConfig)

```ts
const customTheme: ThemeConfig = {
  linkColor: '#1677ff',              // 超链接文字颜色
  blockquoteBorderColor: '#07c160',  // 引用块左边框颜色
  blockquoteBgColor: '#f0fdf4',      // 引用块背景色
  blockquoteTextColor: '#374151',    // 引用块文字颜色
  codeBgColor: '#1e1e1e',            // 代码块背景色
  codeTextColor: '#d4d4d4',          // 代码块文字颜色
  tableBorderColor: '#e5e7eb',       // 表格边框颜色
  tableHeaderBgColor: '#f9fafb',     // 表头背景底色
  bulletColor: '#07c160',            // 列表序号/圆点颜色
  hrColor: '#f0f0f0',                // 分割线颜色
  imageSkeletonColor: '#f1f5f9'      // 图片骨架屏占位底色
};
```

---

## 🧪 自动化测试验证

项目核心解析层保持 100% 的健壮性，执行以下命令运行测试集：

```bash
npm test
```

41 项核心测试覆盖了：
- 微信公众号真实文章高保真排版还原
- 尺寸 rem 换算与 1px 发丝边框保护
- LRU 缓存命中与失效策略
- 图片 CLS 尺寸与宽高比提取

---

## 📄 开源协议

本项目基于 [MIT](LICENSE) 协议开源。欢迎提交 Issue 与 Pull Request！

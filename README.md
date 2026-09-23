# Omni Rich Text (全能跨端富文本渲染引擎)

一款专为跨端生态打造的高性能富文本渲染库。**单包发布、无作用域**，通过子路径按需引入各端适配层：原生兼容 **Taro (React)**、**UniApp (Vue3)**、**React Native** 与 **微信原生小程序**。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Test](https://img.shields.io/badge/tests-30%20passed-brightgreen.svg)]()

---

## 🌟 核心特性

- **纯 TS 跨端内核**：`omni-rich-text/core` 无任何 DOM 与平台 API 依赖，解析极速且支持 SSR。
- **图片标签默认 100% 宽度自适应**：富文本中的 `<img>` 标签默认铺满容器宽度（`width: 100%`），同时完整支持作者自定义内联 `width` / `style` 覆盖。
- **字体全面采用 rem 响应式计算（无 rpx，不写死减少一半）**：
  - **rem 相对单位计算**：富文本内所有字号统一计算为 `rem`（默认基准 `1rem = 16px`），杜绝各端框架自动转 `rpx` 造成的排版变形失真；若原始内容包含 `rpx` 单位，也会自动换算为精确的 `rem`。
  - **不写死减少一半**：默认 `fontScale: 1` 维持 1:1 真实保真尺寸，杜绝硬编码折半。
  - **支持基准与缩放自由定制**：支持配置 `fontSize`（如 `'1rem'`、`'0.875rem'`、`16`）、`rootFontSize`（默认 `16`）与 `fontScale` 比例系数。
- **全面纯净模式（Zero-Default-Styles）**：组件不设任何强制性预置装饰样式（无强制内外边距、无预置背景与边框），样式 100% 完全由富文本内容本身（内联 `style` 与 `<style>` 规则）驱动，保证各端高度纯净与设计保真。
- **全节点事件接管**：彻底取代原生 `<rich-text>`，所有节点使用平台标准基元组件（View/Text/Image/Video）递归渲染，100% 支持点击拦截、长按选中与样式定制。
- **现代化子路径架构**：单个 npm 包（`omni-rich-text`），告别多包 monorepo 复杂版本管理，按需引入对应端的子路径。
- **Smart Link 智能路由调度**：
  - 自动识别页面内部路由（`navigateTo`）与 TabBar 路由（`switchTab`）。
  - 外部链接支持无缝承载至自定义 Webview 页面，或在小程序端自动唤起“复制链接至剪贴板”的优雅降级。
- **Image Context 画廊与骨架屏**：
  - 自动按文章顺序提取全文图片构建画廊列表（Gallery）。
  - 点击图片自动调起端原生 `previewImage`，抹平微信与支付宝（索引/参数命名）差异；H5 端内置高仿原生的大图滑动查看器（Lightbox）。
  - 内置图片宽高比（data-ratio）占位骨架屏与渐入淡入动画（Zero CLS）。
- **微信公众号高保真还原**：
  - 内置 `<style>` 标签选择器提取与内联。
  - SVG 图标自动序列化为 Data URI 图片呈现。
  - 适配微信公众号特有排版与卡片布局，自动过滤 mpvoice 等不支持标签。
- **灵活主题系统 (ThemeConfig)**：
  - 支持按需覆盖超链接颜色、引用块边框/背景/文字、代码块背景/文字、表格边框/表头底色、列表圆点序号、分割线颜色及图片骨架底色。
- **声明式自定义组件 (Custom Components)**：
  - 支持将特定标签（如 `<product-card>`、`<coupon-box>`）直接映射为您自定义编写的业务组件。
- **性能与安全保障**：
  - 内置基于有限状态机（FSM）的 XSS 攻击防护过滤。
  - AST 标签展平（Inline Flattening）与定深保护（Bounded Depth），杜绝小程序递归爆栈。
  - 支持超长文档分块渐进加载（Chunk Rendering），优化跨线程 `setData` / 虚拟 DOM 负载。
- **Markdown & 代码语法高亮**：
  - 原生支持 Markdown 格式直接解析输入。
  - 内置 Prism 语法着色，高亮关键词、字符串、注释等。

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

## 🚀 跨端子路径导入与使用示例

### 1. 在 Taro (React) 中使用 (`omni-rich-text/taro`)

```tsx
import React from 'react';
import { View } from '@tarojs/components';
import { UniversalRichText } from 'omni-rich-text/taro';

export default function ArticleDetail() {
  const htmlContent = `
    <h1>文章标题</h1>
    <p>这是一段包含 <a href="https://github.com">外部链接</a> 和图片的富文本：</p>
    <img src="https://picsum.photos/600/400" alt="示例图" />
    <blockquote>这是一个引用块</blockquote>
  `;

  return (
    <View style={{ padding: 16 }}>
      <UniversalRichText
        content={htmlContent}
        mode="wechat"
        imageSkeleton
        theme={{
          linkColor: '#1677ff',
          blockquoteBorderColor: '#07c160'
        }}
        webviewPath="/pages/webview/index"
        tabBarList={['/pages/index/index', '/pages/user/index']}
        onLinkTap={(ctx) => {
          console.log('点击了链接:', ctx.href);
        }}
        onImageTap={({ src, index }) => {
          console.log(`点击第 ${index + 1} 张图片:`, src);
        }}
      />
    </View>
  );
}
```

### 2. 在 UniApp (Vue3) 中使用 (`omni-rich-text/uni`)

```vue
<template>
  <view class="container">
    <UniversalRichText
      :content="markdownContent"
      format="markdown"
      mode="wechat"
      :image-skeleton="true"
      :theme="{ linkColor: '#07c160', codeBgColor: '#1e1e1e' }"
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

const markdownContent = ref(`
# Omni Rich Text
- 跨端支持：Taro / UniApp / React Native / 原生微信
- 性能优异，按需引入

[打开关于页](/pages/about/index)
`);

function handleLinkTap({ href }: { href: string }) {
  console.log('Link clicked:', href);
}

function handleImageTap({ src, index }: { src: string; index: number }) {
  console.log('Image clicked:', src, index);
}
</script>
```

### 3. 在 React Native 中使用 (`omni-rich-text/react-native` 或 `omni-rich-text/rn`)

```tsx
import React from 'react';
import { ScrollView } from 'react-native';
import { UniversalRichText } from 'omni-rich-text/react-native';

export default function NativeArticle() {
  const htmlContent = `
    <h2>React Native 富文本渲染</h2>
    <p>完美支持样式转换、代码块横向滚动以及图片骨架屏淡入效果。</p>
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
        onLinkTap={({ href }) => {
          console.log('Open URL:', href);
        }}
        onImageTap={({ src, index }) => {
          console.log('Preview image index:', index);
        }}
      />
    </ScrollView>
  );
}
```

### 4. 在 原生微信小程序 中使用 (`omni-rich-text/wechat`)

在页面配置 `index.json` 中引入组件：

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

在页面 `index.js` 中：

```js
Page({
  data: {
    htmlContent: '<p>欢迎使用原生微信小程序版 <a href="https://example.com">omni-rich-text</a></p>',
    themeConfig: {
      linkColor: '#07c160'
    }
  },
  onLinkTap(e) {
    console.log('Link tapped:', e.detail.href);
  },
  onImageTap(e) {
    console.log('Image tapped:', e.detail.src);
  }
});
```

### 5. 纯核心解析引擎 (`omni-rich-text/core` 或 `omni-rich-text`)

如果您仅需要将富文本解析为优化的 AST 树，无需任何 UI 组件：

```ts
import { parseRichContent, chunkAST } from 'omni-rich-text/core';

const { ast, galleryList } = parseRichContent('<p>Hello <strong>World</strong></p>', {
  mode: 'wechat',
  extractStyles: true
});

console.log(ast); // 结构化 AST 节点列表
console.log(galleryList); // 提取的图片 URL 列表
```

---

## 🎨 主题定制 (ThemeConfig)

通过 `theme` 属性可自由定制所有语义元素的色彩（所有属性均可选，未设置则使用开箱即用的优质默认值）：

```ts
const customTheme = {
  /** 超链接 <a> 文字色（默认: #576b95 微信蓝） */
  linkColor: '#1677ff',

  /** 引用块 <blockquote> 左边框颜色（默认: #dcdfe6） */
  blockquoteBorderColor: '#07c160',
  /** 引用块背景色（默认: #f7f7f7） */
  blockquoteBgColor: '#f0fdf4',
  /** 引用块文字颜色（默认: rgba(0,0,0,0.55)） */
  blockquoteTextColor: '#374151',

  /** 代码块 <pre><code> 背景色（默认: #282c34） */
  codeBgColor: '#1e1e1e',
  /** 代码块文字颜色（默认: #abb2bf） */
  codeTextColor: '#d4d4d4',

  /** 表格 <table> 单元格边框颜色（默认: #e7e7e7） */
  tableBorderColor: '#e5e7eb',
  /** 表头 <th> 背景色（默认: #f8f8f8） */
  tableHeaderBgColor: '#f9fafb',

  /** 列表 <li> 圆点/序号颜色（默认: #666666） */
  bulletColor: '#07c160',

  /** 分割线 <hr> 颜色（默认: #e7e7e7） */
  hrColor: '#f0f0f0',

  /** 图片骨架屏占位背景色（默认: #f1f5f9） */
  imageSkeletonColor: '#e2e8f0'
};
```

---

## ⚙️ 属性与事件配置参考

| 属性名 | 类型 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- |
| `content` | `string` | **必填** | 富文本内容（HTML 或 Markdown 字符串） |
| `format` | `'html' \| 'markdown'` | `'html'` | 内容格式 |
| `fontSize` | `number \| string` | `'1rem'` | 外层容器基准字号，如 `'1rem'`、`'0.875rem'`、`16`、`'16px'` |
| `rootFontSize` | `number` | `16` | 用于 rem 相对计算的根字号基准（px）。默认 16（1rem = 16px） |
| `fontScale` | `number` | `1` | 字体缩放系数。默认 1（不写死减少一半，保持 1:1 标准尺寸） |
| `theme` | `ThemeConfig` | `{}` | 细粒度主题颜色控制 |
| `imageSkeleton`| `boolean` | `true` | 是否启用图片骨架屏与淡入动画（根据 data-ratio 零抖动占位） |
| `chunked` | `boolean` | `true` | 是否启用超长文章分片渐进式流式渲染 |
| `chunkSize` | `number` | `15` | 每批分片渲染的根节点数量 |
| `maxDepth` | `number` | `8` (wechat模式下12) | 最大递归嵌套深度，超过自动执行标签剪枝展平 |
| `selectable` | `boolean` | `false` | 是否允许文本选中复制（默认关闭，保证原生排版防误触体验） |
| `webviewPath`| `string` | `undefined` | 小程序端用于承载外部链接的 webview 页面路由 |
| `tabBarList` | `string[]` | `[]` | 小程序的 TabBar 页面路由列表，用于自动切换 `switchTab` |
| `components` | `Record<string, Component>` | `undefined` | 声明式自定义组件映射表，如 `{ 'product-card': ProductCard }` |
| `customRender`| `(node: ASTNode) => ReactNode` | `undefined` | 针对特定节点返回自定义渲染结果的拦截 Hook |
| `onLinkTap` / `@link-tap` | `Function` | - | 链接点击拦截器，返回 `false` 可阻止默认跳转行为 |
| `onImageTap` / `@image-tap` | `Function` | - | 图片点击回调事件，携带当前图 URL 与画廊全局索引 |
| `onMediaEvent` / `@media-event`| `Function` | - | 音视频播放、暂停、结束等媒体事件回调 |

---

## 📁 目录规范说明

```
omni-rich-text/
├── src/
│   ├── core/           # 框架无关 AST 解析、清洗、样式内联与工具
│   │   ├── tests/      # 核心单元测试集
│   │   └── ...
│   ├── taro/           # Taro 3 (React) 适配层
│   ├── uni/            # UniApp (Vue 3) 适配层
│   ├── react-native/   # React Native 适配层
│   └── wechat/         # 原生微信小程序组件产物
├── examples/
│   └── demo/           # Taro 小程序与 H5 体验示例
├── package.json        # 单包 package.json 配置与 exports 声明
├── tsconfig.json       # 根 TypeScript 路径映射配置
└── README.md
```

---

## 🧪 自动化测试验证

运行核心解析与渲染引擎全量测试用例：

```bash
npm test
```

---

## 📄 License

[MIT](LICENSE)

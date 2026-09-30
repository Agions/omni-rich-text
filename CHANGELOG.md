# Changelog

All notable changes to `omni-rich-text` will be documented in this file.

---

## [0.1.7] - 2026-09-30

### 🎠 微信公众号 SVG 轮播图智能映射与 SVG 源码双模展示（SVG Carousel & Code Block Architecture）

- **🎠 SVG 轮播图智能识别与原生 `<Swiper>` 映射**
  - **公众号黑科技 SVG 轮播识别**：智能检测包含多帧 `<image>`、`<svg>` 或水平滚动的 SVG 轮播图结构（经典微信/第三方编辑器黑科技横滑组件）。
  - **原生 `<Swiper>` 平滑交互渲染**：在小程序端自动将多帧 SVG 降级并映射为原生 `<Swiper>` 组件，支持流畅滑动手势、自适应几何高宽比、现代半透明分页指示点（Dots）。
  - **手势画廊联动与链接跳转**：提取轮播图中各帧图片的 `xlink:href` / `href`，自动将其纳入文章全局手势画廊（`galleryList`），点击轮播图帧即可直接全屏手势放大预览，同时无缝支持外链拦截与跳转。
  - **React Native 端平滑横滑支持**：在 RN 端自动映射为带有分页指示的水平滑动组件（`ScrollView horizontal pagingEnabled`）。

- **💻 SVG 格式代码块语法高亮、一键复制与双模预览**
  - **代码块排版保护与格式还原**：杜绝 `<pre><code>` 内展示的 SVG 源码被误当做矢量图形解析渲染破坏代码排版，完美兼容未转义 `<svg>` 与转义字符。
  - **XML / SVG 语法着色增强**：Prism 语法高亮引擎全面支持 XML / SVG 语法（标签名、属性名、属性值、注释、实体）。
  - **双模预览切换与一键复制代码**：代码块头部提供清晰的 `🎨 XML / SVG` 语言标识、一键「📋 复制代码」按钮，以及针对可渲染 SVG 代码提供「👁️ 预览 / 💻 源码」实时双模切换小开关。

- **🧪 自动化测试与 Demo 演练场**
  - 新增专用单元测试文件 `svg-carousel-code.test.ts`（8项测试），测试集总数达到 **100 项核心单元测试，100% 保持通过**。
  - Demo 自定义源码演练场新增「🎠 SVG 交互轮播图」与「💻 SVG 源码双模展示」预设模版。

---

## [0.1.6] - 2026-09-30

### 🎨 秀米与 135 编辑器 100% 深度排版还原支持（Xiumi & 135 Editor Full Fidelity）

- **🖼️ SVG ForeignObject 原生穿透与矢量底板双层渲染**
  - **杜绝 SVG 内嵌 HTML 白屏/丢失**：全面支持 `<foreignObject>` 标签与复杂内嵌 DOM。针对 135 / 秀米编辑器常用的“SVG 矢量边框/背景 + `<foreignObject>` 富文本”复合卡片，自动将底层矢量图层与上层 HTML 交互内容解耦，上层 DOM 以原生组件全功能呈现（文字可选、链接可点、样式 1:1），告别小程序端图片化白屏缺陷。
  - **SVG 矢量自然比例保真**：自动提取 `viewBox` 几何比例（`vbRatio`），在缺少显式 `height` 时注入自适应宽高比（`aspectRatio`）与 `preserveAspectRatio="xMidYMid meet"`，杜绝横幅 Banner 矢量图高度塌陷。
  - **SVG 严格规范大小写还原**：在 XML 序列化中完整恢复 `viewBox`、`preserveAspectRatio`、`gradientUnits`、`gradientTransform`、`clipPathUnits`、`patternUnits` 等驼峰属性，彻底消除跨平台 XML 解析异常。

- **🛡️ 状态机样式分词器（防分号截断 Data URI）**
  - 重构 `parseStyleString` 为状态机解析器，严格感知单引号 `'...'`、双引号 `"..."` 及括号闭合层级 `url(...)`、`calc(...)`、`linear-gradient(...)`。
  - 彻底解决秀米/135 在 `background-image` 中内联带分号的 SVG Data URI 或 Base64 纹理背景时被错误截断丢失样式的核心顽疾。

- **📐 不对称 Flex 布局保护与属性优先级保真**
  - 严格区分“纯多图等分画廊”与“不对称图文卡片”（如 56px 头像 + `flex: 1` 介绍、图标 + 标题、30% + 70% 比例分栏）。仅在所有列均为图片的对称画廊中执行均分均衡；针对不对称卡片 100% 保持作者原著尺寸与 `flex` 规则，坚决杜绝头像被挤压拉伸为 50% 畸形。
  - 增强 `isIconImage` 识别机制，支持 `rem` 换算回像素感知（80px 以内小图、行内徽章、emoji 表情自动保留原始宽高，不被强制放大撑满 100%）。

- **🔤 秀米积木分栏 `font-size: 0` 缝隙消除保护**
  - 修复 `font-size: 0` 在基准字号映射中被错误抬升为 `8px` 的问题，确保用于消除两列 `inline-block` 间隙的 `font-size: 0` 原始呈现，彻底杜绝秀米经典两列并排（49% + 49%）换行掉列问题。

- **🌲 智能剪枝边界加固（保护外层居中容器与垂直留白）**
  - `isUnwrappableWrapper` 智能识别 `text-align: center` 居中上下文与 `xmtpl`、`135editor`、`layout` 等编辑器专属模板类名及 `data-tools` 属性，坚决不解构包裹容器，确保内层徽章居中视觉效果稳固。
  - `hasVisualStyles` 智能识别非零 `margin-top` / `margin-bottom` 占位块，杜绝作者设计的垂直呼吸间距被误剪。

- **📱 Demo 交互升级与全套专项测试验证**
  - Demo 新增「🎨 秀米135」专属演示 Tab，内置 SVG 穿透卡片、双栏积木、叠层贴纸、不对称人物介绍卡与矢量波点纹理 5 大经典实战案例。
  - 新增 `xiumi-135.test.ts` 专项单测套件（9 项单测），全量 **92 项单测 100% 全部通过**。

---

## [0.1.5] - 2026-09-30

### ✂️ 富文本排版裁剪体系：容器限高展开、AST 摘要截断与图片比例裁剪（Layout Clamping & Media Crop）

- **🪟 容器级高度截断与“展开 / 收起”交互体系**
  - **优雅限高与渐变蒙层**：新增 `clampMaxHeight`（如 `210` 或 `'210px'`）属性。超出指定高度时自动触发底部平滑渐变半透明遮罩（Fade Gradient Mask），中间居中悬浮极简胶囊按钮。
  - **智能高度检测与无缝收缩**：内置 `Taro.createSelectorQuery()` 动态测量。内容未超出阈值时自然平铺，不展示多余遮罩；展开后支持显示 `收起` 按钮或通过 `showCollapse={false}` 展开后隐藏操作区。
  - **自定义交互文案与事件**：支持 `expandText`（默认 `'展开全文'`）、`collapseText`（默认 `'收起'`）及 `onExpandChange` 状态变更通知。

- **🌲 AST 逻辑层安全字数截断与摘要提炼 (`truncator.ts`)**
  - **100% 标签闭合安全保证**：新增 `truncateAST` 与 `truncateRichContent`，并在 `ParseOptions` 中集成 `truncate?: TruncateOptions`（组件层支持 `truncateLength={90}` 简写）。
  - **零非法孤儿标签**：在任意深层标签内切断正文时，自动补全关闭所有父级 HTML 标签，保证 AST 树结构绝对合法。
  - **多媒体保留开关**：`preserveMedia?: boolean`（默认 `true` 保留范围内的图片与视频，适合图文卡片摘要；`false` 纯净过滤多媒体生成纯文本摘要）。
  - **智能省略号挂载**：支持 `ellipsis?: string`（默认 `'...'`），智能拼接在最后一个截断的文本节点末尾。

- **🖼️ 图片多媒体智能裁剪与圆角防刺穿（Border-Radius Shielding）**
  - **固定比例裁剪**：新增 `imageCropRatio`（如 `16 / 9`、`4 / 3`、`1`）与 `imageCropMode`（`'aspectFill'` / `'widthFix'`），自动将图片约束为目标比例并居中裁剪填充（`object-fit: cover`），完美适配信创卡片与图文瀑布流。
  - **圆角防刺穿安全裁剪**：样式解析器智能感知带 `border-radius` 的容器，自动补充 `overflow: hidden;`，彻底杜绝内部直角图片或渐变背景刺穿外层圆角。

- **📱 Demo 交互体验升级**
  - Demo 新增「✂️ 截断裁剪」专属演示 Tab，提供 `限高展开 (210px)`、`AST 摘要 (90字)` 与 `16:9 裁剪` 3 组实时交互对比。

- **🧪 专项测试覆盖**
  - 新增 `truncate.test.ts` 专项单测套件（8 项测试）。
  - 全套核心单测增至 83 项，通过率 100%。

---

## [0.1.4] - 2026-09-30

### ⚡ AST 无损智能剪枝瘦身 & 加权自适应切片分批（Extreme Performance & AST Pruning）

- **智能无损剪枝瘦身引擎 (`tree-pruner.ts`)**
  - **空标签清理 (`removeEmpty`)**：安全移除无实际内容且无盒模型样式的死标签（如编辑器残留的空白 `<span></span>`、`<p></p>`、`<div></div>`）。严守视觉安全底线，保留 `<img>`、`<video>`、`<audio>`、`<hr>`、`<br>`、`<svg>` 及具备背景色、边框、宽高、内边距、投影或锚点 ID 的占位块。
  - **连续空白留白段落智能折叠 (`foldEmptyParagraphs`)**：针对富文本编辑器频繁连续敲击回车产生的多个连续空白行（如连续 5~10 个 `<p><br></p>` 或 `<p>&nbsp;</p>`），智能折叠保留恰好 1 个呼吸留白行，大幅削减 70%+ 的空白冗余 DOM 节点与 Fiber 实例。
  - **无样式单子级容器脱壳透传 (`unwrapSingleChild`)**：针对第三方排版编辑器（如 135、秀米等）产生的层层冗余包裹容器（如 `<div><div><section>...</section></div></div>`），在确认无 ID、无边框/背景/内边距/外边距及无 Flex 布局属性的前提下自动脱壳透传，将 AST 树层级深度削减 50% 以上，从根本上防止小程序递归模板栈溢出。
  - **灵活可控**：`ParseOptions` 新增 `prune?: boolean | PruneOptions` 配置项，默认全量开启（`true`），亦可按需定制或完全关闭。

- **加权自适应切片分批渲染 (`chunker.ts`)**
  - **首屏秒开与流式平滑预算**：首屏分配较小权重预算（`initialWeight: 35`）确保瞬间完成初次渲染上屏；后续批次分配流式预算（`chunkWeight: 80`）平滑分批写入 setData，消除大型根节点引起的阻塞掉帧。
  - **递归子树加权评估**：普通节点与文本权重计为 1；高渲染开销节点（`img`、`video`、`svg`、`table`、`pre`、`code`、`canvas` 等）权重计为 3，并递归汇总整棵子树复杂度。
  - **全面向后兼容**：保留对历史 `chunkSize` 选项的无缝支持。

- **专项单元测试与全套验证**
  - 新增 `prune.test.ts` 专项单测套件（8 项测试）。
  - 新增 `chunker.test.ts` 专项单测套件（5 项测试）。
  - 核心单测增至 75 项，通过率 100%。

---

## [0.1.3] - 2026-09-29

### 🎯 Native Display Semantics & Flex Container Layout Fidelity

- **原生语义标签属性继承与 Display 精准还原**
  - **默认展示行为回归原生 HTML 规范**：无明确内联 `display` 样式要求时，严格遵循标签原生属性展示。例如 `<span>`、`<strong>`、`<b>`、`<em>`、`<i>` 等行内标签默认保持行内流式布局（`inline` / `inline-block`），绝不强制渲染为块级标签（`block`），彻底杜绝行内文本与徽章被错误拆行、独占整行的问题。
  - **Flexbox 弹性盒父级上下文感知与 Blockified 规范实现**：
    - 全面支持父级容器 `display: flex` / `inline-flex`（包括 `-webkit-flex`、`-webkit-box`）上下文感知与自顶向下流转。
    - 依据 W3C CSS Flexible Box Layout 规范，弹性容器内部的子元素自动作为弹性项（Flex Item），在小程序与跨端渲染层中以 Flex Item `<View>` 容器挂载，完美支持 `flex: 1`、`align-self`、弹性对齐与尺寸响应，避免因作为纯 `<Text>` 导致 Flex 布局失效。
    - 当弹性容器中的子标签为行内标签时，内部文本继续保持行内渲染，而外层无缝参与父级 Flex 布局排版。
  - **跨平台渲染层全面对齐**：
    - **Taro**：`NodeRenderer` 新增 `parentIsFlex` 上下文传递与行内/块级 display 自适应兜底。
    - **UniApp**：`UniNodeRenderer.vue` 统一 `parentIsFlex` 属性及 `:style` 计算规则。
    - **React Native**：`RnNodeRenderer.tsx` 动态适配 Flex Item 与行内对齐。
    - **微信原生小程序**：`omni-node` 组件支持 `parentIsFlex` 传递与 `display: inline-block` 原生 WXSS 类支持。
  - **测试覆盖**：
    - 新增 `display-flex.test.ts` 专项单测套件，全量单测通过率 100%（62 项测试全部通过）。

---

## [0.1.2] - 2026-09-28

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

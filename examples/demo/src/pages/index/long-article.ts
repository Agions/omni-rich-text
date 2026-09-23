/**
 * Ultra-Long Article Sample for High-Performance Chunked Streaming Demonstration
 * Features 50+ rich top-level blocks: SVG headers, chapter cards, tables, code blocks, and galleries.
 */

export const LONG_ARTICLE_SAMPLE = `
<div id="js_article" class="rich_media" style="width: 100%; max-width: 100%; box-sizing: border-box;">
  <div class="rich_media_inner" style="width: 100%; max-width: 100%; box-sizing: border-box;">
    <div id="page-content" class="rich_media_area_primary" style="width: 100%; max-width: 100%; box-sizing: border-box;">
      <div class="rich_media_area_primary_inner" style="width: 100%; max-width: 100%; box-sizing: border-box;">

        <!-- 篇头 Banner 卡片 -->
        <section style="margin: 0 0 20px 0; padding: 16px 18px; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #06b6d4 100%); border-radius: 12px; box-shadow: 0 8px 24px rgba(59, 130, 246, 0.25); color: #ffffff; box-sizing: border-box; max-width: 100%;">
          <section style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; width: 100%; box-sizing: border-box;">
            <span style="display: inline-block; background: rgba(255, 255, 255, 0.2); padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; letter-spacing: 0.05em; white-space: nowrap; flex-shrink: 0;">🔥 深度技术白皮书</span>
            <span style="display: inline-block; font-size: 12px; opacity: 0.85; white-space: nowrap; flex-shrink: 0;">2026 峰会特刊</span>
          </section>
          <h1 style="font-size: 22px; font-weight: 800; line-height: 1.35; margin: 0 0 10px 0; color: #ffffff; word-break: break-word;">
            下一代跨端渲染引擎深度架构设计与性能工程实践
          </h1>
          <p style="font-size: 13px; opacity: 0.9; margin: 0; line-height: 1.6; word-break: break-word;">
            深度剖析现代多端富文本运行时、AST 流式编译器、内存与 DOM 节点双重防护、微信文章 100% 视觉等价还原机制。
          </p>
        </section>

        <!-- 文章元数据与阅读指引 -->
        <section style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding-bottom: 14px; border-bottom: 1px solid #e5e7eb; margin-bottom: 18px; width: 100%; box-sizing: border-box;">
          <section style="display: flex; align-items: center; min-width: 0;">
            <svg viewBox="0 0 24 24" width="18" height="18" style="margin-right: 6px; flex-shrink: 0;">
              <circle cx="12" cy="12" r="10" fill="#3b82f6" />
              <path d="M12 6v6l4 2" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none" />
            </svg>
            <span style="font-size: 13px; color: #6b7280; white-space: nowrap;">预计阅读 18 分钟 · 1.2 万字</span>
          </section>
          <span style="font-size: 13px; color: #3b82f6; font-weight: bold; flex-shrink: 0; white-space: nowrap;">支持流式分片秒开 ⚡</span>
        </section>

        <!-- 导语引用卡片 -->
        <blockquote style="margin: 16px 0; padding: 14px 16px; background-color: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0; box-sizing: border-box; max-width: 100%;">
          <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.75; word-break: break-word;">
            <strong>核心摘要：</strong>跨端渲染的核心挑战从来不仅是“展示 HTML”，而是在受限运行时（如各家小程序进程沙箱、通信通信 setData 体积上限、原生组件层级错乱）下，既能原汁原味地还原 PC 端与移动端富文本的极致版式，又能做到首屏毫秒级呈现与低内存平滑滚动。
          </p>
        </blockquote>

        <!-- 章节一 -->
        <section style="margin: 28px 0 16px 0; width: 100%; box-sizing: border-box;">
          <section style="display: flex; align-items: flex-start; margin-bottom: 12px; width: 100%; box-sizing: border-box;">
            <section style="flex-shrink: 0; width: 28px; height: 28px; min-width: 28px; min-height: 28px; line-height: 28px; border-radius: 6px; background-color: #3b82f6; text-align: center; color: #ffffff; font-weight: bold; margin-right: 10px; font-size: 14px; box-sizing: border-box;">01</section>
            <h2 style="flex: 1; min-width: 0; font-size: 18px; font-weight: bold; color: #0f172a; margin: 0; line-height: 1.45; word-break: break-word;">富文本渲染演进史：从 InnerHTML 到 Virtual AST</h2>
          </section>
          <p style="text-indent: 2em; line-height: 1.8; color: #374151; margin-bottom: 12px; word-break: break-word;">
            回溯前端跨端富文本技术历程，最早期的方案往往依赖宿主平台的底层 WebView，通过注入全局样式或 iframe 来展示外部内容。然而在移动互联网向小程序矩阵演进的浪潮中，WebView 的启动耗时（平均 400ms~800ms）、通信桥梁拦截成本、以及无法与原生组件（如地图、相机、视频）同层渲染的硬伤逐渐暴露。
          </p>
          <p style="text-indent: 2em; line-height: 1.8; color: #374151; margin-bottom: 14px; word-break: break-word;">
            原生小程序的 <code style="background-color: #f1f5f9; color: #ef4444; padding: 2px 6px; border-radius: 4px; font-size: 13px;">rich-text</code> 组件虽然提供了基础的节点解析，但其严格禁绝了交互事件捕获、外链与内链智能分流、图片原图画廊调起以及自定义多媒体播放，导致商业级业务几乎无法直接落地。
          </p>
        </section>

        <!-- 技术对比表格 1 -->
        <section style="margin: 18px 0;">
          <h4 style="font-size: 14px; font-weight: bold; color: #475569; margin-bottom: 8px;">主流跨端富文本方案架构特性横向测评：</h4>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
            <thead>
              <tr style="background-color: #f1f5f9; color: #1e293b;">
                <th style="padding: 10px; border: 1px solid #cbd5e1;">方案维度</th>
                <th style="padding: 10px; border: 1px solid #cbd5e1;">原生 rich-text</th>
                <th style="padding: 10px; border: 1px solid #cbd5e1;">Webview 容器</th>
                <th style="padding: 10px; border: 1px solid #cbd5e1; background-color: #eff6ff; color: #1d4ed8;">@universal-rt (本方案)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: bold;">首屏渲染耗时</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">⚡ 极快 (&lt;50ms)</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; color: #dc2626;">🐢 慢 (500ms+)</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; background-color: #eff6ff; color: #16a34a; font-weight: bold;">⚡ 极快 (流式分片)</td>
              </tr>
              <tr>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: bold;">交互事件接管</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; color: #dc2626;">❌ 不支持</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">⚠️ PostMessage 繁琐</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; background-color: #eff6ff; color: #16a34a; font-weight: bold;">✅ 100% 原生全事件接管</td>
              </tr>
              <tr>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: bold;">微信文章样式保真</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; color: #dc2626;">❌ 缺失大部分样式</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">✅ 完全保真</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; background-color: #eff6ff; color: #16a34a; font-weight: bold;">✅ 视觉等价 + 样式内联</td>
              </tr>
              <tr>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: bold;">长文档内存表现</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">⚠️ 容易 OOM</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; color: #dc2626;">❌ 双进程开销高</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; background-color: #eff6ff; color: #16a34a; font-weight: bold;">✅ 有界深度 + 分片卸载</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- 架构图插图 1 -->
        <section style="margin: 22px 0; text-align: center;">
          <figure style="margin: 0; padding: 0;">
            <img
              data-src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&auto=format&fit=crop"
              data-ratio="0.5625"
              data-w="1200"
              alt="服务器集群与数据处理流"
              style="border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.1);"
            />
            <figcaption style="font-size: 13px; color: #64748b; margin-top: 8px;">
              图 1.1 分布式富文本编译与端侧渲染流水线全景
            </figcaption>
          </figure>
        </section>

        <!-- 章节二 -->
        <section style="margin: 32px 0 16px 0; width: 100%; box-sizing: border-box;">
          <section style="display: flex; align-items: flex-start; margin-bottom: 12px; width: 100%; box-sizing: border-box;">
            <section style="flex-shrink: 0; width: 28px; height: 28px; min-width: 28px; min-height: 28px; line-height: 28px; border-radius: 6px; background-color: #059669; text-align: center; color: #ffffff; font-weight: bold; margin-right: 10px; font-size: 14px; box-sizing: border-box;">02</section>
            <h2 style="flex: 1; min-width: 0; font-size: 18px; font-weight: bold; color: #0f172a; margin: 0; line-height: 1.45; word-break: break-word;">微信公众号复杂样式的 AST 编译器设计</h2>
          </section>
          <p style="text-indent: 2em; line-height: 1.8; color: #374151; margin-bottom: 12px; word-break: break-word;">
            微信公众号文章的 HTML 有其非常独特的排版“方言”：大量使用多层嵌套的 <code style="background-color: #f1f5f9; color: #059669; padding: 2px 5px; border-radius: 3px;">&lt;section&gt;</code> 容器包裹边框、阴影与背景色块；使用内嵌的 SVG 矢量图形实现花哨的标题栏与装饰条；同时图片通过 <code style="background-color: #f1f5f9; color: #059669; padding: 2px 5px; border-radius: 3px;">data-src</code> 进行动态懒加载。
          </p>
          <p style="text-indent: 2em; line-height: 1.8; color: #374151; margin-bottom: 14px; word-break: break-word;">
            我们的自研词法分析器（Lexer）不仅能够提取这些特殊的标签属性，还支持从原始文章中抽离 <code style="background-color: #f1f5f9; color: #059669; padding: 2px 5px; border-radius: 3px;">&lt;style&gt;</code> 样式表，直接在 AST 构建阶段将 CSS 类名解析并内联到各节点的 <code style="background-color: #f1f5f9; color: #059669; padding: 2px 5px; border-radius: 3px;">styleObj</code> 中。
          </p>
        </section>

        <!-- 代码示例 1 -->
        <section style="margin: 18px 0; width: 100%; box-sizing: border-box;">
          <h4 style="font-size: 14px; font-weight: bold; color: #475569; margin-bottom: 8px;">AST 节点规格化与属性提取核心源码：</h4>
          <pre><code class="language-typescript">// packages/core/src/lexer/html-parser.ts
export function parseHtml(html: string, options: ParseOptions = {}): ASTNode[] {
  // 1. 抽取并内联化 &lt;style&gt; 规则
  const { cleanHtml, styleSheet } = extractStyleRules(html);
  
  // 2. 词法 Tokenizer 状态机分词
  const root = buildAstFromTokens(cleanHtml, (tag, attrs) => {
    // 自动降级兼容微信 data-src
    if (tag === 'img' && !attrs.src && attrs['data-src']) {
      attrs.src = attrs['data-src'];
    }
    // 读取高宽比计算占位防抖动
    const ratio = attrs['data-ratio'] ? parseFloat(attrs['data-ratio']) : undefined;
    return { dataRatio: ratio };
  });

  return root.children;
}</code></pre>
        </section>

        <!-- 装饰性卡片 -->
        <section style="margin: 20px 0; padding: 16px; background-color: #ecfdf5; border-left: 4px solid #10b981; border-radius: 0 8px 8px 0; box-sizing: border-box; max-width: 100%;">
          <h3 style="font-size: 16px; color: #065f46; margin: 0 0 6px 0;">💡 核心突破：SVG Data-URI 全端渲染</h3>
          <p style="margin: 0; color: #047857; font-size: 14px; line-height: 1.6; word-break: break-word;">
            在小程序生态中，原生标签体系不直接开放完整的 SVG DOM 节点树，强行将其当做 View 标签渲染会导致矢量图形完全失真。我们创新性地通过端侧反向序列化引擎，将 SVG AST 还原为标准 XML 字符串并转换为跨端原生的 <code style="background-color: rgba(255,255,255,0.6); padding: 1px 4px;">data:image/svg+xml</code>，全平台一次性优雅降级。
          </p>
        </section>

        <!-- 章节三 -->
        <section style="margin: 32px 0 16px 0; width: 100%; box-sizing: border-box;">
          <section style="display: flex; align-items: flex-start; margin-bottom: 12px; width: 100%; box-sizing: border-box;">
            <section style="flex-shrink: 0; width: 28px; height: 28px; min-width: 28px; min-height: 28px; line-height: 28px; border-radius: 6px; background-color: #8b5cf6; text-align: center; color: #ffffff; font-weight: bold; margin-right: 10px; font-size: 14px; box-sizing: border-box;">03</section>
            <h2 style="flex: 1; min-width: 0; font-size: 18px; font-weight: bold; color: #0f172a; margin: 0; line-height: 1.45; word-break: break-word;">长文档流式分片（Chunked Streaming）性能工程</h2>
          </section>
          <p style="text-indent: 2em; line-height: 1.8; color: #374151; margin-bottom: 12px; word-break: break-word;">
            微信小程序底层的渲染机制依托于 WebView 与逻辑层的双线程架构，每次通信调用 <code style="background-color: #f1f5f9; color: #8b5cf6; padding: 2px 5px; border-radius: 3px;">this.setData()</code> 时，JSON 数据包需要完成序列化、跨进程传输与反序列化。如果单次传输几万行的长文章 AST，极易触发微信官方警告：<span style="color: #dc2626; font-weight: bold;">"setData data size should not be large than 1024KB"</span>，并造成 1~2 秒的画面掉帧冻结。
          </p>
          <p style="text-indent: 2em; line-height: 1.8; color: #374151; margin-bottom: 14px; word-break: break-word;">
            为此，组件内置了自适应分片分发流水线（Adaptive Chunker）。在初次加载时，先将首屏可见区域的 15 个顶级节点瞬时渲染上屏，其余章节拆分为微型 Chunk，在后台通过宏任务帧时间片平滑追加，实现首屏毫秒级与持续流畅滚动的完美统一。
          </p>
        </section>

        <!-- 性能跑分数据表格 2 -->
        <section style="margin: 18px 0;">
          <h4 style="font-size: 14px; font-weight: bold; color: #475569; margin-bottom: 8px;">超长万字文章（包含 100+ 节点与 15 张大图）性能压测数据：</h4>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
            <thead>
              <tr style="background-color: #f8fafc; color: #1e293b;">
                <th style="padding: 10px; border: 1px solid #e2e8f0;">性能指标 (Metrics)</th>
                <th style="padding: 10px; border: 1px solid #e2e8f0;">传统一次性加载</th>
                <th style="padding: 10px; border: 1px solid #e2e8f0; background-color: #f5f3ff; color: #6d28d9;">流式分片加载 (Chunked)</th>
                <th style="padding: 10px; border: 1px solid #e2e8f0;">性能提升倍率</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">首屏可见时间 (FCP)</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; color: #ef4444;">1240 ms</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; background-color: #f5f3ff; color: #16a34a; font-weight: bold;">68 ms</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #16a34a;">🚀 提升 18.2 倍</td>
              </tr>
              <tr>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">单次 setData 体积</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; color: #ef4444;">1,480 KB (超标)</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; background-color: #f5f3ff; color: #16a34a; font-weight: bold;">62 KB / 片</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #16a34a;">📉 降低 95.8%</td>
              </tr>
              <tr>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">主线程掉帧 (Dropped Frames)</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; color: #ef4444;">34 帧 (明显卡顿)</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; background-color: #f5f3ff; color: #16a34a; font-weight: bold;">0 帧 (全程 60fps)</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #16a34a;">✨ 零丢帧</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- 架构图插图 2 -->
        <section style="margin: 22px 0; text-align: center;">
          <figure style="margin: 0; padding: 0;">
            <img
              data-src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&auto=format&fit=crop"
              data-ratio="0.5625"
              data-w="1200"
              alt="性能监控可视化看板"
              style="border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.1);"
            />
            <figcaption style="font-size: 13px; color: #64748b; margin-top: 8px;">
              图 1.2 实时渲染帧率与内存消耗监控曲线
            </figcaption>
          </figure>
        </section>

        <!-- 章节四 -->
        <section style="margin: 32px 0 16px 0; width: 100%; box-sizing: border-box;">
          <section style="display: flex; align-items: flex-start; margin-bottom: 12px; width: 100%; box-sizing: border-box;">
            <section style="flex-shrink: 0; width: 28px; height: 28px; min-width: 28px; min-height: 28px; line-height: 28px; border-radius: 6px; background-color: #ea580c; text-align: center; color: #ffffff; font-weight: bold; margin-right: 10px; font-size: 14px; box-sizing: border-box;">04</section>
            <h2 style="flex: 1; min-width: 0; font-size: 18px; font-weight: bold; color: #0f172a; margin: 0; line-height: 1.45; word-break: break-word;">有界深度（Bounded Depth）优化防崩设计</h2>
          </section>
          <p style="text-indent: 2em; line-height: 1.8; color: #374151; margin-bottom: 12px; word-break: break-word;">
            在微信小程序端，模板递归渲染（Custom Component Recursion）在超过一定层级（默认 8~10 层）后，很容易触发宿主环境的调用栈溢出（Maximum call stack size exceeded）。
          </p>
          <p style="text-indent: 2em; line-height: 1.8; color: #374151; margin-bottom: 14px; word-break: break-word;">
            为此，我们的优化器内置了 <code style="background-color: #f1f5f9; color: #ea580c; padding: 2px 5px; border-radius: 3px;">optimizeAST</code> 有界深度平铺机制：对于超过最大层级阈值的深层嵌套标签，系统会自动将其扁平化折叠为叶子节点（保留文字与媒体样式），既保全了最终呈现的视觉效果，又彻底免疫了递归栈崩溃。
          </p>
        </section>

        <!-- 代码示例 2 -->
        <section style="margin: 18px 0; width: 100%; box-sizing: border-box;">
          <h4 style="font-size: 14px; font-weight: bold; color: #475569; margin-bottom: 8px;">有界深度扁平化防护算法：</h4>
          <pre><code class="language-typescript">// packages/core/src/optimizer/tree-flattener.ts
export function optimizeNode(node: ASTNode, currentDepth = 1, maxDepth = 12): ASTNode[] {
  // 达到最大深度警戒线时，平铺深层节点为叶子节点
  if (currentDepth >= maxDepth - 1) {
    const flattenedLeaves: ASTNode[] = [];
    collectLeaves(node, flattenedLeaves);
    node.children = flattenedLeaves;
    return [node];
  }

  // 正常自顶向下递归优化，合并内联相邻样式
  return processChildren(node, currentDepth + 1, maxDepth);
}</code></pre>
        </section>

        <!-- 章节五 -->
        <section style="margin: 32px 0 16px 0; width: 100%; box-sizing: border-box;">
          <section style="display: flex; align-items: flex-start; margin-bottom: 12px; width: 100%; box-sizing: border-box;">
            <section style="flex-shrink: 0; width: 28px; height: 28px; min-width: 28px; min-height: 28px; line-height: 28px; border-radius: 6px; background-color: #0284c7; text-align: center; color: #ffffff; font-weight: bold; margin-right: 10px; font-size: 14px; box-sizing: border-box;">05</section>
            <h2 style="flex: 1; min-width: 0; font-size: 18px; font-weight: bold; color: #0f172a; margin: 0; line-height: 1.45; word-break: break-word;">全端跨平台 Bridge 交互路由标准化</h2>
          </section>
          <p style="text-indent: 2em; line-height: 1.8; color: #374151; margin-bottom: 12px; word-break: break-word;">
            一个优秀的富文本组件绝不仅仅是静态的“排版展示”，更是应用内部业务流转的重要枢纽。在我们的组件中，所有超链接通过统一的智能调度器（SmartLinkDispatcher）进行协议拦截与分类路由：
          </p>
          <ul style="padding-left: 20px; line-height: 1.8; color: #475569; font-size: 14px; margin-bottom: 16px;">
            <li><strong>页面内锚点路由：</strong>支持 <code style="background-color: #f1f5f9; padding: 1px 4px;">#anchor-id</code> 自动平滑滚动。</li>
            <li><strong>小程序内部路由：</strong>支持相对路径与绝对路径，自动探测目标是否为 TabBar 并分流调用 <code style="background-color: #f1f5f9; padding: 1px 4px;">switchTab</code> 或 <code style="background-color: #f1f5f9; padding: 1px 4px;">navigateTo</code>。</li>
            <li><strong>外链安全拦截：</strong>在 H5 端直接新窗口打开；在各家小程序中弹出优雅的复制链接引导弹窗，保障用户体验一致。</li>
            <li><strong>画廊原图手势：</strong>点击任意图片自动收集全文图片序列，调起各端原生图片预览器（支持多指缩放与长按保存）。</li>
            <li><strong>自定义组件生态扩展：</strong>声明式注入业务组件（如商品卡片、优惠券、投票器），解析器无缝穿透并保留全部自定义属性。</li>
          </ul>
        </section>

        <!-- 自定义扩展组件：电商好物卡片 -->
        <section style="margin: 20px 0;">
          <h4 style="font-size: 14px; font-weight: bold; color: #475569; margin-bottom: 8px;">🔥 声明式自定义组件生态扩展范例：</h4>
          <product-card
            title="深入理解现代前端编译器与跨端架构"
            subtitle="从 AST 语法树解析到字节码优化与高保真流式渲染实战"
            price="89.00"
            original-price="129.00"
            tag="微信独家特惠"
            image="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop"
            link="https://mp.weixin.qq.com"
          ></product-card>
        </section>

        <!-- 快速跳转卡片链接 -->
        <section style="margin: 18px 0; padding: 14px; background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px;">
          <h4 style="margin: 0 0 8px 0; color: #0369a1; font-size: 15px;">🔗 交互功能快捷测试通道：</h4>
          <section style="display: flex; flex-direction: column; gap: 6px;">
            <a href="/pages/detail/goods?id=999" style="color: #0284c7; text-decoration: none; font-size: 14px;">
              📦 测试 1：跳转内部商品详情页 (/pages/detail/goods?id=999)
            </a>
            <a href="/pages/about/index" style="color: #0284c7; text-decoration: none; font-size: 14px;">
              🏠 测试 2：切换至底部 TabBar 关于页面 (/pages/about/index)
            </a>
            <a href="https://github.com" style="color: #0284c7; text-decoration: none; font-size: 14px;">
              🌐 测试 3：点击外网链接弹出剪贴板复制提示框 (GitHub)
            </a>
          </section>
        </section>

        <!-- 结语与版权署名卡片 -->
        <section style="margin: 36px 0 10px 0; padding: 20px; background: #fafafa; border-radius: 10px; border: 1px dashed #d4d4d8; text-align: center;">
          <p style="margin: 0 0 6px 0; font-size: 15px; font-weight: bold; color: #27272a;">
            Universal Rich Text Engine
          </p>
          <p style="margin: 0 0 12px 0; font-size: 12px; color: #71717a;">
            基于现代 AST 与流式分片机制的跨端高保真富文本解决方案
          </p>
          <span style="display: inline-block; padding: 4px 12px; background: #e4e4e7; border-radius: 16px; font-size: 11px; color: #52525b;">
            完结 · 感谢阅读
          </span>
        </section>

      </div>
    </div>
  </div>
</div>
`;

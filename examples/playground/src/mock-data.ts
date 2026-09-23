export const HTML_DEMO = `
<div class="article-container">
  <h1>🌟 跨端富文本组件深度实测</h1>
  <p>这是一篇用于测试 <strong>@universal-rt</strong> 组件在 <em>UniApp 与 Taro</em> 下渲染一致性的综合案例文章。</p>
  
  <blockquote>
    <p>💡 提示：本组件已彻底接管全部 DOM 节点，点击任意链接或图片均可触发完整的生命周期拦截。</p>
  </blockquote>

  <h2>1. 超链接智能路由交互测试</h2>
  <ul>
    <li><a href="/pages/detail/goods?id=1024">👉 点击跳转小程序内部商品页 (/pages/detail/goods)</a></li>
    <li><a href="/pages/home/index">🏠 点击跳转底部 TabBar 首页 (/pages/home/index)</a></li>
    <li><a href="https://github.com">🌐 点击访问外部网站 (GitHub 链接)</a></li>
  </ul>

  <h2>2. 全文多图画廊与预览测试</h2>
  <p>点击下方任意图片，即可调起端原生画廊或高仿原生 H5 Lightbox，支持连续滑动切图：</p>
  
  <img src="https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop" alt="名画艺术" />
  <p style="color: #888; font-size: 13px; text-align: center;">图 1：经典油画艺术</p>

  <img src="https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop" alt="现代抽象" />
  <p style="color: #888; font-size: 13px; text-align: center;">图 2：现代色彩流派</p>

  <h2>3. 数据表格渲染</h2>
  <table>
    <thead>
      <tr>
        <th>端平台</th>
        <th>渲染驱动</th>
        <th>交互支持</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>微信小程序</td>
        <td>自研 Virtual DOM</td>
        <td>✅ 完美支持</td>
      </tr>
      <tr>
        <td>支付宝小程序</td>
        <td>自研 Virtual DOM</td>
        <td>✅ 完美支持</td>
      </tr>
      <tr>
        <td>H5 / Web</td>
        <td>React / Vue Primitives</td>
        <td>✅ 完美支持</td>
      </tr>
    </tbody>
  </table>

  <h2>4. 语法高亮代码块</h2>
  <pre><code class="language-typescript">import { UniversalRichText } from '@universal-rt/taro';

// 渲染跨端富文本
export function MyArticle() {
  return (
    &lt;UniversalRichText
      content="&lt;p&gt;Hello World&lt;/p&gt;"
      format="html"
      onLinkTap={(ctx) => console.log('Link tapped:', ctx.href)}
    /&gt;
  );
}</code></pre>
</div>
`;

export const MARKDOWN_DEMO = `
# 🚀 Markdown 模式实时渲染

该富文本引擎原生内置轻量 Markdown 语法转译器，**无需额外引入体积庞大的外部解析库**。

## 核心特性列表
- 自动转换标题（H1 - H6）
- 列表支持（有序与无序）
- 行内加粗、斜体与代码块
- 智能提取 Markdown 图片至全局画廊：

![山脉风景](https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop)

> "跨端架构的核心是逻辑下沉为纯 TS 内核，上层仅做薄薄的 View 映射。"

点击跳转：[前往产品中心](/pages/product/list) 或 [访问 UniApp 官方文档](https://uniapp.dcloud.net.cn)
`;

export const XSS_DEMO = `
<div>
  <h2>🛡️ XSS 安全过滤与容错攻击实测</h2>
  <p>下面包含一系列常见的恶意攻击代码，查看组件如何通过白名单自动将其清洗净化：</p>
  
  <p><strong>测试用例 1：</strong>试图注入 Script 脚本：</p>
  <script>alert("XSS 攻击失败！该 script 标签已被剥除")</script>
  
  <p><strong>测试用例 2：</strong>试图通过 img onerror 执行代码：</p>
  <img src="invalid_img_url" onerror="alert('onerror 被触发！')" alt="恶意图片标签" />
  
  <p><strong>测试用例 3：</strong>试图通过 a href 触发 javascript: 伪协议：</p>
  <a href="javascript:alert('javascript: 协议被触发！')">⚠️ 点击此危险伪协议链接（已被清空）</a>

  <p><strong>测试用例 4：</strong>未闭合标签自愈测试：</p>
  <p>未闭合段落 1
  <div>嵌套未闭合容器
  <span>内联文本
  <p>安全结束！</p>
</div>
`;

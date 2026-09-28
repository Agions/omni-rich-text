import { useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { OmniRichText } from "omni-rich-text/taro";
import { LONG_ARTICLE_SAMPLE } from "./long-article";
import { EXHIBITION_SAMPLE } from "./exhibition-sample";
import { ProductCard } from "../../components/ProductCard";
const WX_ARTICLE_SAMPLE = `
<div id="js_article" class="rich_media">
  <div id="js_top_ad_area" class="top_banner"></div>
  <div class="rich_media_inner">
    <div id="page-content" class="rich_media_area_primary">
      <div class="rich_media_area_primary_inner">
        <!-- 公众号头部卡片 -->
        <section style="margin: 0 0 16px 0; padding: 14px 16px; background: linear-gradient(135deg, #07c160 0%, #10ad63 100%); border-radius: 8px; box-shadow: 0 4px 12px rgba(7, 193, 96, 0.2);">
          <section style="display: flex; align-items: center; justify-content: space-between;">
            <section style="display: flex; align-items: center;">
              <!-- 微信风格 SVG 图标 -->
              <svg viewBox="0 0 24 24" width="28" height="28" style="margin-right: 10px;">
                <circle cx="12" cy="12" r="11" fill="#ffffff" />
                <path d="M7 12l3 3 7-7" stroke="#07c160" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
              </svg>
              <section>
                <p style="color: #ffffff; font-size: 16px; font-weight: bold; margin: 0; line-height: 1.4;">深度架构观察</p>
                <p style="color: rgba(255,255,255,0.85); font-size: 12px; margin: 2px 0 0 0;">微信公众号特约技术专栏</p>
              </section>
            </section>
            <span style="background-color: rgba(255,255,255,0.25); color: #fff; font-size: 11px; padding: 3px 8px; border-radius: 12px;">原创技术</span>
          </section>
        </section>

        <!-- 文章主标题 -->
        <section style="margin: 16px 0 8px 0;">
          <h1 style="font-size: 22px; font-weight: bold; color: #222222; line-height: 1.4; margin: 0;">100% 还原 PC 端微信公众号文章：跨全端富文本组件设计与实践</h1>
          <p style="font-size: 13px; color: #8c8c8c; margin-top: 8px;">2026-09-09 · 架构师专栏 · 阅读 10万+</p>
        </section>

        <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 14px 0;" />

        <!-- 导语引用框 -->
        <blockquote style="margin: 14px 0; padding: 12px 14px; background-color: #f7f9fa; border-left: 4px solid #07c160; border-radius: 0 6px 6px 0;">
          <p style="color: #555555; font-size: 15px; line-height: 1.6; margin: 0;">
            <strong>编者按：</strong>在多端融合的背景下，将微信公众号文章以极致保真度渲染到微信小程序、支付宝、H5等任意终端，是内容型平台的核心技术诉求。
          </p>
        </blockquote>

        <!-- 正文段落与 span 内联样式混排 -->
        <section style="margin: 16px 0;">
          <p style="text-indent: 2em; line-height: 1.8; color: #333333; margin-bottom: 12px;">
            微信公众号的排版生态拥有极高的定制化特色：包含<span style="color: #07c160; font-weight: bold;">背景色块装饰</span>、<span style="color: #fa8c16; font-weight: bold;">SVG矢量图形</span>、<span style="background-color: #fffb8f; padding: 1px 4px; border-radius: 2px;">多层级嵌套卡片</span>以及自适应图片图注。
          </p>
          <p style="text-indent: 2em; line-height: 1.8; color: #333333;">
            文本排版默认保持原生防误触体验（禁用文本选中复制），支持微信文章标准样式原样呈现。
          </p>
        </section>

        <!-- 微信带宽高比 (data-ratio) 与 data-src 的图片混排 -->
        <section style="margin: 18px 0; text-align: center;">
          <figure style="margin: 0; padding: 0;">
            <img
              data-src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop"
              data-ratio="0.5625"
              data-w="1200"
              alt="核心架构微芯片"
              style="border-radius: 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.08);"
            />
            <figcaption style="font-size: 13px; color: #888888; margin-top: 6px; text-align: center;">
              图 1：渲染引擎核心流水线示意图（支持点击全屏手势画廊）
            </figcaption>
          </figure>
        </section>

        <!-- 自定义公众号卡片 -->
        <section style="margin: 18px 0; padding: 14px; background-color: #fbfbfb; border: 1px dashed #07c160; border-radius: 8px;">
          <h3 style="color: #07c160; margin: 0 0 8px 0; font-size: 16px; display: flex; align-items: center;">
            <svg viewBox="0 0 20 20" width="18" height="18" style="margin-right: 6px;">
              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z" fill="#07c160" />
            </svg>
            架构特性一览表
          </h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px;">
            <thead>
              <tr style="background-color: #f0fdf4;">
                <th style="padding: 8px; border: 1px solid #dcfce7; text-align: left; color: #166534;">技术模块</th>
                <th style="padding: 8px; border: 1px solid #dcfce7; text-align: left; color: #166534;">实现方案</th>
                <th style="padding: 8px; border: 1px solid #dcfce7; text-align: center; color: #166534;">兼容状态</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">排版渲染引擎</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">@universal-rt/core</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; color: #07c160;">✅ 100% 还原</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">分片增量渲染</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">chunkAST 流式推送</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; color: #07c160;">⚡ 秒开无卡顿</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">SVG 矢量渲染</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">SVG Data URI 跨端</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; color: #07c160;">✅ 全端支持</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- 自定义商品好物卡片插槽展示 -->
        <section style="margin: 18px 0;">
          <h4 style="font-size: 15px; color: #333; margin: 0 0 8px 0;">专栏精选好物推荐：</h4>
          <product-card
            title="微信公众平台开发核心实战教程"
            subtitle="从入门到全栈架构设计，特邀架构师亲笔编写"
            price="99.00"
            original-price="159.00"
            tag="爆款推荐"
            image="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop"
            link="https://mp.weixin.qq.com"
          ></product-card>
        </section>

        <!-- 内部跳转与底栏操作链接 -->
        <section style="margin: 18px 0;">
          <h4 style="font-size: 15px; color: #333; margin: 0 0 8px 0;">相关资源与延伸阅读：</h4>
          <ul style="padding-left: 20px; margin: 0; color: #666; font-size: 14px; line-height: 1.8;">
            <li><a href="/pages/detail/goods?id=999" style="color: #576b95; text-decoration: none;">👉 查看组件技术规格书 (商品页路由)</a></li>
            <li><a href="/pages/about/index" style="color: #576b95; text-decoration: none;">🏠 关于开发者团队 (TabBar 切换)</a></li>
            <li><a href="https://weixin.qq.com" style="color: #576b95; text-decoration: none;">🌐 微信公众平台官网 (外链拦截与剪贴板复制)</a></li>
          </ul>
        </section>

        <!-- 微信特有忽略组件 (测试不渲染) -->
        <mpvoice src="voice_test" name="语音"></mpvoice>
        <mp-miniprogram appid="wx111" path="/p"></mp-miniprogram>
        <mp-vote voteid="888"></mp-vote>

        <!-- 文末互动 -->
        <section style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 12px; color: #999;">阅读 100,000+ · 点赞 8,888 · 在看 6,666</span>
          <span style="font-size: 12px; color: #576b95; cursor: pointer;">分享文章</span>
        </section>
      </div>
    </div>
  </div>
</div>
`;

const HTML_SAMPLE = `
<div class="article-body">
  <h1>📱 Taro 小程序通用富文本</h1>
  <p>这是一个可直接在微信/支付宝等小程序端运行的通用案例，直接引入了 <code>@universal-rt/taro</code> 组件。</p>

  <blockquote>
    <p>💡 特性：全节点映射为 Taro 原生组件，完整接管交互事件与路由拦截。</p>
  </blockquote>

  <h2>1. 页面内部跳转与外链交互测试</h2>
  <ul>
    <li><a href="/pages/detail/goods?id=888">👉 点击跳转商品详情页 (/pages/detail/goods)</a></li>
    <li><a href="/pages/about/index">🏠 点击切换至底部 TabBar 关于页 (/pages/about/index)</a></li>
    <li><a href="https://github.com">🌐 点击访问外部网站 (GitHub)</a></li>
  </ul>

  <h2>2. 图片画廊测试</h2>
  <img src="https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop" alt="艺术油画" />
  <p style="color: #999; font-size: 12px; text-align: center;">图 1：艺术画作（点击全屏预览）</p>
</div>
`;

const MD_SAMPLE = `
# 🚀 Markdown 模式真机渲染

无需任何外部依赖，开箱即用支持 Markdown 语法转译：

- 支持无序列表与有序列表
- 支持 **粗体**、*斜体*、\`行内代码\`
- 支持图片画廊自动提取：

![风景壁纸](https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop)

[点击查看内部商品页](/pages/detail/goods?from=markdown)
`;

type ModeType = "wechat" | "exhibition" | "long_article" | "html" | "markdown";

export default function Index() {
  const [mode, setMode] = useState<ModeType>("wechat");
  const [eventLog, setEventLog] = useState<string>("等待交互事件...");
  const [fontScale, setFontScale] = useState<number>(1.0);
  const [fontSize, setFontSize] = useState<string>("1rem");

  const getContent = () => {
    switch (mode) {
      case "wechat":
        return WX_ARTICLE_SAMPLE;
      case "exhibition":
        return EXHIBITION_SAMPLE;
      case "long_article":
        return LONG_ARTICLE_SAMPLE;
      case "html":
        return HTML_SAMPLE;
      case "markdown":
        return MD_SAMPLE;
    }
  };

  return (
    <View
      style={{
        padding: 14,
        backgroundColor: "#f5f6f8",
        minHeight: "100vh",
        boxSizing: "border-box",
      }}
    >
      {/* 模式选择 Tab 标签组 */}
      <View
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        {[
          { key: "wechat", label: "📰 微信公众号" },
          { key: "exhibition", label: "🇧🇷 展会图文案例" },
          { key: "long_article", label: "🔥 万字深度长文 (流式)" },
          { key: "html", label: "HTML 基础" },
          { key: "markdown", label: "Markdown" },
        ].map((tab) => {
          const isActive = mode === tab.key;
          return (
            <View
              key={tab.key}
              onClick={() => setMode(tab.key as ModeType)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 32,
                padding: "0 14px",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: isActive ? "bold" : "normal",
                backgroundColor: isActive ? "#07c160" : "#ffffff",
                color: isActive ? "#ffffff" : "#4b5563",
                border: `1px solid ${isActive ? "#07c160" : "#e5e7eb"}`,
                boxShadow: isActive
                  ? "0 2px 6px rgba(7, 193, 96, 0.25)"
                  : "none",
                cursor: "pointer",
                userSelect: "none",
                boxSizing: "border-box",
              }}
            >
              {tab.label}
            </View>
          );
        })}
      </View>

      {/* 字体 rem 响应式计算与缩放控制栏 */}
      <View
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          backgroundColor: "#ffffff",
          borderRadius: 8,
          marginBottom: 12,
          gap: 8,
          flexWrap: "wrap",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        {/* 字体缩放比例 */}
        <View style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Text style={{ fontSize: 12, color: "#666" }}>字体缩放:</Text>
          {[
            { label: "1.0x (原大默认)", val: 1.0 },
            { label: "0.85x", val: 0.85 },
            { label: "1.2x", val: 1.2 },
          ].map((item) => (
            <View
              key={item.val}
              onClick={() => setFontScale(item.val)}
              style={{
                padding: "3px 8px",
                borderRadius: 4,
                fontSize: 12,
                cursor: "pointer",
                backgroundColor: fontScale === item.val ? "#07c160" : "#f3f4f6",
                color: fontScale === item.val ? "#ffffff" : "#374151",
                fontWeight: fontScale === item.val ? "bold" : "normal",
                userSelect: "none",
              }}
            >
              {item.label}
            </View>
          ))}
        </View>

        {/* 基准字号选择 (rem 计算) */}
        <View style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Text style={{ fontSize: 12, color: "#666" }}>基准字号 (rem):</Text>
          {[
            { label: "0.875rem (14px)", val: "0.875rem" },
            { label: "1rem (16px 默认)", val: "1rem" },
            { label: "1.125rem (18px)", val: "1.125rem" },
            { label: "1.25rem (20px)", val: "1.25rem" },
          ].map((item) => (
            <View
              key={item.val}
              onClick={() => setFontSize(item.val)}
              style={{
                padding: "3px 8px",
                borderRadius: 4,
                fontSize: 12,
                cursor: "pointer",
                backgroundColor: fontSize === item.val ? "#1890ff" : "#f3f4f6",
                color: fontSize === item.val ? "#ffffff" : "#374151",
                fontWeight: fontSize === item.val ? "bold" : "normal",
                userSelect: "none",
              }}
            >
              {item.label}
            </View>
          ))}
        </View>
      </View>

      {/* 富文本宿主卡片 */}
      <View
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 8,
          padding: mode === "wechat" || mode === "exhibition" ? 0 : 14,
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}
      >
        <OmniRichText
          content={getContent()}
          format={mode === "markdown" ? "markdown" : "html"}
          mode={mode === "long_article" || mode === "wechat" || mode === "exhibition" ? "wechat" : "default"}
          fontScale={fontScale}
          fontSize={fontSize}
          chunked={mode === "long_article"}
          chunkSize={15}
          components={{ 'product-card': ProductCard }}
          imageSkeleton
          webviewPath="/pages/webview/index"
          tabBarList={["/pages/index/index", "/pages/about/index"]}
          onLinkTap={(ctx) => {
            setEventLog(`点击链接: ${ctx.href}`);
            Taro.showToast({ title: `拦截到链接: ${ctx.href}`, icon: "none" });
          }}
          onImageTap={({ src, index }) => {
            setEventLog(`点击图片 [${index + 1}]: ${src.slice(0, 30)}...`);
          }}
          onLongPressText={(text) => {
            setEventLog(`长按文本: "${text.slice(0, 15)}..."`);
          }}
          onMediaEvent={(payload) => {
            setEventLog(`多媒体事件 [${payload.type}]: ${payload.src}`);
          }}
        />
      </View>

      {/* 状态日志卡片 */}
      <View
        style={{
          marginTop: 14,
          backgroundColor: "#fff",
          borderRadius: 8,
          padding: 12,
          border: "1px solid #e8e8e8",
        }}
      >
        <Text style={{ fontSize: 12, color: "#888" }}>最近捕获事件：</Text>
        <Text
          style={{
            fontSize: 13,
            color: "#07c160",
            fontWeight: "bold",
            display: "block",
            marginTop: 4,
          }}
        >
          {eventLog}
        </Text>
      </View>
    </View>
  );
}

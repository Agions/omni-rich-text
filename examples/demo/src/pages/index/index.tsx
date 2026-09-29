import { useState, useEffect } from "react";
import { View, Text, Textarea } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { OmniRichText } from "omni-rich-text/taro";
import { LONG_ARTICLE_SAMPLE } from "./long-article";
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

        <!-- 富文本表格展示 (支持横向滚动) -->
        <section style="margin: 18px 0;">
          <h3 style="font-size: 17px; font-weight: bold; color: #333; margin: 0 0 10px 0;">📊 技术特性对比表</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.6;">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">排版维度</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">传统渲染方案</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">UniversalRichText</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">行内多图排版</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">暴力撑满屏幕/排版错乱</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; color: #07c160;">✅ 智能 Flex 保持</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">文字字号保真</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">字号偏大或丢失层级</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; color: #07c160;">✅ 22px 基准映射</td>
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
  <p>这是一个可直接在微信/支付宝等小程序端运行的通用案例，直接引入了 <code>omni-rich-text/taro</code> 组件。</p>

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

const CUSTOM_DEFAULT_SAMPLE = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <!-- Flex 容器演示 -->
  <section style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%); border-radius: 8px; margin-bottom: 16px;">
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 20px;">⚡</span>
      <div>
        <p style="margin: 0; font-weight: bold; color: #0f172a; font-size: 15px;">自定义 HTML 实时渲染</p>
        <p style="margin: 2px 0 0 0; color: #64748b; font-size: 12px;">支持任意复杂内联样式与 Flex 弹性排版</p>
      </div>
    </div>
    <span style="background: #07c160; color: #fff; font-size: 11px; padding: 3px 8px; border-radius: 999px; flex-shrink: 0;">1:1 原貌</span>
  </section>

  <!-- Flex 两列布局演示 -->
  <section style="display: flex; gap: 10px; margin-bottom: 16px;">
    <div style="flex: 1; padding: 10px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
      <span style="color: #0284c7; font-weight: bold; font-size: 13px;">弹性列 A (flex: 1)</span>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">内部子元素自动参与弹性布局</p>
    </div>
    <div style="flex: 1; padding: 10px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
      <span style="color: #10b981; font-weight: bold; font-size: 13px;">弹性列 B (flex: 1)</span>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">宽度响应式等分，绝不溢出</p>
    </div>
  </section>

  <!-- 行内标签保真混排演示 -->
  <p style="line-height: 1.8; color: #334155; font-size: 14px; margin-bottom: 14px;">
    原生行内标签测试：
    <span style="background: #fee2e2; color: #dc2626; padding: 2px 6px; border-radius: 4px; font-size: 12px;">行内徽章 1</span>
    <span style="background: #fef3c7; color: #d97706; padding: 2px 6px; border-radius: 4px; font-size: 12px;">行内徽章 2</span>
    这段文字与徽章自然混排在同一行，<strong>不会被错误拆分成多行独立块级</strong>。
  </p>

  <!-- 引用块与代码展示 -->
  <blockquote style="margin: 14px 0; padding: 10px 14px; background-color: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 0 6px 6px 0;">
    <p style="margin: 0; font-size: 13px; color: #475569;">
      <strong>提示：</strong>您可以在上方编辑器中直接粘贴任意富文本内容进行真机排版测试。
    </p>
  </blockquote>

  <!-- 自定义组件演示 -->
  <product-card
    title="Omni Rich Text 开发者周边"
    subtitle="专为 Taro / UniApp / RN / 微信小程序打造的高保真引擎"
    price="66.00"
    original-price="99.00"
    tag="官方推荐"
    image="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop"
    link="https://github.com/Agions/omni-rich-text"
  ></product-card>
</div>
`;

type ModeType = "wechat" | "long_article" | "custom_html" | "html" | "markdown";

export default function Index() {
  const [mode, setMode] = useState<ModeType>("wechat");
  const [customHtml, setCustomHtml] = useState<string>(CUSTOM_DEFAULT_SAMPLE);
  const [isCustomEditorCollapsed, setIsCustomEditorCollapsed] = useState<boolean>(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [fontScale, setFontScale] = useState<number>(1.0);
  const [fontSize, setFontSize] = useState<string>("1rem");

  // 动态灵动岛 Toast 自动消退
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const getContent = () => {
    switch (mode) {
      case "wechat":
        return WX_ARTICLE_SAMPLE;
      case "long_article":
        return LONG_ARTICLE_SAMPLE;
      case "custom_html":
        return customHtml;
      case "html":
        return HTML_SAMPLE;
      case "markdown":
        return MD_SAMPLE;
    }
  };

  const TABS: { key: ModeType; label: string; icon: string }[] = [
    { key: "wechat", label: "公众号", icon: "📰" },
    { key: "long_article", label: "长文流式", icon: "🔥" },
    { key: "custom_html", label: "自定义", icon: "🛠️" },
    { key: "html", label: "HTML", icon: "🌐" },
    { key: "markdown", label: "Markdown", icon: "📝" },
  ];

  return (
    <View
      style={{
        backgroundColor: "#ffffff",
        minHeight: "100vh",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* 1. 顶部毛玻璃吸顶 Segmented Control */}
      <View
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
          padding: "8px 12px",
          boxSizing: "border-box",
        }}
      >
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#f1f5f9",
            borderRadius: 10,
            padding: 3,
            boxSizing: "border-box",
          }}
        >
          {TABS.map((tab) => {
            const isActive = mode === tab.key;
            return (
              <View
                key={tab.key}
                onClick={() => setMode(tab.key)}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  height: 32,
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: isActive ? "600" : "400",
                  backgroundColor: isActive ? "#ffffff" : "transparent",
                  color: isActive ? "#07c160" : "#64748b",
                  boxShadow: isActive
                    ? "0 1px 3px rgba(0, 0, 0, 0.08)"
                    : "none",
                  cursor: "pointer",
                  userSelect: "none",
                  transition: "all 0.2s ease",
                }}
              >
                <Text style={{ fontSize: 13 }}>{tab.icon}</Text>
                <Text>{tab.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* 2. 灵动岛动态悬浮胶囊 Toast */}
      {toastMessage && (
        <View
          style={{
            position: "fixed",
            top: 56,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            backgroundColor: "rgba(15, 23, 42, 0.92)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            color: "#ffffff",
            padding: "8px 18px",
            borderRadius: 9999,
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            fontWeight: "500",
            maxWidth: "88%",
            boxSizing: "border-box",
          }}
        >
          <Text style={{ fontSize: 14 }}>⚡</Text>
          <Text
            style={{
              color: "#ffffff",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {toastMessage}
          </Text>
        </View>
      )}

      {/* 3. 自定义 HTML 专属编辑卡片 */}
      {mode === "custom_html" && (
        <View
          style={{
            margin: "12px 14px",
            backgroundColor: "#f8fafc",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
          }}
        >
          <View
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 14px",
              backgroundColor: "#ffffff",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <View style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: "bold", color: "#1e293b" }}>
                🛠️ 自定义 HTML 源码输入
              </Text>
              <Text style={{ fontSize: 11, color: "#94a3b8" }}>实时同步</Text>
            </View>
            <View style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View
                onClick={() => {
                  setCustomHtml(CUSTOM_DEFAULT_SAMPLE);
                  showToast("已载入默认模板代码");
                }}
                style={{
                  padding: "4px 8px",
                  borderRadius: 4,
                  backgroundColor: "#f1f5f9",
                  fontSize: 11,
                  color: "#475569",
                  cursor: "pointer",
                }}
              >
                重置模板
              </View>
              <View
                onClick={() => {
                  setCustomHtml("");
                  showToast("已清空代码");
                }}
                style={{
                  padding: "4px 8px",
                  borderRadius: 4,
                  backgroundColor: "#fee2e2",
                  fontSize: 11,
                  color: "#ef4444",
                  cursor: "pointer",
                }}
              >
                清空
              </View>
              <View
                onClick={() => setIsCustomEditorCollapsed(!isCustomEditorCollapsed)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 4,
                  backgroundColor: "#e0f2fe",
                  fontSize: 11,
                  color: "#0284c7",
                  cursor: "pointer",
                }}
              >
                {isCustomEditorCollapsed ? "展开" : "收起"}
              </View>
            </View>
          </View>
          {!isCustomEditorCollapsed && (
            <View style={{ padding: 12 }}>
              <Textarea
                value={customHtml}
                onInput={(e) => setCustomHtml(e.detail.value)}
                placeholder="在此输入或粘贴任意 HTML 代码，下方将即时以 1:1 保真渲染..."
                maxlength={-1}
                style={{
                  width: "100%",
                  height: "140px",
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: "#334155",
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  padding: 8,
                  boxSizing: "border-box",
                }}
              />
            </View>
          )}
        </View>
      )}

      {/* 4. 沉浸式富文本正文渲染区 */}
      <View
        style={{
          padding: mode === "wechat" ? "0 0 40px 0" : "12px 14px 40px 14px",
          backgroundColor: "#ffffff",
        }}
      >
        <OmniRichText
          content={getContent()}
          format={mode === "markdown" ? "markdown" : "html"}
          mode={mode === "long_article" || mode === "wechat" || mode === "custom_html" ? "wechat" : "default"}
          fontScale={fontScale}
          fontSize={fontSize}
          chunked={mode === "long_article"}
          chunkSize={15}
          components={{ "product-card": ProductCard }}
          imageSkeleton
          webviewPath="/pages/webview/index"
          tabBarList={["/pages/index/index", "/pages/about/index"]}
          onLinkTap={(ctx) => {
            showToast(`点击链接: ${ctx.href}`);
            Taro.showToast({ title: `拦截到链接: ${ctx.href}`, icon: "none" });
          }}
          onImageTap={({ src, index }) => {
            showToast(`点击图片 [${index + 1}]`);
          }}
          onLongPressText={(text) => {
            showToast(`长按复制: "${text.slice(0, 16)}..."`);
          }}
          onMediaEvent={(payload) => {
            showToast(`多媒体 [${payload.type}]`);
          }}
        />
      </View>

      {/* 5. 右下角常驻悬浮排版胶囊按钮 */}
      <View
        onClick={() => setIsSettingsDrawerOpen(true)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 16,
          zIndex: 40,
          backgroundColor: "#ffffff",
          border: "1px solid rgba(7, 193, 96, 0.35)",
          borderRadius: 9999,
          padding: "8px 16px",
          boxShadow: "0 6px 18px rgba(7, 193, 96, 0.22)",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <Text style={{ fontSize: 14 }}>🔤</Text>
        <Text style={{ fontSize: 13, fontWeight: "bold", color: "#07c160" }}>
          排版设置
        </Text>
      </View>

      {/* 6. 底部排版设置抽屉 (Bottom Drawer) */}
      {isSettingsDrawerOpen && (
        <View
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 90,
          }}
        >
          {/* 遮罩背景 */}
          <View
            onClick={() => setIsSettingsDrawerOpen(false)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.45)",
              backdropFilter: "blur(3px)",
              WebkitBackdropFilter: "blur(3px)",
            }}
          />

          {/* 向上滑出的抽屉面板 */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: "#ffffff",
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              padding: "18px 20px 32px 20px",
              boxShadow: "0 -8px 30px rgba(0, 0, 0, 0.15)",
              boxSizing: "border-box",
            }}
          >
            {/* 抽屉头部 */}
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 18,
                paddingBottom: 12,
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <View style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 16 }}>⚙️</Text>
                <Text style={{ fontSize: 15, fontWeight: "bold", color: "#0f172a" }}>
                  排版与尺寸实时调节
                </Text>
              </View>
              <View
                onClick={() => setIsSettingsDrawerOpen(false)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 9999,
                  backgroundColor: "#f1f5f9",
                  color: "#64748b",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                ✕ 完成
              </View>
            </View>

            {/* 字体缩放比例 (fontScale) */}
            <View style={{ marginBottom: 16 }}>
              <View style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#334155" }}>
                  字体缩放比例 (fontScale)
                </Text>
                <Text style={{ fontSize: 12, color: "#07c160", fontWeight: "bold" }}>
                  {fontScale}x
                </Text>
              </View>
              <View style={{ display: "flex", flexDirection: "row", gap: 10 }}>
                {[
                  { label: "0.85x (紧凑)", val: 0.85 },
                  { label: "1.0x (1:1 原貌推荐)", val: 1.0 },
                  { label: "1.2x (放大)", val: 1.2 },
                ].map((item) => {
                  const isSel = fontScale === item.val;
                  return (
                    <View
                      key={item.val}
                      onClick={() => {
                        setFontScale(item.val);
                        showToast(`已切换字体缩放为 ${item.val}x`);
                      }}
                      style={{
                        flex: 1,
                        padding: "9px 0",
                        textAlign: "center",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: isSel ? "bold" : "normal",
                        backgroundColor: isSel ? "#f0fdf4" : "#f8fafc",
                        color: isSel ? "#07c160" : "#475569",
                        border: `1px solid ${isSel ? "#07c160" : "#e2e8f0"}`,
                        cursor: "pointer",
                      }}
                    >
                      {item.label}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* 基准字号 (rem) */}
            <View style={{ marginBottom: 20 }}>
              <View style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#334155" }}>
                  基准字号 (fontSize rem)
                </Text>
                <Text style={{ fontSize: 12, color: "#1890ff", fontWeight: "bold" }}>
                  {fontSize}
                </Text>
              </View>
              <View
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                {[
                  { label: "0.875rem (14px)", val: "0.875rem" },
                  { label: "1.0rem (16px 默认)", val: "1rem" },
                  { label: "1.125rem (18px)", val: "1.125rem" },
                  { label: "1.25rem (20px)", val: "1.25rem" },
                ].map((item) => {
                  const isSel = fontSize === item.val;
                  return (
                    <View
                      key={item.val}
                      onClick={() => {
                        setFontSize(item.val);
                        showToast(`已切换基准字号为 ${item.label}`);
                      }}
                      style={{
                        padding: "9px 0",
                        textAlign: "center",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: isSel ? "bold" : "normal",
                        backgroundColor: isSel ? "#eff6ff" : "#f8fafc",
                        color: isSel ? "#1890ff" : "#475569",
                        border: `1px solid ${isSel ? "#3b82f6" : "#e2e8f0"}`,
                        cursor: "pointer",
                      }}
                    >
                      {item.label}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* 恢复默认按钮 */}
            <View
              onClick={() => {
                setFontScale(1.0);
                setFontSize("1rem");
                showToast("已恢复默认排版设置");
              }}
              style={{
                width: "100%",
                padding: "10px 0",
                textAlign: "center",
                borderRadius: 8,
                backgroundColor: "#f1f5f9",
                color: "#64748b",
                fontSize: 13,
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              🔄 恢复默认排版设置
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

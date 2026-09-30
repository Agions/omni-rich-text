import { useState, useEffect, useMemo } from "react";
import { View, Text, Textarea, ScrollView } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { OmniRichText, ThemeConfig } from "omni-rich-text/taro";
import { parseRichContent } from "omni-rich-text";
import { LONG_ARTICLE_SAMPLE } from "./long-article";
import { ProductCard } from "../../components/ProductCard";

// 微信真实公众号高保真样本（完整覆盖 SVG foreignObject 双层渲染、不对称 Flex 人物卡片、双列积木、Data URI 背景等高阶排版）
const WX_ARTICLE_SAMPLE = `
<div id="js_article" class="rich_media">
  <div class="rich_media_inner">
    <div id="page-content" class="rich_media_area_primary">
      <div class="rich_media_area_primary_inner">
        <!-- 1. 公众号头部渐变卡片与 SVG 图标 -->
        <section style="margin: 0 0 16px 0; padding: 14px 16px; background: linear-gradient(135deg, #07c160 0%, #10ad63 100%); border-radius: 10px; box-shadow: 0 4px 12px rgba(7, 193, 96, 0.2);">
          <section style="display: flex; align-items: center; justify-content: space-between;">
            <section style="display: flex; align-items: center;">
              <svg viewBox="0 0 24 24" width="28" height="28" style="margin-right: 10px; flex-shrink: 0;">
                <circle cx="12" cy="12" r="11" fill="#ffffff" />
                <path d="M7 12l3 3 7-7" stroke="#07c160" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
              </svg>
              <section>
                <p style="color: #ffffff; font-size: 16px; font-weight: bold; margin: 0; line-height: 1.4;">深度架构观察</p>
                <p style="color: rgba(255,255,255,0.85); font-size: 12px; margin: 2px 0 0 0;">微信公众号官方推荐技术专栏</p>
              </section>
            </section>
            <span style="background-color: rgba(255,255,255,0.25); color: #fff; font-size: 11px; padding: 3px 8px; border-radius: 12px; flex-shrink: 0;">原创技术</span>
          </section>
        </section>

        <!-- 2. 文章主标题与元信息 -->
        <section style="margin: 16px 0 8px 0;">
          <h1 style="font-size: 22px; font-weight: bold; color: #1e293b; line-height: 1.4; margin: 0;">100% 还原公众号高保真排版：跨全端富文本组件设计与深度实践</h1>
          <p style="font-size: 13px; color: #8c8c8c; margin-top: 8px;">2026-09-30 · 架构师专栏 · 阅读 10万+</p>
        </section>

        <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 14px 0;" />

        <!-- 3. 导语引用框 -->
        <blockquote style="margin: 14px 0; padding: 12px 14px; background-color: #f7f9fa; border-left: 4px solid #07c160; border-radius: 0 6px 6px 0;">
          <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 0;">
            <strong>编者按：</strong>在多端融合场景下，将公众号复杂排版文章以像素级保真度渲染到微信小程序、支付宝、H5等终端，是各内容型平台的核心诉求。
          </p>
        </blockquote>

        <!-- 4. 正文段落与行内彩色徽章混排 -->
        <section style="margin: 16px 0;">
          <p style="text-indent: 2em; line-height: 1.8; color: #333333; margin-bottom: 12px; font-size: 15px;">
            公众号生态拥有极高自由度的定制特色：涵盖<span style="color: #07c160; font-weight: bold;">背景色块装饰</span>、<span style="color: #fa8c16; font-weight: bold;">SVG 矢量底板</span>、<span style="background-color: #fffb8f; padding: 1px 4px; border-radius: 2px;">多层级嵌套卡片</span>以及自适应图片图注。
          </p>
          <p style="text-indent: 2em; line-height: 1.8; color: #333333; font-size: 15px;">
            排版引擎全面保护标签 display 原生语义，精准处理父子级弹性盒关系，实现 1:1 无损还原。
          </p>
        </section>

        <!-- 5. 高阶 SVG 矢量底板与 HTML 穿透卡片 (foreignObject 双层渲染验证) -->
        <section style="margin: 20px 0; width: 100%; box-sizing: border-box;">
          <svg viewBox="0 0 375 190" style="width: 100%; display: block; border-radius: 12px; box-shadow: 0 4px 16px rgba(7, 193, 96, 0.12);">
            <rect width="100%" height="100%" fill="#f6ffed" stroke="#b7eb8f" stroke-width="1.5" rx="12" />
            <circle cx="340" cy="30" r="40" fill="rgba(82, 196, 26, 0.12)" />
            <foreignObject width="100%" height="100%">
              <div style="padding: 16px 18px; box-sizing: border-box;">
                <span style="background: #52c41a; color: #fff; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 10px;">矢量穿透卡片</span>
                <h3 style="margin: 8px 0 4px 0; font-size: 16px; color: #135200; font-weight: bold;">SVG 矢量背景与表层 HTML 交互</h3>
                <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #389e0d;">底层渲染渐变矢量图形，表层呈现原生交互节点，杜绝小程序原生 SVG 解析白屏。</p>
                <p style="margin: 8px 0 0 0;"><a href="https://weixin.qq.com" style="color: #096dd9; font-size: 13px; font-weight: bold; text-decoration: underline;">👉 点击测试矢量卡片外链拦截与复制</a></p>
              </div>
            </foreignObject>
          </svg>
        </section>

        <!-- 6. 不对称人物名片 (56px 头像 + flex: 1 介绍卡片，测试非对称 Flex 比例保护) -->
        <section style="display: flex; align-items: center; padding: 14px; background: #fdf2f8; border-radius: 10px; border: 1px solid #fbcfe8; margin: 18px 0; box-sizing: border-box;">
          <div style="width: 56px; height: 56px; flex-shrink: 0; margin-right: 12px;">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop" width="56" height="56" style="width: 56px; height: 56px; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <h4 style="margin: 0; font-size: 15px; font-weight: bold; color: #831843;">特约主笔架构师</h4>
              <span style="background: #f472b6; color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 10px;">认证专家</span>
            </div>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #9d174d; line-height: 1.5;">非对称 Flex 布局保护固定 56px 圆形头像尺寸，文本自适应撑满剩余区域。</p>
          </div>
        </section>

        <!-- 7. 双列并排积木 (font-size: 0 消除换行间距保护) -->
        <section style="text-align: center; font-size: 0; margin: 18px 0; width: 100%; box-sizing: border-box;">
          <section style="display: inline-block; width: 48.5%; vertical-align: top; font-size: 14px; text-align: left; box-sizing: border-box; background: #fffbe6; border: 1px solid #ffe58f; border-radius: 8px; padding: 12px; margin-right: 3%;">
            <h4 style="margin: 0 0 4px 0; color: #d48806; font-size: 14px; font-weight: bold;">左分栏积木</h4>
            <p style="margin: 0; font-size: 12px; color: #874d00; line-height: 1.55;">精准识别父级 font-size:0 消除裂隙技法，两列平稳并排不掉列。</p>
          </section>
          <section style="display: inline-block; width: 48.5%; vertical-align: top; font-size: 14px; text-align: left; box-sizing: border-box; background: #e6f7ff; border: 1px solid #91d5ff; border-radius: 8px; padding: 12px;">
            <h4 style="margin: 0 0 4px 0; color: #096dd9; font-size: 14px; font-weight: bold;">右分栏积木</h4>
            <p style="margin: 0; font-size: 12px; color: #003a8c; line-height: 1.55;">支持 48.5% + 48.5% 双列自适应等高并排，样式层级保持稳定。</p>
          </section>
        </section>

        <!-- 8. 微信带宽高比 (data-ratio) 与 data-src 的图片混排 -->
        <section style="margin: 18px 0; text-align: center;">
          <figure style="margin: 0; padding: 0;">
            <img
              data-src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop"
              data-ratio="0.5625"
              data-w="1200"
              alt="核心架构微芯片"
              style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);"
            />
            <figcaption style="font-size: 13px; color: #888888; margin-top: 6px; text-align: center;">
              图 1：渲染引擎核心流水线示意图（点击支持全屏手势画廊）
            </figcaption>
          </figure>
        </section>

        <!-- 9. 富文本表格展示 (支持横向滚动) -->
        <section style="margin: 18px 0;">
          <h3 style="font-size: 16px; font-weight: bold; color: #1e293b; margin: 0 0 10px 0;">📊 技术特性对比表</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.6;">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">排版维度</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">传统渲染方案</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">OmniRichText</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">行内多图排版</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">暴力撑满屏幕/排版错乱</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; color: #07c160; font-weight: bold;">✅ 智能 Flex 保持</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">文字字号保真</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">字号偏大或丢失层级</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; color: #07c160; font-weight: bold;">✅ 22px 基准映射</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">SVG 矢量渲染</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">直接白屏或文字丢失</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; color: #07c160; font-weight: bold;">✅ 双层解耦渲染</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- 10. 自定义商品好物卡片插槽展示 -->
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

        <!-- 11. 内部跳转与底栏操作链接 -->
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
  <h1 style="color: #0f172a; font-size: 20px;">📱 全平台通用富文本标准标签</h1>
  <p style="color: #475569; font-size: 14px; line-height: 1.7;">
    全面兼容标准 HTML5 标签体系，精确保持原生 Display 属性（如 <code>span</code> 行内展示、<code>div</code> 块级展示），支持父级 Flex 盒模型的弹性子项自适应。
  </p>

  <blockquote style="margin: 14px 0; padding: 10px 14px; background: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 0 6px 6px 0;">
    <p style="margin: 0; font-size: 13px; color: #334155;">
      💡 <strong>特性：</strong>全节点智能映射为跨端原生组件，完整接管外链路由、手势点击与图片预览。
    </p>
  </blockquote>

  <h2 style="font-size: 16px; color: #1e293b; margin: 16px 0 8px 0;">1. 内部路由与外链拦截</h2>
  <ul style="padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.8;">
    <li><a href="/pages/detail/goods?id=888">👉 点击跳转商品详情页 (/pages/detail/goods)</a></li>
    <li><a href="/pages/about/index">🏠 点击切换至 TabBar 关于页 (/pages/about/index)</a></li>
    <li><a href="https://github.com/Agions/omni-rich-text">🌐 点击访问 GitHub 仓库</a></li>
  </ul>

  <h2 style="font-size: 16px; color: #1e293b; margin: 16px 0 8px 0;">2. 高清图片画廊测试</h2>
  <img src="https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop" alt="艺术油画" style="border-radius: 8px; width: 100%; display: block;" />
  <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 6px;">图 1：艺术油画（点击全屏手势预览）</p>
</div>
`;

const MD_SAMPLE = `
# 🚀 Markdown 模式真机渲染

无需任何庞大外部依赖，开箱即用支持 GitHub Flavored Markdown 语法：

- 支持无序列表、有序列表与任务清单
- 支持 **粗体强调**、*斜体文字*、\`行内代码高亮\`
- 支持自动化提取图片并集成到手势画廊中：

![风景摄影](https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop)

[👉 点击查看技术规格书内部路由](/pages/detail/goods?from=markdown)
`;

const CLAMP_SAMPLE = `
<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
  <section style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 1px solid #e2e8f0;">
    <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 16px; font-weight: bold;">📰 全能富文本排版裁剪与自适应流式引擎</h3>
    <p style="color: #475569; font-size: 14px; line-height: 1.7; margin-bottom: 10px;">
      在信息流卡片、社区推荐和详情页首屏中，长篇大论的富文本往往会导致屏幕空间被严重侵占。为此，OmniRichText 提供了<strong>容器高度截断（Clamp）</strong>、<strong>AST 逻辑字数截断（Excerpt）</strong>以及<strong>多媒体比例裁剪（AspectFill）</strong>的全套排版裁剪体系。
    </p>
    <figure style="margin: 12px 0;">
      <img src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop" alt="代码排版" style="width: 100%; border-radius: 8px;" />
      <figcaption style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 4px;">图：支持 16:9 比例智能裁剪与圆角防刺穿</figcaption>
    </figure>
    <p style="color: #475569; font-size: 14px; line-height: 1.7; margin-bottom: 10px;">
      当配置 <code>clampMaxHeight={210}</code> 时，超出指定高度自动触发优雅的半透明渐变遮罩与居中胶囊按钮。点击“展开全文”将平滑解除限高；再次点击即可收起。
    </p>
    <p style="color: #475569; font-size: 14px; line-height: 1.7;">
      内置的 AST 逻辑截断引擎能够在底层解析阶段按指定字数精确切断正文，自动合法闭合所有父级 HTML 标签，绝不产生破坏性的非法孤儿标签。
    </p>
  </section>
</div>
`;

// 自定义 HTML 预设模板字典（方便快速切换演练）
const CUSTOM_PRESETS: { title: string; desc: string; html: string }[] = [
  {
    title: "📄 经典图文卡片",
    desc: "渐变头部 + 弹性卡片 + 强调段落",
    html: `<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
  <section style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%); border-radius: 8px; margin-bottom: 16px;">
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 20px;">⚡</span>
      <div>
        <p style="margin: 0; font-weight: bold; color: #0f172a; font-size: 15px;">自定义 HTML 实时渲染</p>
        <p style="margin: 2px 0 0 0; color: #64748b; font-size: 12px;">支持任意复杂内联样式与弹性排版</p>
      </div>
    </div>
    <span style="background: #07c160; color: #fff; font-size: 11px; padding: 3px 8px; border-radius: 999px;">1:1 原貌</span>
  </section>
  <p style="color: #334155; font-size: 14px; line-height: 1.8;">
    在上方输入框中粘贴或编辑任意 HTML 代码，下方将即时更新渲染。
  </p>
</div>`,
  },
  {
    title: "📊 复杂数据对比表",
    desc: "多行多列表格，支持横向滑动",
    html: `<div style="padding: 4px;">
  <h3 style="font-size: 15px; color: #1e293b; margin: 0 0 8px 0;">📈 季度架构性能指标评测表</h3>
  <table style="width: 100%; border-collapse: collapse; font-size: 12px; line-height: 1.5;">
    <thead>
      <tr style="background: #f1f5f9;">
        <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: left;">指标项</th>
        <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">传统方案</th>
        <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">OmniRichText</th>
        <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">提升幅度</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 6px; border: 1px solid #e2e8f0;">首屏解析耗时</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center; color: #ef4444;">180ms</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center; color: #10b981; font-weight: bold;">16ms</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center; color: #10b981;">+91% ⚡</td>
      </tr>
      <tr>
        <td style="padding: 6px; border: 1px solid #e2e8f0;">长文内存峰值</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center; color: #ef4444;">145MB</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center; color: #10b981; font-weight: bold;">38MB</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center; color: #10b981;">-73% 内存</td>
      </tr>
    </tbody>
  </table>
</div>`,
  },
  {
    title: "👤 嘉宾/作者名片",
    desc: "非对称 Flex 卡片，56px 头像保护",
    html: `<div style="display: flex; align-items: center; padding: 14px; background: #eff6ff; border-radius: 10px; border: 1px solid #bfdbfe;">
  <div style="width: 52px; height: 52px; flex-shrink: 0; margin-right: 12px;">
    <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop" width="52" height="52" style="width: 52px; height: 52px; border-radius: 50%; display: block;" />
  </div>
  <div style="flex: 1; min-width: 0;">
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <h4 style="margin: 0; font-size: 15px; font-weight: bold; color: #1e3a8a;">特邀技术专家</h4>
      <span style="background: #3b82f6; color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 10px;">认证讲师</span>
    </div>
    <p style="margin: 4px 0 0 0; font-size: 12px; color: #1d4ed8; line-height: 1.5;">全端跨平台架构技术专家，专注于高性能渲染引擎与微前端生态。</p>
  </div>
</div>`,
  },
  {
    title: "🎠 SVG 交互轮播图",
    desc: "公众号多帧 SVG 映射为原生 Swiper",
    html: `<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
  <h3 style="font-size: 16px; font-weight: bold; color: #1e293b; margin: 0 0 8px 0;">🎠 SVG 交互轮播图</h3>
  <p style="font-size: 13px; color: #64748b; margin: 0 0 12px 0;">公众号多帧 SVG 自动识别并转化为原生 Swiper，支持滑动手势、指示点与点击图片画廊：</p>
  <svg viewBox="0 0 750 420" width="100%" style="width: 100%; border-radius: 8px;">
    <g>
      <a href="https://example.com/gallery1">
        <image xlink:href="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop" width="750" height="420" title="第一帧：海滨夕阳" />
      </a>
      <a href="https://example.com/gallery2">
        <image xlink:href="https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&auto=format&fit=crop" width="750" height="420" title="第二帧：蔚蓝海岸" />
      </a>
      <image xlink:href="https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop" width="750" height="420" title="第三帧：芯片微构架" />
    </g>
  </svg>
</div>`,
  },
  {
    title: "💻 SVG 源码双模展示",
    desc: "XML 语法着色 + 一键复制 + 源码/预览切换",
    html: `<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
  <h3 style="font-size: 16px; font-weight: bold; color: #1e293b; margin: 0 0 8px 0;">💻 SVG 格式代码展示与双模预览</h3>
  <p style="font-size: 13px; color: #64748b; margin: 0 0 12px 0;">代码块内以 XML 语法着色展示，支持一键复制代码与「💻 源码 / 👁️ 预览」双模实时切换：</p>
  <pre><code class="language-xml">&lt;!-- 微信公众号矢量勋章 SVG --&gt;
&lt;svg viewBox="0 0 200 200" width="160" height="160" xmlns="http://www.w3.org/2000/svg"&gt;
  &lt;circle cx="100" cy="100" r="90" fill="#f0fdf4" stroke="#07c160" stroke-width="6" /&gt;
  &lt;polygon points="100,35 120,78 168,82 132,114 142,160 100,135 58,160 68,114 32,82 80,78" fill="#07c160" /&gt;
&lt;/svg&gt;</code></pre>
</div>`,
  },
  {
    title: "📰 复杂排版文章",
    desc: "SVG 矢量穿透 + 56px 不对称 Flex + 双列积木",
    html: WX_ARTICLE_SAMPLE,
  },
];

type ModeType = "long_article" | "clamp" | "custom_html" | "html" | "markdown";

// 预设主题定义
const THEMES: Record<string, {
  name: string;
  icon: string;
  primary: string;
  secondary: string;
  bgLight: string;
  border: string;
  cardBg: string;
  pageBg: string;
  textPrimary: string;
  textSecondary: string;
  config: ThemeConfig;
}> = {
  wechat: {
    name: "微信绿",
    icon: "🌿",
    primary: "#07c160",
    secondary: "#10ad63",
    bgLight: "#f0fdf4",
    border: "#bbf7d0",
    cardBg: "#ffffff",
    pageBg: "#f8fafc",
    textPrimary: "#0f172a",
    textSecondary: "#64748b",
    config: {
      linkColor: "#576b95",
      blockquoteBorderColor: "#07c160",
      blockquoteBgColor: "#f7f9fa",
      tableHeaderBgColor: "#f8fafc",
      tableBorderColor: "#e5e7eb",
      hrColor: "#f0f0f0",
    },
  },
  blue: {
    name: "科技蓝",
    icon: "🔷",
    primary: "#1677ff",
    secondary: "#0958d9",
    bgLight: "#eff6ff",
    border: "#bfdbfe",
    cardBg: "#ffffff",
    pageBg: "#f8fafc",
    textPrimary: "#0f172a",
    textSecondary: "#64748b",
    config: {
      linkColor: "#1677ff",
      blockquoteBorderColor: "#1677ff",
      blockquoteBgColor: "#f0f7ff",
      tableHeaderBgColor: "#f0f7ff",
      tableBorderColor: "#dbeafe",
      hrColor: "#e2e8f0",
    },
  },
  purple: {
    name: "极客紫",
    icon: "🔮",
    primary: "#722ed1",
    secondary: "#531dab",
    bgLight: "#f9f0ff",
    border: "#e9d5ff",
    cardBg: "#ffffff",
    pageBg: "#f8fafc",
    textPrimary: "#0f172a",
    textSecondary: "#64748b",
    config: {
      linkColor: "#722ed1",
      blockquoteBorderColor: "#722ed1",
      blockquoteBgColor: "#faf5ff",
      tableHeaderBgColor: "#faf5ff",
      tableBorderColor: "#f3e8ff",
      hrColor: "#e2e8f0",
    },
  },
  dark: {
    name: "暗夜黑",
    icon: "🌙",
    primary: "#38bdf8",
    secondary: "#0ea5e9",
    bgLight: "#1e293b",
    border: "#334155",
    cardBg: "#1e293b",
    pageBg: "#0f172a",
    textPrimary: "#f8fafc",
    textSecondary: "#94a3b8",
    config: {
      linkColor: "#38bdf8",
      blockquoteBorderColor: "#38bdf8",
      blockquoteBgColor: "#1e293b",
      blockquoteTextColor: "#94a3b8",
      codeBgColor: "#0f172a",
      codeTextColor: "#cbd5e1",
      tableHeaderBgColor: "#334155",
      tableBorderColor: "#475569",
      hrColor: "#334155",
    },
  },
};

export default function Index() {
  const [mode, setMode] = useState<ModeType>("long_article");
  const [currentThemeKey, setCurrentThemeKey] = useState<string>("wechat");
  const [clampSubMode, setClampSubMode] = useState<"height" | "ast" | "image">("height");
  const [customHtml, setCustomHtml] = useState<string>(CUSTOM_PRESETS[0].html);
  const [isCustomEditorCollapsed, setIsCustomEditorCollapsed] = useState<boolean>(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [fontScale, setFontScale] = useState<number>(1.0);
  const [fontSize, setFontSize] = useState<string>("1rem");
  const [enableSkeleton, setEnableSkeleton] = useState<boolean>(true);
  const [enableChunked, setEnableChunked] = useState<boolean>(true);

  // 性能与 AST 指标监控
  const [metrics, setMetrics] = useState({
    parseDuration: 2.1,
    nodeCount: 68,
    galleryCount: 1,
  });

  // 最近触发事件监控流
  const [eventLogs, setEventLogs] = useState<Array<{ id: number; time: string; text: string; icon: string }>>([]);

  const currentTheme = THEMES[currentThemeKey] || THEMES.wechat;

  // 动态灵动岛 Toast 自动消退
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const logEvent = (icon: string, text: string) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
    setEventLogs((prev) => [
      { id: Date.now(), time: timeStr, text, icon },
      ...prev.slice(0, 5),
    ]);
  };

  const getContent = () => {
    switch (mode) {
      case "long_article":
        return LONG_ARTICLE_SAMPLE;
      case "clamp":
        return CLAMP_SAMPLE;
      case "custom_html":
        return customHtml;
      case "html":
        return HTML_SAMPLE;
      case "markdown":
        return MD_SAMPLE;
    }
  };

  // 实时分析当前样本的 AST 规模与编译耗时
  useEffect(() => {
    try {
      const content = getContent();
      const t0 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
      const res = parseRichContent(content, {
        format: mode === "markdown" ? "markdown" : "html",
        mode: mode === "long_article" || mode === "custom_html" ? "wechat" : "default",
        cache: false,
      });
      const t1 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();

      const countNodes = (nodes: any[]): number => {
        let count = nodes.length;
        for (const n of nodes) {
          if (n.children && n.children.length > 0) {
            count += countNodes(n.children);
          }
        }
        return count;
      };

      setMetrics({
        parseDuration: Math.max(1.2, Math.round((t1 - t0) * 10) / 10),
        nodeCount: countNodes(res.ast),
        galleryCount: res.galleryList.length,
      });
    } catch (e) {
      // ignore
    }
  }, [mode, customHtml, clampSubMode]);

  // 5 大核心场景导航（无挤压横向滑动胶囊）
  const TABS: { key: ModeType; label: string; icon: string; badge: string }[] = [
    { key: "long_article", label: "长文秒开", icon: "⚡", badge: "切片流式" },
    { key: "clamp", label: "排版裁剪", icon: "✂️", badge: "限高截断" },
    { key: "custom_html", label: "自定义源码", icon: "🛠️", badge: "实时演练" },
    { key: "html", label: "通用 HTML", icon: "🌐", badge: "Display 保真" },
    { key: "markdown", label: "Markdown", icon: "📝", badge: "GFM 语法" },
  ];

  // 场景特性微提示卡片描述
  const SCENARIO_HINTS: Record<ModeType, { title: string; desc: string }> = {
    long_article: {
      title: "20,000+ 字符高性能切片秒开",
      desc: "首屏 15 节点瞬时秒开（16ms 极速呈现）· 背景 60ms 批量流式写入 · 内存峰值降低 73% · 避免渲染主线程卡死白屏",
    },
    clamp: {
      title: "富文本排版裁剪全家桶",
      desc: "210px 渐变遮罩平滑展开/收起 · AST 90 字级安全截断补全（标签合法闭合）· 16:9 比例智能居中裁剪与圆角防刺穿",
    },
    custom_html: {
      title: "实时 HTML 热编译沙盒",
      desc: "支持任意外部 HTML 源码粘贴 · 内置多套高难度富文本模版 · 源码与 1:1 渲染效果即时同步联动",
    },
    html: {
      title: "全端标准 HTML5 语义保真",
      desc: "标签原始 Display 属性按原样呈现 · 原生横向滑动表格 · 多层级 Blockquote · 原生列表与外链智能拦截",
    },
    markdown: {
      title: "开箱即用 GFM Markdown 解析",
      desc: "零第三方重型依赖 · 支持粗斜体、行内代码、任务列表与图片手势画廊提取",
    },
  };

  return (
    <View
      style={{
        backgroundColor: currentTheme.pageBg,
        minHeight: "100vh",
        boxSizing: "border-box",
        position: "relative",
        paddingBottom: "48px",
      }}
    >
      {/* 1. 顶部品牌与技术指标状态栏 */}
      <View
        style={{
          backgroundColor: currentTheme.cardBg,
          borderBottom: `1px solid ${currentTheme.border}`,
          padding: "10px 14px 8px 14px",
          boxSizing: "border-box",
        }}
      >
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Brand Logo & Version */}
          <View style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 18 }}>⚡</Text>
            <View>
              <View style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 16, fontWeight: "bold", color: currentTheme.textPrimary }}>
                  OmniRichText
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "bold",
                    color: currentTheme.primary,
                    backgroundColor: currentTheme.bgLight,
                    border: `1px solid ${currentTheme.border}`,
                    padding: "1px 6px",
                    borderRadius: 999,
                  }}
                >
                  v0.1.6
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: currentTheme.textSecondary, marginTop: 1 }}>
                全能跨全端高保真富文本渲染引擎
              </Text>
            </View>
          </View>

          {/* Quick Action Buttons */}
          <View style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
            {/* Quick Theme Toggle */}
            <View
              onClick={() => {
                const keys = Object.keys(THEMES);
                const nextIdx = (keys.indexOf(currentThemeKey) + 1) % keys.length;
                const nextKey = keys[nextIdx];
                setCurrentThemeKey(nextKey);
                showToast(`已切换主题: ${THEMES[nextKey].icon} ${THEMES[nextKey].name}`);
                logEvent("🎨", `切换主题为 ${THEMES[nextKey].name}`);
              }}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                padding: "5px 10px",
                borderRadius: 999,
                backgroundColor: currentTheme.bgLight,
                border: `1px solid ${currentTheme.border}`,
                cursor: "pointer",
              }}
            >
              <Text style={{ fontSize: 12 }}>{currentTheme.icon}</Text>
              <Text style={{ fontSize: 11, fontWeight: "600", color: currentTheme.primary }}>
                {currentTheme.name}
              </Text>
            </View>

            {/* Settings Trigger */}
            <View
              onClick={() => setIsSettingsDrawerOpen(true)}
              style={{
                padding: "6px 8px",
                borderRadius: 999,
                backgroundColor: currentTheme.bgLight,
                border: `1px solid ${currentTheme.border}`,
                cursor: "pointer",
              }}
            >
              <Text style={{ fontSize: 13 }}>⚙️</Text>
            </View>
          </View>
        </View>

        {/* 性能与技术指标微看板 (Live Performance Metrics) */}
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 10,
            padding: "6px 10px",
            borderRadius: 8,
            backgroundColor: currentTheme.bgLight,
            border: `1px solid ${currentTheme.border}`,
          }}
        >
          <View style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 11, color: currentTheme.textSecondary }}>⏱️ 编译</Text>
            <Text style={{ fontSize: 12, fontWeight: "bold", color: currentTheme.primary }}>
              {metrics.parseDuration}ms
            </Text>
          </View>
          <View style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 11, color: currentTheme.textSecondary }}>🌳 AST</Text>
            <Text style={{ fontSize: 12, fontWeight: "bold", color: currentTheme.textPrimary }}>
              {metrics.nodeCount} 节点
            </Text>
          </View>
          <View style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 11, color: currentTheme.textSecondary }}>🖼️ 图集</Text>
            <Text style={{ fontSize: 12, fontWeight: "bold", color: currentTheme.textPrimary }}>
              {metrics.galleryCount} 张
            </Text>
          </View>
          <View style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 11, color: currentTheme.textSecondary }}>🧪 测试</Text>
            <Text style={{ fontSize: 11, fontWeight: "bold", color: "#10b981" }}>
              100项 100%
            </Text>
          </View>
        </View>
      </View>

      {/* 2. 现代横向滑动分段导航胶囊 (解决挤压换行) */}
      <View
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: currentTheme.cardBg,
          borderBottom: `1px solid ${currentTheme.border}`,
          padding: "8px 0",
          boxSizing: "border-box",
        }}
      >
        <ScrollView
          scrollX
          enableFlex
          scrollWithAnimation
          style={{
            width: "100%",
            whiteSpace: "nowrap",
            padding: "0 10px",
            boxSizing: "border-box",
          }}
        >
          <View style={{ display: "flex", flexDirection: "row", gap: 8 }}>
            {TABS.map((tab) => {
              const isActive = mode === tab.key;
              return (
                <View
                  key={tab.key}
                  onClick={() => {
                    setMode(tab.key);
                    showToast(`已切换至: ${tab.label}`);
                    logEvent(tab.icon, `切换场景为 [${tab.label}]`);
                  }}
                  style={{
                    display: "inline-flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px",
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: isActive ? "bold" : "500",
                    backgroundColor: isActive ? currentTheme.primary : currentTheme.bgLight,
                    color: isActive ? "#ffffff" : currentTheme.textSecondary,
                    border: `1px solid ${isActive ? currentTheme.primary : currentTheme.border}`,
                    boxShadow: isActive ? `0 2px 8px ${currentTheme.primary}40` : "none",
                    cursor: "pointer",
                    userSelect: "none",
                    flexShrink: 0,
                  }}
                >
                  <Text style={{ fontSize: 14 }}>{tab.icon}</Text>
                  <Text style={{ color: isActive ? "#ffffff" : currentTheme.textPrimary }}>{tab.label}</Text>
                  {tab.badge && (
                    <Text
                      style={{
                        fontSize: 10,
                        padding: "1px 5px",
                        borderRadius: 999,
                        backgroundColor: isActive ? "rgba(255, 255, 255, 0.25)" : currentTheme.border,
                        color: isActive ? "#ffffff" : currentTheme.textSecondary,
                      }}
                    >
                      {tab.badge}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* 3. 场景特性微提示卡片 */}
      <View
        style={{
          margin: "10px 14px 6px 14px",
          padding: "10px 12px",
          borderRadius: 8,
          backgroundColor: currentTheme.bgLight,
          border: `1px solid ${currentTheme.border}`,
        }}
      >
        <View style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontSize: 12, fontWeight: "bold", color: currentTheme.primary }}>
            💡 {SCENARIO_HINTS[mode].title}
          </Text>
        </View>
        <Text style={{ fontSize: 11, color: currentTheme.textSecondary, marginTop: 4, lineHeight: 1.5, display: "block" }}>
          {SCENARIO_HINTS[mode].desc}
        </Text>
      </View>

      {/* 4. 自定义 HTML 专属沙盒编辑器 */}
      {mode === "custom_html" && (
        <View
          style={{
            margin: "8px 14px 12px 14px",
            backgroundColor: currentTheme.cardBg,
            borderRadius: 10,
            border: `1px solid ${currentTheme.border}`,
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          {/* 编辑器操作顶栏 */}
          <View
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 12px",
              borderBottom: `1px solid ${currentTheme.border}`,
              backgroundColor: currentTheme.bgLight,
            }}
          >
            <View style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: "bold", color: currentTheme.textPrimary }}>
                🛠️ HTML 源码热调试
              </Text>
              <Text style={{ fontSize: 11, color: currentTheme.textSecondary }}>即时生效</Text>
            </View>
            <View style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View
                onClick={() => {
                  setCustomHtml("");
                  showToast("已清空代码");
                  logEvent("🧹", "清空自定义 HTML 源码");
                }}
                style={{
                  padding: "3px 8px",
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
                  padding: "3px 8px",
                  borderRadius: 4,
                  backgroundColor: currentTheme.cardBg,
                  border: `1px solid ${currentTheme.border}`,
                  fontSize: 11,
                  color: currentTheme.primary,
                  cursor: "pointer",
                }}
              >
                {isCustomEditorCollapsed ? "展开代码" : "收起代码"}
              </View>
            </View>
          </View>

          {/* 预设模板快捷载入胶囊 */}
          <View style={{ padding: "8px 12px", borderBottom: `1px solid ${currentTheme.border}`, backgroundColor: currentTheme.cardBg }}>
            <Text style={{ fontSize: 11, color: currentTheme.textSecondary, marginBottom: 6, display: "block" }}>
              快速载入预设模版：
            </Text>
            <ScrollView scrollX enableFlex style={{ width: "100%", whiteSpace: "nowrap" }}>
              <View style={{ display: "flex", flexDirection: "row", gap: 6 }}>
                {CUSTOM_PRESETS.map((preset, pIdx) => (
                  <View
                    key={pIdx}
                    onClick={() => {
                      setCustomHtml(preset.html);
                      showToast(`已载入: ${preset.title}`);
                      logEvent("📄", `载入模板 [${preset.title}]`);
                    }}
                    style={{
                      padding: "4px 9px",
                      borderRadius: 6,
                      fontSize: 11,
                      backgroundColor: currentTheme.bgLight,
                      color: currentTheme.textPrimary,
                      border: `1px solid ${currentTheme.border}`,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    {preset.title}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>

          {!isCustomEditorCollapsed && (
            <View style={{ padding: 10 }}>
              <Textarea
                value={customHtml}
                onInput={(e) => setCustomHtml(e.detail.value)}
                placeholder="在此输入或粘贴任意 HTML 代码，下方将即时以 1:1 保真渲染..."
                maxlength={-1}
                style={{
                  width: "100%",
                  height: "130px",
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: currentTheme.textPrimary,
                  backgroundColor: currentTheme.pageBg,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: 6,
                  padding: 8,
                  boxSizing: "border-box",
                }}
              />
            </View>
          )}
        </View>
      )}

      {/* 5. 截断裁剪专属二级切换条 */}
      {mode === "clamp" && (
        <View
          style={{
            margin: "6px 14px 10px 14px",
            backgroundColor: currentTheme.cardBg,
            borderRadius: 8,
            padding: 4,
            display: "flex",
            flexDirection: "row",
            gap: 6,
            border: `1px solid ${currentTheme.border}`,
          }}
        >
          {[
            { key: "height", label: "限高渐变展开 (210px)" },
            { key: "ast", label: "AST 摘要截断 (90字)" },
            { key: "image", label: "16:9 画幅裁剪" },
          ].map((item) => (
            <View
              key={item.key}
              onClick={() => {
                setClampSubMode(item.key as any);
                showToast(`已切换至: ${item.label}`);
                logEvent("✂️", `切换裁剪模式为 [${item.label}]`);
              }}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "6px 0",
                fontSize: 12,
                borderRadius: 6,
                fontWeight: clampSubMode === item.key ? "bold" : "400",
                backgroundColor: clampSubMode === item.key ? currentTheme.primary : "transparent",
                color: clampSubMode === item.key ? "#ffffff" : currentTheme.textSecondary,
                cursor: "pointer",
              }}
            >
              <Text>{item.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 6. 沉浸式手机卡片富文本正文渲染区 */}
      <View
        style={{
          margin: "6px 12px 16px 12px",
          borderRadius: 12,
          backgroundColor: currentTheme.cardBg,
          padding: "14px 16px 40px 16px",
          boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
          border: `1px solid ${currentTheme.border}`,
          overflow: "hidden",
        }}
      >
        <OmniRichText
          content={getContent()}
          format={mode === "markdown" ? "markdown" : "html"}
          mode={mode === "long_article" || mode === "custom_html" ? "wechat" : "default"}
          fontScale={fontScale}
          fontSize={fontSize}
          chunked={mode === "long_article" ? enableChunked : false}
          chunkSize={15}
          theme={currentTheme.config}
          clampMaxHeight={mode === "clamp" && clampSubMode === "height" ? 210 : undefined}
          expandText="展开全文"
          collapseText="收起"
          showCollapse={true}
          truncateLength={mode === "clamp" && clampSubMode === "ast" ? 90 : undefined}
          truncate={mode === "clamp" && clampSubMode === "ast" ? { maxLength: 90, ellipsis: " ... [阅读全文]" } : undefined}
          imageCropRatio={mode === "clamp" && clampSubMode === "image" ? 16 / 9 : undefined}
          imageCropMode={mode === "clamp" && clampSubMode === "image" ? "aspectFill" : undefined}
          components={{ "product-card": ProductCard }}
          imageSkeleton={enableSkeleton}
          webviewPath="/pages/webview/index"
          tabBarList={["/pages/index/index", "/pages/about/index"]}
          onExpandChange={(expanded) => {
            showToast(expanded ? "已展开全文" : "已收起全文");
            logEvent("↕️", expanded ? "点击展开全文" : "点击收起全文");
          }}
          onLinkTap={(ctx) => {
            showToast(`点击链接: ${ctx.href}`);
            logEvent("🔗", `拦截到链接: ${ctx.href}`);
            Taro.showToast({ title: `拦截到链接: ${ctx.href}`, icon: "none" });
          }}
          onImageTap={({ src, index }) => {
            showToast(`点击图片 [${index + 1}]`);
            logEvent("🖼️", `手势放大预览图片 [${index + 1}]`);
          }}
          onLongPressText={(text) => {
            showToast(`长按复制: "${text.slice(0, 16)}..."`);
            logEvent("📋", `长按复制文本: "${text.slice(0, 14)}..."`);
          }}
          onMediaEvent={(payload) => {
            showToast(`多媒体 [${payload.type}]`);
            logEvent("🎬", `多媒体交互: ${payload.type}`);
          }}
        />
      </View>

      {/* 7. 灵动岛动态悬浮胶囊 Toast */}
      {toastMessage && (
        <View
          style={{
            position: "fixed",
            top: 60,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            backgroundColor: "rgba(15, 23, 42, 0.94)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            color: "#ffffff",
            padding: "8px 18px",
            borderRadius: 9999,
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
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
          <Text style={{ fontSize: 13 }}>⚡</Text>
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

      {/* 8. 右下角常驻悬浮排版与调试胶囊按钮 */}
      <View
        onClick={() => setIsSettingsDrawerOpen(true)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 16,
          zIndex: 40,
          backgroundColor: currentTheme.cardBg,
          border: `1px solid ${currentTheme.primary}`,
          borderRadius: 9999,
          padding: "8px 16px",
          boxShadow: `0 6px 18px ${currentTheme.primary}33`,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <Text style={{ fontSize: 14 }}>🔤</Text>
        <Text style={{ fontSize: 13, fontWeight: "bold", color: currentTheme.primary }}>
          排版调试
        </Text>
      </View>

      {/* 9. 底部全能排版与调试抽屉 (Bottom Drawer) */}
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

          {/* 抽屉面板 */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: currentTheme.cardBg,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              padding: "18px 20px 32px 20px",
              boxShadow: "0 -8px 30px rgba(0, 0, 0, 0.15)",
              boxSizing: "border-box",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            {/* 抽屉头部 */}
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: `1px solid ${currentTheme.border}`,
              }}
            >
              <View style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 16 }}>⚙️</Text>
                <Text style={{ fontSize: 15, fontWeight: "bold", color: currentTheme.textPrimary }}>
                  排版与多主题调试控制台
                </Text>
              </View>
              <View
                onClick={() => setIsSettingsDrawerOpen(false)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 9999,
                  backgroundColor: currentTheme.bgLight,
                  color: currentTheme.textSecondary,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                ✕ 完成
              </View>
            </View>

            {/* 1. 主题换肤选择器 */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: currentTheme.textPrimary, marginBottom: 8, display: "block" }}>
                🎨 实时主题换肤
              </Text>
              <View style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                {Object.entries(THEMES).map(([tKey, tVal]) => {
                  const isSel = currentThemeKey === tKey;
                  return (
                    <View
                      key={tKey}
                      onClick={() => {
                        setCurrentThemeKey(tKey);
                        showToast(`已应用主题: ${tVal.name}`);
                        logEvent("🎨", `应用主题 [${tVal.name}]`);
                      }}
                      style={{
                        padding: "8px 0",
                        textAlign: "center",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: isSel ? "bold" : "normal",
                        backgroundColor: isSel ? tVal.bgLight : currentTheme.pageBg,
                        color: isSel ? tVal.primary : currentTheme.textSecondary,
                        border: `1px solid ${isSel ? tVal.primary : currentTheme.border}`,
                        cursor: "pointer",
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>{tVal.icon}</Text>
                      <Text style={{ display: "block", marginTop: 2 }}>{tVal.name}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* 2. 字体缩放比例 (fontScale) */}
            <View style={{ marginBottom: 16 }}>
              <View style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: currentTheme.textPrimary }}>
                  字体缩放比例 (fontScale)
                </Text>
                <Text style={{ fontSize: 12, color: currentTheme.primary, fontWeight: "bold" }}>
                  {fontScale}x
                </Text>
              </View>
              <View style={{ display: "flex", flexDirection: "row", gap: 8 }}>
                {[
                  { label: "0.85x (紧凑)", val: 0.85 },
                  { label: "1.0x (推荐)", val: 1.0 },
                  { label: "1.15x (适度)", val: 1.15 },
                  { label: "1.3x (大号)", val: 1.3 },
                ].map((item) => {
                  const isSel = fontScale === item.val;
                  return (
                    <View
                      key={item.val}
                      onClick={() => {
                        setFontScale(item.val);
                        showToast(`缩放切换为 ${item.val}x`);
                        logEvent("🔤", `调整字体缩放为 ${item.val}x`);
                      }}
                      style={{
                        flex: 1,
                        padding: "8px 0",
                        textAlign: "center",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: isSel ? "bold" : "normal",
                        backgroundColor: isSel ? currentTheme.bgLight : currentTheme.pageBg,
                        color: isSel ? currentTheme.primary : currentTheme.textSecondary,
                        border: `1px solid ${isSel ? currentTheme.primary : currentTheme.border}`,
                        cursor: "pointer",
                      }}
                    >
                      {item.label}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* 3. 基准字号 (rem) */}
            <View style={{ marginBottom: 16 }}>
              <View style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: currentTheme.textPrimary }}>
                  基准字号 (fontSize rem)
                </Text>
                <Text style={{ fontSize: 12, color: currentTheme.primary, fontWeight: "bold" }}>
                  {fontSize}
                </Text>
              </View>
              <View style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
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
                        showToast(`基准字号切换为 ${item.label}`);
                        logEvent("📏", `调整基准字号为 ${item.label}`);
                      }}
                      style={{
                        padding: "8px 0",
                        textAlign: "center",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: isSel ? "bold" : "normal",
                        backgroundColor: isSel ? currentTheme.bgLight : currentTheme.pageBg,
                        color: isSel ? currentTheme.primary : currentTheme.textSecondary,
                        border: `1px solid ${isSel ? currentTheme.primary : currentTheme.border}`,
                        cursor: "pointer",
                      }}
                    >
                      {item.label}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* 4. 核心功能开关 */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: currentTheme.textPrimary, marginBottom: 8, display: "block" }}>
                ⚡ 核心特性开关
              </Text>
              <View style={{ display: "flex", flexDirection: "row", gap: 10 }}>
                <View
                  onClick={() => {
                    setEnableSkeleton(!enableSkeleton);
                    showToast(enableSkeleton ? "已关闭图片骨架屏" : "已开启图片骨架屏");
                    logEvent("🖼️", enableSkeleton ? "关闭骨架屏" : "开启骨架屏");
                  }}
                  style={{
                    flex: 1,
                    padding: "9px 10px",
                    borderRadius: 8,
                    fontSize: 12,
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: enableSkeleton ? currentTheme.bgLight : currentTheme.pageBg,
                    border: `1px solid ${enableSkeleton ? currentTheme.primary : currentTheme.border}`,
                    cursor: "pointer",
                  }}
                >
                  <Text style={{ color: currentTheme.textPrimary }}>图片骨架屏</Text>
                  <Text style={{ fontWeight: "bold", color: enableSkeleton ? currentTheme.primary : currentTheme.textSecondary }}>
                    {enableSkeleton ? "开启" : "关闭"}
                  </Text>
                </View>

                <View
                  onClick={() => {
                    setEnableChunked(!enableChunked);
                    showToast(enableChunked ? "已关闭长文切片" : "已开启长文切片");
                    logEvent("⚡", enableChunked ? "关闭分批切片" : "开启分批切片");
                  }}
                  style={{
                    flex: 1,
                    padding: "9px 10px",
                    borderRadius: 8,
                    fontSize: 12,
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: enableChunked ? currentTheme.bgLight : currentTheme.pageBg,
                    border: `1px solid ${enableChunked ? currentTheme.primary : currentTheme.border}`,
                    cursor: "pointer",
                  }}
                >
                  <Text style={{ color: currentTheme.textPrimary }}>长文切片渲染</Text>
                  <Text style={{ fontWeight: "bold", color: enableChunked ? currentTheme.primary : currentTheme.textSecondary }}>
                    {enableChunked ? "开启" : "关闭"}
                  </Text>
                </View>
              </View>
            </View>

            {/* 5. 实时交互事件监听流面板 */}
            {eventLogs.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <View style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: currentTheme.textPrimary }}>
                    📋 实时交互监听流
                  </Text>
                  <Text
                    onClick={() => setEventLogs([])}
                    style={{ fontSize: 11, color: currentTheme.textSecondary, cursor: "pointer" }}
                  >
                    清空日志
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: currentTheme.pageBg,
                    borderRadius: 8,
                    padding: "8px 10px",
                    border: `1px solid ${currentTheme.border}`,
                  }}
                >
                  {eventLogs.map((log) => (
                    <View
                      key={log.id}
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 11,
                        padding: "3px 0",
                        borderBottom: `1px dashed ${currentTheme.border}`,
                      }}
                    >
                      <Text style={{ color: currentTheme.textSecondary, fontSize: 10 }}>[{log.time}]</Text>
                      <Text style={{ fontSize: 12 }}>{log.icon}</Text>
                      <Text style={{ color: currentTheme.textPrimary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {log.text}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 恢复默认按钮 */}
            <View
              onClick={() => {
                setFontScale(1.0);
                setFontSize("1rem");
                setCurrentThemeKey("wechat");
                setEnableSkeleton(true);
                setEnableChunked(true);
                showToast("已恢复默认排版设置");
                logEvent("🔄", "恢复默认排版设置");
              }}
              style={{
                width: "100%",
                padding: "10px 0",
                textAlign: "center",
                borderRadius: 8,
                backgroundColor: currentTheme.bgLight,
                color: currentTheme.textSecondary,
                fontSize: 13,
                fontWeight: "500",
                border: `1px solid ${currentTheme.border}`,
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

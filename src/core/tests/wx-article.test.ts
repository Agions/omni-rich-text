import { describe, it, expect } from 'vitest';
import { parseRichContent } from '../index';

describe('WeChat Official Account Article Parsing & Fidelity', () => {
  // Scenario 1: Text Typography & Headings
  it('should parse text typography with content styles and inline tags', () => {
    const html = `
      <section class="title-section" style="box-sizing: border-box;">
        <h1 style="font-size: 22px; font-weight: bold;">微信公众号深度架构解析</h1>
        <p style="text-indent: 2em; line-height: 2;">
          在<strong>现代跨端应用</strong>中，微信公众号的排版<em>极具代表性</em>。
          本文将探讨<u>核心实现要点</u>，包含<del>旧版方案</del>与<mark>最新实践</mark>。
        </p>
      </section>
    `;

    const result = parseRichContent(html, { mode: 'wechat' });
    expect(result.ast).toHaveLength(1);

    const section = result.ast[0];
    expect(section.name).toBe('section');
    expect(section.styleObj['box-sizing']).toBe('border-box');

    const h1 = section.children?.[0];
    expect(h1?.name).toBe('h1');
    // Font size uses baseFontSize delta: 22px (=contentBase) -> delta=0 -> mappedPx=15 -> 15/18.75 = 0.8rem
    expect(h1?.styleObj['font-size']).toBe('0.8rem');
    expect(h1?.styleObj['font-weight']).toBe('bold');

    const p = section.children?.[1];
    expect(p?.name).toBe('p');
    expect(p?.styleObj['text-indent']).toBe('2em');
    expect(p?.styleObj['line-height']).toBe('2');
  });

  // Scenario 2: Image Handling, data-src, and data-ratio
  it('should map data-src to src and calculate aspect ratio from data-ratio', () => {
    const html = `
      <section>
        <p>如下所示为系统架构图：</p>
        <figure>
          <img
            data-src="https://mmbiz.qpic.cn/mmbiz_png/arch_overview/640"
            data-ratio="0.5625"
            data-w="1080"
            alt="系统架构总览"
          />
          <figcaption style="color: #888888; text-align: center;">图 1.1 系统架构图</figcaption>
        </figure>
      </section>
    `;

    const result = parseRichContent(html, { mode: 'wechat' });
    expect(result.galleryList).toContain('https://mmbiz.qpic.cn/mmbiz_png/arch_overview/640');
    expect(result.rawImages).toHaveLength(1);

    const section = result.ast[0];
    const figure = section.children?.[1];
    expect(figure?.name).toBe('figure');

    const img = figure?.children?.[0];
    expect(img?.name).toBe('img');
    expect(img?.attrs.src).toBe('https://mmbiz.qpic.cn/mmbiz_png/arch_overview/640');
    expect(img?.extra?.dataRatio).toBe(0.5625);
    expect(img?.extra?.placeholderHeight).toBe('56.25%');

    const caption = figure?.children?.[1];
    expect(caption?.name).toBe('figcaption');
    expect(caption?.styleObj['color']).toBe('#888888');
    expect(caption?.styleObj['text-align']).toBe('center');
  });

  // Scenario 3: Complex Card & Background Layout with Nested Sections and <style>
  it('should preserve nested sections, background colors, and extract <style> class rules', () => {
    const html = `
      <style>
        .custom-card {
          background-color: #f6f8fa;
          border: 1px solid #e1e4e8;
          border-radius: 8px;
          padding: 16px;
        }
        .highlight-text {
          color: #07c160;
          font-weight: bold;
        }
      </style>
      <section class="custom-card">
        <section style="display: flex; align-items: center;">
          <span class="highlight-text">微信专栏</span>
        </section>
        <p style="margin-top: 8px;">欢迎关注我们的技术公众号。</p>
        <blockquote style="border-left: 3px solid #dcdfe6;">这是一段精选的技术引用文案。</blockquote>
        <hr />
      </section>
    `;

    const result = parseRichContent(html, { mode: 'wechat' });
    expect(result.ast).toHaveLength(1);

    const card = result.ast[0];
    expect(card.name).toBe('section');
    expect(card.styleObj['background-color']).toBe('#f6f8fa');
    expect(card.styleObj['border']).toBe('1px solid #e1e4e8');
    // 8px converted to rem and halved: (8 * 0.5) / 18.75 = 0.2133rem
    expect(card.styleObj['border-radius']).toBe('0.2133rem');

    const innerSection = card.children?.[0];
    expect(innerSection?.styleObj['display']).toBe('flex');

    const span = innerSection?.children?.[0];
    expect(span?.styleObj['color']).toBe('#07c160');
    expect(span?.styleObj['font-weight']).toBe('bold');

    const blockquote = card.children?.[2];
    expect(blockquote?.name).toBe('blockquote');
    // 3px converted to rem and halved: (3 * 0.5) / 18.75 = 0.08rem
    expect(blockquote?.styleObj['border-left']).toBe('0.08rem solid #dcdfe6');
  });

  // Scenario 4: Media Elements & WeChat Ignored Tags Filtering
  it('should support video/audio and ignore mpvoice / mp-miniprogram / mp-vote tags', () => {
    const html = `
      <section>
        <video src="https://example.com/demo.mp4" poster="https://example.com/poster.jpg" controls="true"></video>
        <audio src="https://example.com/audio.mp3" title="背景配乐"></audio>
        <mpvoice src="voice_12345" name="语音问候"></mpvoice>
        <mp-miniprogram appid="wx123456" path="/pages/index"></mp-miniprogram>
        <mp-vote voteid="9999"></mp-vote>
        <p>文末结语</p>
      </section>
    `;

    const result = parseRichContent(html, { mode: 'wechat' });
    const section = result.ast[0];
    const children = section.children || [];

    const video = children.find((c) => c.name === 'video');
    expect(video).toBeDefined();
    expect(video?.attrs.src).toBe('https://example.com/demo.mp4');

    const audio = children.find((c) => c.name === 'audio');
    expect(audio).toBeDefined();
    expect(audio?.attrs.src).toBe('https://example.com/audio.mp3');

    const mpvoice = children.find((c) => c.name === 'mpvoice');
    expect(mpvoice?.extra?.wxIgnored).toBe(true);

    const mpProgram = children.find((c) => c.name === 'mp-miniprogram');
    expect(mpProgram?.extra?.wxIgnored).toBe(true);

    const mpVote = children.find((c) => c.name === 'mp-vote');
    expect(mpVote?.extra?.wxIgnored).toBe(true);

    const p = children.find((c) => c.name === 'p');
    expect(p).toBeDefined();
  });

  // Scenario 5: SVG Decorative Elements
  it('should parse SVG tags, preserving viewBox and paths for decorative shapes', () => {
    const html = `
      <section>
        <svg viewBox="0 0 100 100" width="24" height="24">
          <circle cx="50" cy="50" r="40" stroke="#07c160" stroke-width="4" fill="#e8f8f0" />
        </svg>
      </section>
    `;

    const result = parseRichContent(html, { mode: 'wechat' });
    const section = result.ast[0];
    const svg = section.children?.[0];

    expect(svg?.name).toBe('svg');
    expect(svg?.extra?.isSvg).toBe(true);
    expect(svg?.attrs.viewbox).toBe('0 0 100 100');

    const circle = svg?.children?.[0];
    expect(circle?.name).toBe('circle');
    expect(circle?.attrs.cx).toBe('50');
    expect(circle?.attrs.fill).toBe('#e8f8f0');
  });

  // Scenario 6: Table and Code Block Rendering
  it('should render table and syntax-highlighted code block accurately', () => {
    const html = `
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr><th>平台</th><th>支持度</th></tr>
        </thead>
        <tbody>
          <tr><td>微信小程序</td><td>100%</td></tr>
          <tr><td>H5</td><td>100%</td></tr>
        </tbody>
      </table>
      <pre><code class="language-typescript">const message = "Hello WeChat";</code></pre>
    `;

    const result = parseRichContent(html, { mode: 'wechat' });
    expect(result.ast).toHaveLength(2);

    const table = result.ast[0];
    expect(table.name).toBe('table');
    expect(table.styleObj['border-collapse']).toBe('collapse');

    const pre = result.ast[1];
    expect(pre.name).toBe('pre');
    const code = pre.children?.[0];
    expect(code?.name).toBe('code');
    expect(code?.extra?.isCodeBlock).toBe(true);
    expect(code?.extra?.lang).toBe('typescript');
  });
});

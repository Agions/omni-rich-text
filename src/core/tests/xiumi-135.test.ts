import { describe, it, expect } from 'vitest';
import {
  parseRichContent,
  parseStyleString,
  hasForeignObject,
  splitSvgForeignObject,
  extractSvgViewBoxRatio,
  serializeSvgToXml,
  hasVisualStyles,
  isUnwrappableWrapper,
  pruneAST
} from '../index';

describe('Xiumi (秀米) and 135 Editor (135编辑器) 100% Fidelity Compatibility', () => {
  // Test 1: Style parser with semicolon-containing Data URIs and URLs
  it('should parse background-image with embedded semicolons in Data URI without premature splitting', () => {
    const rawStyle = "background-image: url('data:image/svg+xml;utf8,<svg viewBox=\"0 0 10 10\"><path fill=\"%2307c160\"/></svg>'); width: 120px; height: 40px; margin: 0 auto;";
    const styleObj = parseStyleString(rawStyle);

    expect(styleObj['background-image']).toBe("url('data:image/svg+xml;utf8,<svg viewBox=\"0 0 10 10\"><path fill=\"%2307c160\"/></svg>')");
    expect(styleObj['width']).toBe('120px');
    expect(styleObj['height']).toBe('40px');
    expect(styleObj['margin']).toBe('0 auto');
  });

  // Test 2: SVG containing <foreignObject> layout container
  it('should detect and split SVG with foreignObject into background shapes and interactive HTML children', () => {
    const html = `
      <svg viewBox="0 0 375 220" style="width: 100%; display: block;">
        <rect width="100%" height="100%" fill="#fef8f0" rx="8" />
        <foreignObject width="100%" height="100%">
          <div style="padding: 16px; color: #d46b08;">
            <h3 style="margin: 0; font-size: 16px;">135 编辑器精选推荐</h3>
            <p style="margin: 6px 0 0 0; font-size: 13px;">包含富文本段落与外部超链接</p>
            <a href="https://example.com/item" style="color: #1677ff;">点击查看详情</a>
          </div>
        </foreignObject>
      </svg>
    `;

    const result = parseRichContent(html, { mode: 'wechat' });
    expect(result.ast).toHaveLength(1);
    const svgNode = result.ast[0];

    expect(svgNode.name).toBe('svg');
    expect(hasForeignObject(svgNode)).toBe(true);

    const { bgSvgXml, foreignObjectNodes } = splitSvgForeignObject(svgNode);
    expect(bgSvgXml).toContain('<rect');
    expect(bgSvgXml).not.toContain('<foreignObject');

    expect(foreignObjectNodes).toHaveLength(1);
    const fo = foreignObjectNodes[0];
    expect(fo.name).toBe('foreignobject');
    expect(fo.children).toHaveLength(1);
    expect(fo.children![0].name).toBe('div');
  });

  // Test 3: SVG viewBox aspect-ratio extraction and dimension injection
  it('should calculate viewBox aspect ratio and inject natural dimensions in SVG XML', () => {
    const html = `<svg viewBox="0 0 1080 360" style="width: 100%; display: block;"><path d="M0 0h1080v360H0z" fill="#07c160"/></svg>`;
    const result = parseRichContent(html, { mode: 'wechat' });
    const svgNode = result.ast[0];

    const ratio = extractSvgViewBoxRatio(svgNode);
    expect(ratio).toBe(3); // 1080 / 360 = 3

    const xml = serializeSvgToXml(svgNode);
    expect(xml).toContain('width="1080"');
    expect(xml).toContain('height="360"');
    expect(xml).toContain('preserveAspectRatio="xMidYMid meet"');
    expect(xml).toContain('viewBox="0 0 1080 360"');
  });

  // Test 4: Preservation of font-size: 0 for inline-block column whitespace elimination
  it('should preserve font-size: 0 verbatim without mapping to 8px or non-zero rem', () => {
    const html = `
      <section style="font-size: 0; text-align: center;">
        <section style="display: inline-block; width: 49%; font-size: 14px;">
          <p>左列内容</p>
        </section>
        <section style="display: inline-block; width: 49%; font-size: 14px;">
          <p>右列内容</p>
        </section>
      </section>
    `;

    const result = parseRichContent(html, { mode: 'wechat', baseFontSize: 15 });
    const parent = result.ast[0];
    expect(parent.styleObj['font-size']).toBe('0');
  });

  // Test 5: Asymmetric Flex row (Avatar + Text Bio) protection
  it('should not force equal 50% width on asymmetric flex rows (avatar + bio)', () => {
    const html = `
      <section style="display: flex; align-items: center;">
        <section style="width: 80px; flex-shrink: 0;">
          <img src="https://example.com/avatar.jpg" style="width: 80px; height: 80px; border-radius: 50%;" />
        </section>
        <section style="flex: 1; margin-left: 12px;">
          <h4 style="margin: 0; font-size: 16px;">架构师</h4>
          <p style="margin: 4px 0 0 0; font-size: 13px;">专栏作者介绍信息</p>
        </section>
      </section>
    `;

    const result = parseRichContent(html, { mode: 'wechat' });
    const flexRow = result.ast[0];
    const avatarCol = flexRow.children?.[0];
    const bioCol = flexRow.children?.[1];

    // Avatar column width must stay 80px (80 / 18.75 = 4.2667rem), not forced to 50%
    expect(avatarCol?.styleObj['width']).toBe('4.2667rem');
    expect(avatarCol?.styleObj['flex']).not.toBe('1 1 0%');

    // Bio text column must keep its authored flex: 1, not forced to 50%
    expect(bioCol?.styleObj['flex']).toBe('1');
    expect(bioCol?.styleObj['width']).toBeUndefined();
  });

  // Test 6: Negative margins and rotation transforms in Xiumi badges
  it('should preserve negative margins and rotate transforms', () => {
    const html = `
      <section style="position: relative; margin-top: -30px; margin-left: 15px; transform: rotate(-3deg);">
        <span style="background: #07c160; color: #fff; padding: 4px 8px; border-radius: 4px;">置顶徽章</span>
      </section>
    `;

    const result = parseRichContent(html, { mode: 'wechat' });
    const badge = result.ast[0];
    // -30px / 18.75 = -1.6rem
    expect(badge.styleObj['margin-top']).toBe('-1.6rem');
    expect(badge.styleObj['transform']).toBe('rotate(-3deg)');
  });

  // Test 7: Intentional vertical spacers with margin-top must not be pruned
  it('should preserve intentional vertical spacer blocks with non-zero margins during pruning', () => {
    const html = `
      <div>
        <p>上部分内容</p>
        <section style="margin-top: 25px;"></section>
        <p>下部分内容</p>
      </div>
    `;

    const result = parseRichContent(html, { mode: 'wechat', prune: true });
    const rootDiv = result.ast[0];
    // Should have 3 children: paragraph, spacer section, paragraph
    expect(rootDiv.children).toHaveLength(3);
    const spacer = rootDiv.children?.[1];
    expect(spacer?.name).toBe('section');
    expect(hasVisualStyles(spacer!)).toBe(true);
  });

  // Test 8: Centering wrapper with text-align: center must not be unwrapped
  it('should not unwrap parent wrappers with text-align: center to preserve inline-block centering', () => {
    const html = `
      <section style="text-align: center; margin: 15px 0;">
        <section style="display: inline-block; width: 60px; height: 30px; background: #07c160;">
          <span>按钮</span>
        </section>
      </section>
    `;

    const result = parseRichContent(html, { mode: 'wechat', prune: true });
    // Outer section must NOT be stripped
    expect(result.ast).toHaveLength(1);
    const outer = result.ast[0];
    expect(outer.name).toBe('section');
    expect(outer.styleObj['text-align']).toBe('center');
    expect(outer.children?.[0]?.name).toBe('section');
    expect(outer.children?.[0]?.styleObj['display']).toBe('inline-block');
  });

  // Test 9: HTML attribute width/height on img must not be overwritten by width: 100%
  it('should preserve explicit HTML attribute width="48" on small badges instead of forcing 100%', () => {
    const html = `<p><img src="https://example.com/badge.png" width="48" height="48" alt="徽章" /></p>`;
    const result = parseRichContent(html, { mode: 'wechat' });
    const p = result.ast[0];
    const img = p.children?.[0];

    expect(img?.name).toBe('img');
    // 48px / 18.75 = 2.56rem
    expect(img?.styleObj['width']).toBe('2.56rem');
    expect(img?.styleObj['height']).toBe('2.56rem');
    expect(img?.styleObj['width']).not.toBe('100%');
  });

  // Test 10: Decorated inline spans (pill badges, highlighted background tags) must be treated as box elements
  it('should treat decorated inline spans (padding, background, border, shadow) as non-pure-text to preserve box styling in mini programs', () => {
    const html = `
      <p>
        <span style="color: #666;">纯文字标签</span>
        <span style="background-color: #ff4d4f; color: #fff; padding: 3px 8px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">胶囊徽章</span>
      </p>
    `;
    const result = parseRichContent(html, { mode: 'wechat' });
    const p = result.ast[0];
    const plainSpan = p.children?.[0];
    const decoratedSpan = p.children?.[1];

    // Plain span can be rendered as pure inline text
    expect(plainSpan?.extra?.isInline).toBe(true);

    // Decorated span with padding/background/border/shadow must NOT be pure inline text,
    // ensuring it renders as an inline-block <View> in mini-programs with full box-model support
    expect(decoratedSpan?.extra?.isInline).toBe(false);
    expect(decoratedSpan?.styleObj['background-color']).toBe('#ff4d4f');
    expect(decoratedSpan?.styleObj['border-radius']).toBeDefined();
    expect(decoratedSpan?.styleObj['padding']).toBeDefined();
  });

  // Test 11: Small fixed-width elements (avatars, icons <= 200px) inside columns must NOT be forced to 100%
  it('should not force width: 100% on small decorative items (56px avatar/icon) inside columns', () => {
    const html = `
      <section style="display: flex;">
        <section style="width: 50%;">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: #07c160;">
            <img src="https://example.com/icon.png" style="width: 100%;" />
          </div>
        </section>
        <section style="width: 50%;">
          <p>文字说明</p>
        </section>
      </section>
    `;
    const result = parseRichContent(html, { mode: 'wechat' });
    const row = result.ast[0];
    const col1 = row.children?.[0];
    const iconWrapper = col1?.children?.[0];

    // 56px / 18.75 = 2.9867rem, should NOT be overwritten to width: 100%
    expect(iconWrapper?.styleObj['width']).toBe('2.9867rem');
    expect(iconWrapper?.styleObj['width']).not.toBe('100%');
  });

  // Test 12: Background image URLs containing 'px' must not be corrupted by dimension rem conversion
  it('should protect background-image URLs and query parameters containing px from being corrupted into rem', () => {
    const html = `
      <div style="background-image: url('https://cdn.example.com/banner-800px.png?w=600px'); width: 375px; height: 180px;">
        <p>带大图背景的卡片</p>
      </div>
    `;
    const result = parseRichContent(html, { mode: 'wechat' });
    const div = result.ast[0];

    // URL must be 100% intact, not corrupted into banner-42.6667rem.png
    expect(div.styleObj['background-image']).toBe("url('https://cdn.example.com/banner-800px.png?w=600px')");
    // Dimensions should be converted to rem as expected
    expect(div.styleObj['width']).toBe('20rem');
    expect(div.styleObj['height']).toBe('9.6rem');
  });

  // Test 13: text-indent dimension conversion and preservation
  it('should convert and preserve text-indent in pixels and relative units', () => {
    const html = `
      <div>
        <p style="text-indent: 32px; letter-spacing: 2px;">首行缩进段落</p>
        <p style="text-indent: 2em;">em 缩进段落</p>
      </div>
    `;
    const result = parseRichContent(html, { mode: 'wechat' });
    const div = result.ast[0];
    const p1 = div.children?.[0];
    const p2 = div.children?.[1];

    // 32px / 18.75 = 1.7067rem
    expect(p1?.styleObj['text-indent']).toBe('1.7067rem');
    expect(p1?.styleObj['letter-spacing']).toBe('0.1067rem');
    expect(p2?.styleObj['text-indent']).toBe('2em');
  });

  // Test 14: Asymmetric product card (left fixed 120px cover, right content) preservation
  it('should preserve fixed column width on asymmetric product card with images in both columns', () => {
    const html = `
      <section style="display: flex;">
        <section style="width: 120px; flex-shrink: 0;">
          <img src="https://example.com/cover.jpg" style="width: 100%;" />
        </section>
        <section style="flex: 1;">
          <h4>商品名称</h4>
          <p>详细介绍</p>
          <img src="https://example.com/badge.png" style="width: 24px; height: 24px;" />
        </section>
      </section>
    `;
    const result = parseRichContent(html, { mode: 'wechat' });
    const row = result.ast[0];
    const colLeft = row.children?.[0];
    const colRight = row.children?.[1];

    // Left column should keep its 120px (6.4rem) fixed width, not forced to 50%
    expect(colLeft?.styleObj['width']).toBe('6.4rem');
    expect(colLeft?.styleObj['flex']).not.toBe('1 1 0%');

    // Right column keeps authored flex: 1
    expect(colRight?.styleObj['flex']).toBe('1');
  });

  // Test 15: Asymmetric flex row with image column should protect image column with flex-shrink: 0
  it('should protect image column in asymmetric flex row from being squeezed by sibling text', () => {
    const html = `
      <section style="display: flex; flex-flow: row;">
        <p><img src="https://example.com/thumb.jpg" style="width: 100%;" /></p>
        <div>
          <h3>很长很长的文章标题</h3>
          <p>这是一段非常冗长非常详细的描述文字，占据了绝大多数的水平空间...</p>
        </div>
      </section>
    `;
    const result = parseRichContent(html, { mode: 'wechat' });
    const row = result.ast[0];
    const imgCol = row.children?.[0];
    const textCol = row.children?.[1];

    // Image column receives 35% width and flex-shrink: 0 so it never collapses to 0px or overpowers sibling text
    expect(imgCol?.styleObj['width']).toBe('35%');
    expect(imgCol?.styleObj['flex-shrink']).toBe('0');
    expect(textCol?.styleObj['flex']).toBe('1 1 0%');
  });

  // Test 16: Images in multi-column row must NOT have height: auto injected
  it('should not inject height: auto onto images in multi-column layouts to preserve WeChat widthFix calculation', () => {
    const html = `
      <section style="display: flex;">
        <section><img src="https://example.com/pic1.jpg" style="width: 100%; height: 300px;" /></section>
        <section><img src="https://example.com/pic2.jpg" style="width: 100%; height: 300px;" /></section>
      </section>
    `;
    const result = parseRichContent(html, { mode: 'wechat' });
    const row = result.ast[0];
    const col1 = row.children?.[0];
    const img1 = col1?.children?.[0];

    // Fixed desktop height (300px) is deleted for mobile responsiveness, but NOT replaced by 'auto'
    expect(img1?.styleObj['height']).toBeUndefined();
    expect(img1?.styleObj['height']).not.toBe('auto');
  });

  // Test 17: Images with explicit height only must NOT be forced to width: 100%
  it('should not force width: 100% when only height is specified', () => {
    const html = `<img src="https://example.com/logo.png" style="height: 40px;" />`;
    const result = parseRichContent(html, { mode: 'wechat' });
    const img = result.ast[0];
    expect(img.styleObj['height']).toBe('2.1333rem');
    expect(img.styleObj['width']).toBeUndefined();
  });

  // Test 18: WeChat images with data-w < 500 should preserve small size and not stretch to 100%
  it('should preserve small WeChat stickers/badges with data-w < 500 as explicit width', () => {
    const html = `<img src="https://example.com/badge.png" data-w="80" data-ratio="1" />`;
    const result = parseRichContent(html, { mode: 'wechat' });
    const img = result.ast[0];
    // 80 / 18.75 = 4.2667rem, NOT width: 100%
    expect(img.styleObj['width']).toBe('4.2667rem');
    expect(img.styleObj['width']).not.toBe('100%');
  });
});

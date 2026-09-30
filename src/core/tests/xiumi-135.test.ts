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
});

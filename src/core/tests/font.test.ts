import { describe, it, expect } from 'vitest';
import {
  parseRichContent,
  formatFontSizeToRem,
  formatDimensionToRem,
  toRemFontSize,
  WECHAT_REM_BASE,
  DEFAULT_REM_SCALE,
  DEFAULT_BASE_FONT_SIZE,
  DEFAULT_CONTENT_BASE_FONT_SIZE
} from '../index';

describe('WeChat Mini Program REM Calculation and Halving Rules', () => {
  it('should convert concrete width and dimensions to rem with halving based on WeChat rules', () => {
    // WeChat Mini Program screen width = 20rem (1rem = 18.75px on 375px screen).
    // Converted rem is halved by default (remScale = 0.5).

    // 1. width: 200px -> (200 * 0.5) / 18.75 = 5.3333rem
    expect(formatDimensionToRem('width', '200px')).toBe('5.3333rem');

    // 2. width: 200 (pure number for dimension property) -> (200 * 0.5) / 18.75 = 5.3333rem
    expect(formatDimensionToRem('width', '200')).toBe('5.3333rem');

    // 3. width: 375px -> (375 * 0.5) / 18.75 = 10rem
    expect(formatDimensionToRem('width', '375px')).toBe('10rem');

    // 4. width: 750px (standard 750 retina canvas full width) -> (750 * 0.5) / 18.75 = 20rem (fills 20rem screen)
    expect(formatDimensionToRem('width', '750px')).toBe('20rem');

    // 5. margin / padding multi-values
    // padding: 14px 16px -> 0.3733rem 0.4267rem
    expect(formatDimensionToRem('padding', '14px 16px')).toBe('0.3733rem 0.4267rem');
    // margin: 10px 0px -> 0.2667rem 0
    expect(formatDimensionToRem('margin', '10px 0px')).toBe('0.2667rem 0');

    // 6. border-radius: 8px -> (8 * 0.5) / 18.75 = 0.2133rem
    expect(formatDimensionToRem('border-radius', '8px')).toBe('0.2133rem');

    // 7. 1px hairline border preserved to prevent subpixel disappearance
    expect(formatDimensionToRem('border', '1px solid #ccc')).toBe('1px solid #ccc');

    // 8. Relative units and multipliers preserved
    expect(formatDimensionToRem('width', '100%')).toBe('100%');
    expect(formatDimensionToRem('margin', '0 auto')).toBe('0 auto');
    expect(formatDimensionToRem('line-height', '2')).toBe('2');
    expect(formatDimensionToRem('opacity', '0.8')).toBe('0.8');
  });

  it('should calculate font-size using baseFontSize delta accumulation (baseFontSize=15, contentBaseFontSize=22)', () => {
    // Default: baseFontSize=15, contentBaseFontSize=22, fontScale=1, rootFontSize=18.75
    // Formula: mappedPx = baseFontSize + (sourcePx - contentBaseFontSize)
    //          rem = mappedPx / rootFontSize

    // 22px -> delta=0 -> mappedPx=15 -> 15/18.75 = 0.8rem (content base = display base)
    expect(formatFontSizeToRem('22px')).toBe('0.8rem');

    // 23px -> delta=1 -> mappedPx=16 -> 16/18.75 = 0.8533rem
    expect(formatFontSizeToRem('23px')).toBe('0.8533rem');

    // 24px -> delta=2 -> mappedPx=17 -> 17/18.75 = 0.9067rem
    expect(formatFontSizeToRem('24px')).toBe('0.9067rem');

    // 26px -> delta=4 -> mappedPx=19 -> 19/18.75 = 1.0133rem
    expect(formatFontSizeToRem('26px')).toBe('1.0133rem');

    // 20px -> delta=-2 -> mappedPx=13 -> 13/18.75 = 0.6933rem
    expect(formatFontSizeToRem('20px')).toBe('0.6933rem');

    // 32px -> delta=10 -> mappedPx=25 -> 25/18.75 = 1.3333rem
    expect(formatFontSizeToRem('32px')).toBe('1.3333rem');

    // 37.5rpx -> rpx to px: 37.5/2=18.75px -> delta=-3.25 -> mappedPx=11.75 -> 11.75/18.75 = 0.6267rem
    expect(formatFontSizeToRem('37.5rpx')).toBe('0.6267rem');

    // rem / em / % preserved (fontScale=1 so unchanged)
    expect(formatFontSizeToRem('1.5rem')).toBe('1.5rem');
    expect(formatFontSizeToRem('2em')).toBe('2em');
    expect(formatFontSizeToRem('120%')).toBe('120%');

    // !important preservation: 200px -> delta=178 -> mappedPx=193 -> 193/18.75 = 10.2933rem
    expect(formatFontSizeToRem('200px !important')).toBe('10.2933rem !important');
  });

  it('should respect custom baseFontSize and contentBaseFontSize in formatFontSizeToRem', () => {
    const root = WECHAT_REM_BASE; // 18.75

    // With baseFontSize=12, contentBaseFontSize=24:
    // 24px -> delta=0 -> mappedPx=12 -> 12/18.75 = 0.64rem
    expect(formatFontSizeToRem('24px', root, 1, 12, 24)).toBe('0.64rem');
    // 26px -> delta=2 -> mappedPx=14 -> 14/18.75 = 0.7467rem
    expect(formatFontSizeToRem('26px', root, 1, 12, 24)).toBe('0.7467rem');

    // With fontScale=2: mappedPx * 2 / 18.75
    // 22px (defaults) -> delta=0 -> mappedPx=15, scaled=30 -> 30/18.75 = 1.6rem
    expect(formatFontSizeToRem('22px', root, 2)).toBe('1.6rem');
  });

  it('should calculate rem in parseRichContent for both width and typography', () => {
    const html = `
      <div style="width: 200px; padding: 10px 0px;">
        <h2 style="font-size: 32px; line-height: 48px;">标题文本</h2>
        <p style="font-size: 28px;">正文段落</p>
        <span style="font-size: 37.5rpx;">小程序rpx单位文本</span>
      </div>
    `;

    const result = parseRichContent(html);
    const div = result.ast[0];
    const h2 = div.children?.[0];
    const p = div.children?.[1];
    const span = div.children?.[2];

    // div width: 200px -> (200 * 0.5) / 18.75 = 5.3333rem
    expect(div.styleObj['width']).toBe('5.3333rem');
    // div padding: 10px 0px -> 0.2667rem 0
    expect(div.styleObj['padding']).toBe('0.2667rem 0');

    // font-size: 32px -> delta=10 -> mappedPx=25 -> 25/18.75 = 1.3333rem
    expect(h2?.styleObj['font-size']).toBe('1.3333rem');
    // line-height: 48px (dimension, not font-size) -> (48 * 0.5) / 18.75 = 1.28rem
    expect(h2?.styleObj['line-height']).toBe('1.28rem');
    // font-size: 28px -> delta=6 -> mappedPx=21 -> 21/18.75 = 1.12rem
    expect(p?.styleObj['font-size']).toBe('1.12rem');
    // font-size: 37.5rpx -> 18.75px -> delta=-3.25 -> mappedPx=11.75 -> 11.75/18.75 = 0.6267rem
    expect(span?.styleObj['font-size']).toBe('0.6267rem');
  });

  it('should support custom remScale (e.g. remScale = 1 for 1:1 conversion without halving)', () => {
    const html = `<div style="width: 200px; font-size: 32px;">自定义remScale测试</div>`;

    // remScale = 1 (no halving for dimensions: 200 / 18.75 = 10.6667rem)
    // font-size uses baseFontSize delta (NOT remScale): 32px -> delta=10 -> mappedPx=25 -> 25/18.75 = 1.3333rem
    const result1 = parseRichContent(html, { remScale: 1 });
    expect(result1.ast[0].styleObj['width']).toBe('10.6667rem');
    expect(result1.ast[0].styleObj['font-size']).toBe('1.3333rem');

    // Default remScale = 0.5 (halved for dimensions)
    const resultDefault = parseRichContent(html);
    expect(resultDefault.ast[0].styleObj['width']).toBe('5.3333rem');
    expect(resultDefault.ast[0].styleObj['font-size']).toBe('1.3333rem');
  });

  it('should support custom rootFontSize for rem base', () => {
    const html = `<p style="font-size: 28px;">自定义基准字号</p>`;

    // With rootFontSize=14, remScale=1:
    // font-size: 28px -> delta=6 -> mappedPx=21 -> 21/14 = 1.5rem
    const result = parseRichContent(html, { rootFontSize: 14, remScale: 1 });
    expect(result.ast[0].styleObj['font-size']).toBe('1.5rem');
  });

  it('should support custom baseFontSize and contentBaseFontSize in parseRichContent', () => {
    const html = `<p style="font-size: 22px;">基准字体测试</p>`;

    // baseFontSize=15, contentBaseFontSize=22 (defaults)
    const r1 = parseRichContent(html, { baseFontSize: 15, contentBaseFontSize: 22 });
    // 22px -> delta=0 -> mappedPx=15 -> 15/18.75 = 0.8rem
    expect(r1.ast[0].styleObj['font-size']).toBe('0.8rem');

    // baseFontSize=12, contentBaseFontSize=22
    const r2 = parseRichContent(html, { baseFontSize: 12, contentBaseFontSize: 22 });
    // 22px -> delta=0 -> mappedPx=12 -> 12/18.75 = 0.64rem
    expect(r2.ast[0].styleObj['font-size']).toBe('0.64rem');

    // With 26px content and baseFontSize=15, contentBaseFontSize=22
    const html2 = `<p style="font-size: 26px;">更大字体</p>`;
    const r3 = parseRichContent(html2, { baseFontSize: 15, contentBaseFontSize: 22 });
    // 26px -> delta=4 -> mappedPx=19 -> 19/18.75 = 1.0133rem
    expect(r3.ast[0].styleObj['font-size']).toBe('1.0133rem');
  });

  it('should convert container fontSize prop to rem with toRemFontSize', () => {
    // toRemFontSize with explicit values (no default fallback)
    expect(toRemFontSize(37.5)).toBe('2rem');          // 37.5 / 18.75 = 2rem
    expect(toRemFontSize('1rem')).toBe('1rem');         // already rem
    // No fontSize provided: defaults to baseFontSize/rootFontSize = 15/18.75 = 0.8rem
    expect(toRemFontSize(undefined)).toBe('0.8rem');
    // Custom defaultPx: 12/18.75 = 0.64rem
    expect(toRemFontSize(undefined, WECHAT_REM_BASE, 0.5, 12)).toBe('0.64rem');
  });

  it('should keep images default width 100% alongside rem calculation', () => {
    const html = `
      <div style="width: 200px;">
        <p style="font-size: 32px;">带图片的段落</p>
        <img src="https://example.com/demo.jpg" />
      </div>
    `;

    const result = parseRichContent(html);
    const div = result.ast[0];
    const p = div.children?.[0];
    const img = div.children?.[1];

    expect(div.styleObj['width']).toBe('5.3333rem');
    // font-size: 32px -> delta=10 -> mappedPx=25 -> 25/18.75 = 1.3333rem
    expect(p?.styleObj['font-size']).toBe('1.3333rem');
    expect(img?.styleObj['width']).toBe('100%');
  });
});


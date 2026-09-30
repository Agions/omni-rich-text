import { describe, it, expect } from 'vitest';
import { parseRichContent } from '../index';
import { detectSvgCarousel, isSvgSourceCode } from '../utils/svg';
import { highlightCode } from '../plugins/prism';
import { ASTNode } from '../types/ast';

describe('SVG Carousel and Code Block Architecture', () => {
  describe('SVG Carousel Detection and Normalization', () => {
    it('detects SVG with multiple image frames as carousel', () => {
      const svgNode: ASTNode = {
        id: 'svg_1',
        type: 'element',
        name: 'svg',
        attrs: {
          viewbox: '0 0 750 400',
          width: '750',
          height: '400'
        },
        styleStr: '',
        styleObj: {},
        children: [
          {
            id: 'img_1',
            type: 'element',
            name: 'image',
            attrs: {
              'xlink:href': 'https://example.com/slide1.jpg',
              title: '第一帧封面',
              width: '750',
              height: '400'
            },
            styleStr: '',
            styleObj: {}
          },
          {
            id: 'img_2',
            type: 'element',
            name: 'image',
            attrs: {
              'xlink:href': 'https://example.com/slide2.jpg',
              title: '第二帧产品图',
              width: '750',
              height: '400'
            },
            styleStr: '',
            styleObj: {}
          }
        ]
      };

      const result = detectSvgCarousel(svgNode);
      expect(result).not.toBeNull();
      expect(result?.isCarousel).toBe(true);
      expect(result?.slides.length).toBe(2);
      expect(result?.slides[0].src).toBe('https://example.com/slide1.jpg');
      expect(result?.slides[0].title).toBe('第一帧封面');
      expect(result?.slides[1].src).toBe('https://example.com/slide2.jpg');
      expect(result?.aspectRatio).toBeCloseTo(750 / 400, 2);
    });

    it('does not classify single-image SVG as a carousel', () => {
      const singleSvgNode: ASTNode = {
        id: 'svg_single',
        type: 'element',
        name: 'svg',
        attrs: { viewbox: '0 0 200 200' },
        styleStr: '',
        styleObj: {},
        children: [
          {
            id: 'img_1',
            type: 'element',
            name: 'image',
            attrs: { 'xlink:href': 'https://example.com/icon.png' },
            styleStr: '',
            styleObj: {}
          }
        ]
      };

      const result = detectSvgCarousel(singleSvgNode);
      expect(result).toBeNull();
    });

    it('parses real WeChat SVG carousel HTML and automatically attaches slides to galleryList', () => {
      const html = `
        <div class="rich_media">
          <svg viewBox="0 0 800 450" style="width: 100%;">
            <g>
              <a href="https://example.com/target1">
                <image xlink:href="https://example.com/slideA.jpg" title="轮播1" width="800" height="450" />
              </a>
              <a href="https://example.com/target2">
                <image xlink:href="https://example.com/slideB.jpg" title="轮播2" width="800" height="450" />
              </a>
              <image xlink:href="https://example.com/slideC.jpg" title="轮播3" width="800" height="450" />
            </g>
          </svg>
        </div>
      `;

      const result = parseRichContent(html);
      expect(result.ast.length).toBeGreaterThan(0);

      // Verify galleryList contains all 3 carousel slides
      expect(result.galleryList).toContain('https://example.com/slideA.jpg');
      expect(result.galleryList).toContain('https://example.com/slideB.jpg');
      expect(result.galleryList).toContain('https://example.com/slideC.jpg');

      // Find the carousel node
      function findCarousel(nodes: ASTNode[]): ASTNode | undefined {
        for (const n of nodes) {
          if (n.extra?.isSvgCarousel) return n;
          if (n.children) {
            const f = findCarousel(n.children);
            if (f) return f;
          }
        }
        return undefined;
      }

      const carouselNode = findCarousel(result.ast);
      expect(carouselNode).toBeDefined();
      expect(carouselNode?.extra?.isSvgCarousel).toBe(true);
      expect(carouselNode?.extra?.carouselSlides?.length).toBe(3);
      expect(carouselNode?.extra?.carouselSlides?.[0].href).toBe('https://example.com/target1');
    });

    it('detects horizontal scroll section with images as a carousel', () => {
      const html = `
        <section style="overflow-x: scroll; white-space: nowrap; display: flex;">
          <img src="https://example.com/card1.jpg" alt="卡片1" />
          <img src="https://example.com/card2.jpg" alt="卡片2" />
          <img src="https://example.com/card3.jpg" alt="卡片3" />
        </section>
      `;

      const result = parseRichContent(html);
      const sectionNode = result.ast[0];
      expect(sectionNode.extra?.isSvgCarousel).toBe(true);
      expect(sectionNode.extra?.carouselSlides?.length).toBe(3);
    });
  });

  describe('SVG Source Code Block Detection and Syntax Highlighting', () => {
    it('identifies valid SVG code strings', () => {
      expect(isSvgSourceCode('<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>')).toBe(true);
      expect(isSvgSourceCode('<?xml version="1.0"?><svg><rect/></svg>')).toBe(true);
      expect(isSvgSourceCode('const a = 123;')).toBe(false);
      expect(isSvgSourceCode('<div>Not an svg</div>')).toBe(false);
    });

    it('highlights XML/SVG tags, attributes, and strings', () => {
      const svgCode = '<svg width="100" height="100">\n  <!-- Vector Circle -->\n  <circle cx="50" cy="50" r="40" fill="#07c160" />\n</svg>';
      const nodes = highlightCode(svgCode, 'xml');

      expect(nodes.length).toBe(4); // 4 lines

      // First line contains <svg, width, height, "100"
      const firstLineSpans = nodes[0].children || [];
      const tagSpan = firstLineSpans.find((c) => c.name === 'span' && c.styleStr.includes('#e06c75'));
      expect(tagSpan).toBeDefined();

      // Second line contains comment <!-- Vector Circle -->
      const secondLineSpans = nodes[1].children || [];
      const commentSpan = secondLineSpans.find((c) => c.name === 'span' && c.styleStr.includes('#5c6370'));
      expect(commentSpan).toBeDefined();
    });

    it('recognizes SVG code inside pre/code blocks and marks isSvgCodeBlock with rawSvgCode', () => {
      const html = `
        <pre><code class="language-xml">&lt;svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"&gt;
  &lt;circle cx="50" cy="50" r="45" fill="#1677ff" /&gt;
&lt;/svg&gt;</code></pre>
      `;

      const result = parseRichContent(html);
      const preNode = result.ast[0];
      expect(preNode.name).toBe('pre');
      expect(preNode.extra?.isCodeBlock).toBe(true);
      expect(preNode.extra?.isSvgCodeBlock).toBe(true);
      expect(preNode.extra?.rawSvgCode).toContain('<circle cx="50" cy="50"');
    });

    it('preserves unescaped SVG inside pre/code without collapsing or breaking DOM', () => {
      const html = `
        <pre><code><svg viewBox="0 0 200 200"><rect width="100" height="100" fill="red"/></svg></code></pre>
      `;

      const result = parseRichContent(html);
      const preNode = result.ast[0];
      expect(preNode.name).toBe('pre');
      expect(preNode.extra?.isSvgCodeBlock).toBe(true);
      expect(preNode.extra?.rawSvgCode).toContain('<rect');
    });
  });
});

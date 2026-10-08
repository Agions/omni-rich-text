import { describe, it, expect } from 'vitest';
import {
  parseRichContent,
  hasForeignObject,
  splitSvgForeignObject,
  extractSvgViewBoxRatio,
  detectSvgCarousel,
  highlightCode,
  truncateAST,
  type ASTNode
} from '../../core';
import type { UniRichTextProps } from '../types';

describe('UniApp (Vue 3) Adapter Layer Test Suite', () => {
  describe('UniRichTextProps Type Parity', () => {
    it('supports all core parity props', () => {
      const mockProps: UniRichTextProps = {
        content: '<p>Hello UniApp</p>',
        format: 'html',
        mode: 'wechat',
        clampMaxHeight: 240,
        expandText: '展开全文',
        collapseText: '收起',
        showCollapse: true,
        truncateLength: 50,
        truncate: { maxLength: 50, ellipsis: '...' },
        imageCropMode: 'aspectFill',
        imageCropRatio: 16 / 9,
        imageSkeleton: true,
        showImageError: false,
        components: {
          'my-widget': {}
        },
        customRender: (node) => null,
        onExpandChange: (expanded) => {},
        onLinkTap: (ctx) => {},
        onImageTap: (p) => {},
        onLongPressText: (text, node) => {},
        onMediaEvent: (payload) => {},
        onNodeEvent: (event, node, raw) => {},
        streaming: true,
        showCursor: true,
        cursorChar: '▍'
      };

      expect(mockProps.content).toBe('<p>Hello UniApp</p>');
      expect(mockProps.clampMaxHeight).toBe(240);
      expect(mockProps.showCollapse).toBe(true);
      expect(mockProps.imageCropMode).toBe('aspectFill');
      expect(mockProps.imageCropRatio).toBeCloseTo(16 / 9, 2);
      expect(mockProps.streaming).toBe(true);
      expect(mockProps.showCursor).toBe(true);
      expect(mockProps.cursorChar).toBe('▍');
    });
  });

  describe('AST Parsing with UniApp Custom Components & Truncate', () => {
    it('preserves registered custom component tags in AST without stripping', () => {
      const html = `
        <div class="article">
          <my-chart data-id="123" title="Q3 Revenue"></my-chart>
          <p>Text below chart</p>
        </div>
      `;

      const result = parseRichContent(html, {
        customTags: ['my-chart'],
        mode: 'default'
      });

      expect(result.ast.length).toBeGreaterThan(0);
      const article = result.ast[0];
      const customNode = article.children?.find((c) => c.name === 'my-chart');
      expect(customNode).toBeDefined();
      expect(customNode?.attrs['data-id']).toBe('123');
      expect(customNode?.attrs.title).toBe('Q3 Revenue');
    });

    it('supports truncateAST for summary cards', () => {
      const html = '<p>这是一个非常长非常长非常长的文章开头测试段落，用于验证截断功能是否完全正常生效并添加省略号。</p>';
      const result = parseRichContent(html, {
        truncate: { maxLength: 10, ellipsis: '... [阅读更多]' }
      });

      expect(result.ast.length).toBe(1);
      const textNode = result.ast[0].children?.[0];
      expect(textNode?.text).toContain('... [阅读更多]');
      expect(textNode?.text?.length).toBeLessThanOrEqual(30);
    });
  });

  describe('SVG ForeignObject Dual-Layer Decoupling for UniApp', () => {
    it('correctly detects foreignObject and separates background SVG from overlay HTML', () => {
      const svgNode: ASTNode = {
        id: 'svg_root',
        type: 'element',
        name: 'svg',
        attrs: {
          viewbox: '0 0 400 300',
          width: '400',
          height: '300'
        },
        styleStr: '',
        styleObj: { width: '400px', height: '300px' },
        children: [
          {
            id: 'rect_bg',
            type: 'element',
            name: 'rect',
            attrs: { width: '400', height: '300', fill: '#f0f9ff' },
            styleStr: '',
            styleObj: {}
          },
          {
            id: 'fo_overlay',
            type: 'element',
            name: 'foreignobject',
            attrs: { x: '20', y: '20', width: '360', height: '260' },
            styleStr: '',
            styleObj: {},
            children: [
              {
                id: 'btn_1',
                type: 'element',
                name: 'button',
                attrs: { class: 'action-btn' },
                styleStr: '',
                styleObj: {},
                children: [{ id: 'txt_1', type: 'text', text: '点击领券', attrs: {}, styleStr: '', styleObj: {} }]
              }
            ]
          }
        ]
      };

      expect(hasForeignObject(svgNode)).toBe(true);

      const ratio = extractSvgViewBoxRatio(svgNode);
      expect(ratio).toBeCloseTo(400 / 300, 2);

      const { bgSvgXml, foreignObjectNodes } = splitSvgForeignObject(svgNode);
      expect(bgSvgXml).toBeDefined();
      expect(bgSvgXml).toContain('<rect');
      expect(bgSvgXml).not.toContain('<foreignobject');
      expect(foreignObjectNodes.length).toBe(1);
      expect(foreignObjectNodes[0].name).toBe('foreignobject');
      expect(foreignObjectNodes[0].children?.[0].children?.[0].text).toBe('点击领券');
    });
  });

  describe('SVG Carousel Swiper Normalization', () => {
    it('identifies SVG swiper carousel and extracts slide data for UniApp swiper', () => {
      const svgNode: ASTNode = {
        id: 'svg_swiper',
        type: 'element',
        name: 'svg',
        attrs: {
          viewbox: '0 0 750 360',
          width: '750',
          height: '360'
        },
        styleStr: '',
        styleObj: {},
        children: [
          {
            id: 'slide_1',
            type: 'element',
            name: 'image',
            attrs: {
              'xlink:href': 'https://res.wx.qq.com/banner1.jpg',
              title: '新品首发',
              width: '750',
              height: '360'
            },
            styleStr: '',
            styleObj: {}
          },
          {
            id: 'slide_2',
            type: 'element',
            name: 'image',
            attrs: {
              'xlink:href': 'https://res.wx.qq.com/banner2.jpg',
              title: '限时特惠',
              width: '750',
              height: '360'
            },
            styleStr: '',
            styleObj: {}
          }
        ]
      };

      const carousel = detectSvgCarousel(svgNode);
      expect(carousel).not.toBeNull();
      expect(carousel?.isCarousel).toBe(true);
      expect(carousel?.slides.length).toBe(2);
      expect(carousel?.slides[0].src).toBe('https://res.wx.qq.com/banner1.jpg');
      expect(carousel?.slides[0].title).toBe('新品首发');
      expect(carousel?.slides[1].src).toBe('https://res.wx.qq.com/banner2.jpg');
      expect(carousel?.slides[1].title).toBe('限时特惠');
      expect(carousel?.aspectRatio).toBeCloseTo(750 / 360, 2);
    });
  });

  describe('SVG Code Block & Prism Syntax Highlighting', () => {
    it('produces syntax tokens for SVG/XML code blocks', () => {
      const svgXml = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red"/></svg>';
      const highlighted = highlightCode(svgXml, 'xml');

      expect(highlighted.length).toBeGreaterThan(0);
      const allTokens = highlighted.flatMap((line) => line.children || []);
      expect(allTokens.length).toBeGreaterThan(0);
      const svgTagToken = allTokens.find((t) => t.children?.[0]?.text?.includes('svg'));
      expect(svgTagToken).toBeDefined();
      expect(svgTagToken?.styleStr).toContain('color: #e06c75');
    });
  });


  describe('UniApp Image Sizing Rule Logic', () => {
    it('properly determines mode="heightFix" when only height is specified', () => {
      const node: ASTNode = {
        id: 'img_height_only',
        type: 'element',
        name: 'img',
        attrs: { src: 'https://example.com/logo.png', height: '40' },
        styleStr: 'height: 40px; max-width: 100%;',
        styleObj: { height: '40px', maxWidth: '100%' }
      };

      const rawHeight = node.styleObj?.height || (node.attrs.height ? `${node.attrs.height}px` : undefined);
      const hasExplicitHeight = !!rawHeight;
      const rawWidth = node.styleObj?.width || (node.attrs.width ? `${node.attrs.width}px` : undefined);
      const hasExplicitWidth = !!rawWidth && rawWidth !== '100%' && rawWidth !== 'auto';

      const effectiveImgMode = (hasExplicitWidth && hasExplicitHeight ? 'aspectFill' : null) ||
        (hasExplicitHeight && !hasExplicitWidth ? 'heightFix' : 'widthFix');

      expect(effectiveImgMode).toBe('heightFix');
      expect(rawHeight).toBe('40px');
    });

    it('properly determines mode="aspectFill" when both width and height are specified', () => {
      const node: ASTNode = {
        id: 'img_fixed',
        type: 'element',
        name: 'img',
        attrs: { src: 'https://example.com/thumb.png', width: '120', height: '120' },
        styleStr: 'width: 120px; height: 120px;',
        styleObj: { width: '120px', height: '120px' }
      };

      const rawHeight = node.styleObj?.height || (node.attrs.height ? `${node.attrs.height}px` : undefined);
      const hasExplicitHeight = !!rawHeight;
      const rawWidth = node.styleObj?.width || (node.attrs.width ? `${node.attrs.width}px` : undefined);
      const hasExplicitWidth = !!rawWidth && rawWidth !== '100%' && rawWidth !== 'auto';

      const effectiveImgMode = (hasExplicitWidth && hasExplicitHeight ? 'aspectFill' : null) ||
        (hasExplicitHeight && !hasExplicitWidth ? 'heightFix' : 'widthFix');

      expect(effectiveImgMode).toBe('aspectFill');
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  parseRichContent,
  parseStreamContent,
  hasForeignObject,
  splitSvgForeignObject,
  extractSvgViewBoxRatio,
  detectSvgCarousel,
  truncateAST,
  type ASTNode
} from '../../core';

describe('Native WeChat Mini Program Adapter Layer Test Suite', () => {
  describe('AST Parsing in WeChat Mode', () => {
    it('automatically extracts <style> tag rules in wechat mode', () => {
      const html = `
        <style>
          .article-title { color: #1890ff; font-weight: bold; }
        </style>
        <h1 class="article-title">微信小程序原生富文本</h1>
      `;

      const result = parseRichContent(html, {
        mode: 'wechat',
        extractStyles: true
      });

      expect(result.ast.length).toBeGreaterThan(0);
      const h1 = result.ast[0];
      expect(h1.styleStr).toContain('#1890ff');
      expect(h1.styleStr).toContain('bold');
    });


    it('preserves customTags and applies truncation in wechat mode', () => {
      const html = `
        <div class="container">
          <wx-widget item-id="999"></wx-widget>
          <p>这是一篇需要自动生成小程序卡片摘要的长文章，截断功能需要添加省略符号。</p>
        </div>
      `;

      const result = parseRichContent(html, {
        mode: 'wechat',
        customTags: ['wx-widget'],
        truncate: { maxLength: 15, ellipsis: '... [全文]' }
      });

      expect(result.ast.length).toBe(1);
      const container = result.ast[0];
      const customNode = container.children?.find((c) => c.name === 'wx-widget');
      expect(customNode).toBeDefined();
      expect(customNode?.attrs['item-id']).toBe('999');

      const textNode = container.children?.find((c) => c.name === 'p')?.children?.[0];
      expect(textNode?.text).toContain('... [全文]');
    });
  });

  describe('WeChat SVG Carousel Swiper Normalization', () => {
    it('extracts multi-frame SVG carousel for WXML <swiper> rendering', () => {
      const svgNode: ASTNode = {
        id: 'svg_wx_swiper',
        type: 'element',
        name: 'svg',
        attrs: { viewbox: '0 0 750 375' },
        styleStr: '',
        styleObj: {},
        children: [
          {
            id: 's1',
            type: 'element',
            name: 'image',
            attrs: { 'xlink:href': 'https://example.com/wx1.jpg', title: '小程序海报1' },
            styleStr: '',
            styleObj: {}
          },
          {
            id: 's2',
            type: 'element',
            name: 'image',
            attrs: { 'xlink:href': 'https://example.com/wx2.jpg', title: '小程序海报2' },
            styleStr: '',
            styleObj: {}
          }
        ]
      };

      const carousel = detectSvgCarousel(svgNode);
      expect(carousel).not.toBeNull();
      expect(carousel?.isCarousel).toBe(true);
      expect(carousel?.slides.length).toBe(2);
      expect(carousel?.slides[0].title).toBe('小程序海报1');
      expect(carousel?.slides[1].title).toBe('小程序海报2');
      expect(carousel?.aspectRatio).toBeCloseTo(750 / 375, 2);
    });
  });

  describe('WeChat SVG ForeignObject Decoupling', () => {
    it('splits static SVG from foreignObject overlay for WXML template rendering', () => {
      const svgNode: ASTNode = {
        id: 'svg_wx_fo',
        type: 'element',
        name: 'svg',
        attrs: { viewbox: '0 0 400 200' },
        styleStr: '',
        styleObj: {},
        children: [
          {
            id: 'path_bg',
            type: 'element',
            name: 'path',
            attrs: { d: 'M0 0 L400 0 L400 200 Z', fill: '#e6f7ff' },
            styleStr: '',
            styleObj: {}
          },
          {
            id: 'fo_overlay',
            type: 'element',
            name: 'foreignobject',
            attrs: { x: '10', y: '10', width: '380', height: '180' },
            styleStr: '',
            styleObj: {},
            children: [
              {
                id: 'txt',
                type: 'text',
                text: '小程序可交互内容',
                attrs: {},
                styleStr: '',
                styleObj: {}
              }
            ]
          }
        ]
      };

      expect(hasForeignObject(svgNode)).toBe(true);
      const { bgSvgXml, foreignObjectNodes } = splitSvgForeignObject(svgNode);
      expect(bgSvgXml).toContain('<path');
      expect(bgSvgXml).not.toContain('<foreignobject');
      expect(foreignObjectNodes.length).toBe(1);
      expect(foreignObjectNodes[0].children?.[0].text).toBe('小程序可交互内容');
    });
  });

  describe('WeChat Native Image Sizing Mode Calculations', () => {
    function computeMode(node: ASTNode, cropMode?: string, cropRatio?: number) {
      if (node.attrs && node.attrs.mode) return node.attrs.mode;
      if (cropMode && cropMode !== 'auto') return cropMode;
      if (cropRatio) return 'aspectFill';
      const hasW = !!(node.styleObj && node.styleObj.width && node.styleObj.width !== '100%' && node.styleObj.width !== 'auto') || !!(node.attrs && node.attrs.width);
      const hasH = !!(node.styleObj && node.styleObj.height && node.styleObj.height !== 'auto') || !!(node.attrs && node.attrs.height);
      if (hasW && hasH) return 'aspectFill';
      if (hasH && !hasW) return 'heightFix';
      return 'widthFix';
    }

    it('calculates mode="heightFix" for images with explicit height only', () => {
      const node: ASTNode = {
        id: 'img_h',
        type: 'element',
        name: 'img',
        attrs: { src: 'https://example.com/logo.png', height: '60' },
        styleStr: 'height: 60px;',
        styleObj: { height: '60px' }
      };

      expect(computeMode(node)).toBe('heightFix');
    });

    it('calculates mode="aspectFill" for images with fixed width and height', () => {
      const node: ASTNode = {
        id: 'img_wh',
        type: 'element',
        name: 'img',
        attrs: { src: 'https://example.com/avatar.png', width: '80', height: '80' },
        styleStr: 'width: 80px; height: 80px;',
        styleObj: { width: '80px', height: '80px' }
      };

      expect(computeMode(node)).toBe('aspectFill');
    });

    it('calculates mode="widthFix" for standard responsive full-width images', () => {
      const node: ASTNode = {
        id: 'img_full',
        type: 'element',
        name: 'img',
        attrs: { src: 'https://example.com/banner.jpg' },
        styleStr: 'width: 100%;',
        styleObj: { width: '100%' }
      };

      expect(computeMode(node)).toBe('widthFix');
    });
  });

  describe('WeChat AI Streaming Support', () => {
    it('supports streaming Markdown parsing with tail healing and blinking cursor', () => {
      const streamingMd = '正在生成答案：\n```javascript\nconsole.log("hello"';
      const result = parseStreamContent(streamingMd, {
        format: 'markdown',
        showCursor: true,
        cursorChar: '▍'
      });

      expect(result.ast.length).toBeGreaterThan(0);
      const json = JSON.stringify(result.ast);
      expect(json).toContain('omni_stream_cursor_node');
      expect(json).toContain('▍');
      // Unclosed code block must have been healed
      expect(json).toContain('"name":"pre"');
    });
  });
});

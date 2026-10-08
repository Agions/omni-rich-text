import { describe, it, expect } from 'vitest';
import {
  parseRichContent,
  hasForeignObject,
  splitSvgForeignObject,
  extractSvgViewBoxRatio,
  detectSvgCarousel,
  truncateAST,
  type ASTNode
} from '../../core';
import { cssToRn } from '../styles/cssToRn';
import type { OmniRichTextProps } from '../types';

describe('React Native Adapter Layer Test Suite', () => {
  describe('OmniRichTextProps Type Parity', () => {
    it('supports all core parity props in React Native', () => {
      const mockProps: OmniRichTextProps = {
        content: '<p>Hello React Native</p>',
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
          'custom-card': () => null
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

      expect(mockProps.content).toBe('<p>Hello React Native</p>');
      expect(mockProps.clampMaxHeight).toBe(240);
      expect(mockProps.showCollapse).toBe(true);
      expect(mockProps.imageCropMode).toBe('aspectFill');
      expect(mockProps.imageCropRatio).toBeCloseTo(16 / 9, 2);
      expect(mockProps.streaming).toBe(true);
      expect(mockProps.showCursor).toBe(true);
      expect(mockProps.cursorChar).toBe('▍');
    });
  });

  describe('cssToRn Style Converter', () => {
    it('converts CSS pixel strings to React Native numeric values', () => {
      const css = {
        'font-size': '16px',
        'line-height': '24px',
        'border-radius': '8px',
        color: '#333333'
      };

      const rn = cssToRn(css);
      expect(rn.fontSize).toBe(16);
      expect(rn.lineHeight).toBe(24);
      expect(rn.borderRadius).toBe(8);
      expect(rn.color).toBe('#333333');
    });

    it('parses margin and padding shorthands into directional properties', () => {
      const css = {
        margin: '10px 20px',
        padding: '5px 10px 15px 20px'
      };

      const rn = cssToRn(css);
      expect(rn.marginTop).toBe(10);
      expect(rn.marginRight).toBe(20);
      expect(rn.marginBottom).toBe(10);
      expect(rn.marginLeft).toBe(20);

      expect(rn.paddingTop).toBe(5);
      expect(rn.paddingRight).toBe(10);
      expect(rn.paddingBottom).toBe(15);
      expect(rn.paddingLeft).toBe(20);
    });

    it('splits border shorthand into borderWidth, borderStyle, and borderColor', () => {
      const css = {
        border: '2px solid #e7e7e7'
      };

      const rn = cssToRn(css);
      expect(rn.borderWidth).toBe(2);
      expect(rn.borderStyle).toBe('solid');
      expect(rn.borderColor).toBe('#e7e7e7');

      const sideCss = {
        'border-left': '4px dashed #07c160'
      };
      const sideRn = cssToRn(sideCss);
      expect(sideRn.borderLeftWidth).toBe(4);
      expect(sideRn.borderStyle).toBe('dashed');
      expect(sideRn.borderLeftColor).toBe('#07c160');
    });


    it('filters out unsupported CSS properties for React Native safety', () => {
      const css = {
        'box-sizing': 'border-box',
        cursor: 'pointer',
        float: 'left',
        'font-size': '14px'
      };

      const rn = cssToRn(css);
      expect(rn.boxSizing).toBeUndefined();
      expect(rn.cursor).toBeUndefined();
      expect(rn.float).toBeUndefined();
      expect(rn.fontSize).toBe(14);
    });
  });

  describe('AST Parsing with RN Custom Components & Truncate', () => {
    it('preserves registered custom component tags in AST without stripping', () => {
      const html = `
        <div class="card">
          <rn-chart data-type="line" values="10,20,30"></rn-chart>
          <p>Chart Description</p>
        </div>
      `;

      const result = parseRichContent(html, {
        customTags: ['rn-chart'],
        mode: 'default'
      });

      expect(result.ast.length).toBeGreaterThan(0);
      const card = result.ast[0];
      const chartNode = card.children?.find((c) => c.name === 'rn-chart');
      expect(chartNode).toBeDefined();
      expect(chartNode?.attrs['data-type']).toBe('line');
      expect(chartNode?.attrs.values).toBe('10,20,30');
    });

    it('supports truncateAST in React Native for excerpts', () => {
      const html = '<p>React Native 移动端富文本渲染截断功能测试段落，超长文本生成摘要。</p>';
      const result = parseRichContent(html, {
        truncate: { maxLength: 12, ellipsis: '... [查看详情]' }
      });

      expect(result.ast.length).toBe(1);
      const textNode = result.ast[0].children?.[0];
      expect(textNode?.text).toContain('... [查看详情]');
    });
  });

  describe('SVG ForeignObject Decoupling for React Native', () => {
    it('correctly splits SVG background from interactive foreignObject overlay', () => {
      const svgNode: ASTNode = {
        id: 'svg_rn',
        type: 'element',
        name: 'svg',
        attrs: {
          viewbox: '0 0 500 300',
          width: '500',
          height: '300'
        },
        styleStr: '',
        styleObj: { width: '500px', height: '300px' },
        children: [
          {
            id: 'rect_1',
            type: 'element',
            name: 'rect',
            attrs: { width: '500', height: '300', fill: '#f1f5f9' },
            styleStr: '',
            styleObj: {}
          },
          {
            id: 'fo_1',
            type: 'element',
            name: 'foreignobject',
            attrs: { width: '460', height: '260' },
            styleStr: '',
            styleObj: {},
            children: [
              {
                id: 'text_inside',
                type: 'text',
                text: 'Overlay Interactive Content',
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
      expect(bgSvgXml).toContain('<rect');
      expect(bgSvgXml).not.toContain('<foreignobject');
      expect(foreignObjectNodes.length).toBe(1);
      expect(foreignObjectNodes[0].children?.[0].text).toBe('Overlay Interactive Content');
    });
  });
});

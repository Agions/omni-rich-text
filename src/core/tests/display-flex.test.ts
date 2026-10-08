import { describe, it, expect } from 'vitest';
import { parseRichContent, isFlexDisplay, getDefaultDisplay, isAllInline, ASTNode } from '../index';

describe('Display Semantics & Flex Container Layout', () => {
  describe('Utility Functions', () => {
    it('isFlexDisplay correctly identifies standard and vendor-prefixed flex displays', () => {
      expect(isFlexDisplay('flex')).toBe(true);
      expect(isFlexDisplay('inline-flex')).toBe(true);
      expect(isFlexDisplay('  FLEX  ')).toBe(true);
      expect(isFlexDisplay('-webkit-flex')).toBe(true);
      expect(isFlexDisplay('-webkit-box')).toBe(true);

      expect(isFlexDisplay('block')).toBe(false);
      expect(isFlexDisplay('inline-block')).toBe(false);
      expect(isFlexDisplay('inline')).toBe(false);
      expect(isFlexDisplay(undefined)).toBe(false);
      expect(isFlexDisplay('')).toBe(false);
    });

    it('getDefaultDisplay correctly resolves native tag display vs flex items', () => {
      // Under normal flow
      expect(getDefaultDisplay('span', false)).toBe('inline');
      expect(getDefaultDisplay('strong', false)).toBe('inline');
      expect(getDefaultDisplay('b', false)).toBe('inline');
      expect(getDefaultDisplay('em', false)).toBe('inline');
      expect(getDefaultDisplay('div', false)).toBe('block');
      expect(getDefaultDisplay('p', false)).toBe('block');
      expect(getDefaultDisplay('section', false)).toBe('block');
      expect(getDefaultDisplay('img', false)).toBe('inline-block');

      // Under flex container (flex items are blockified per CSS Flexbox spec Section 4)
      expect(getDefaultDisplay('span', true)).toBe('block');
      expect(getDefaultDisplay('strong', true)).toBe('block');
      expect(getDefaultDisplay('div', true)).toBe('block');
      expect(getDefaultDisplay('p', true)).toBe('block');
    });
  });

  describe('Normal Flow Display Resolution', () => {
    it('span in normal flow defaults to inline and is purely inline text', () => {
      const { ast } = parseRichContent('<span>Hello world</span>');
      expect(ast).toHaveLength(1);
      const span = ast[0];

      expect(span.name).toBe('span');
      expect(span.extra?.isInlineTag).toBe(true);
      expect(span.extra?.parentIsFlex).toBe(false);
      expect(span.extra?.defaultDisplay).toBe('inline');
      expect(span.extra?.isInline).toBe(true);
    });

    it('multiple inline spans inside p stay inline', () => {
      const html = '<p><span style="color: red;">Red</span> <span style="color: blue;">Blue</span></p>';
      const { ast } = parseRichContent(html);
      const p = ast[0];

      expect(p.name).toBe('p');
      expect(p.extra?.parentIsFlex).toBe(false);

      const spans = p.children?.filter((c) => c.name === 'span') || [];
      expect(spans).toHaveLength(2);

      for (const span of spans) {
        expect(span.extra?.isInlineTag).toBe(true);
        expect(span.extra?.parentIsFlex).toBe(false);
        expect(span.extra?.defaultDisplay).toBe('inline');
        expect(span.extra?.isInline).toBe(true);
      }
    });

    it('span with explicit dimensions or margins is marked as non-pure inline for View container rendering', () => {
      const { ast } = parseRichContent('<span style="width: 100px; height: 30px;">Badge</span>');
      const span = ast[0];

      expect(span.extra?.isInlineTag).toBe(true);
      expect(span.extra?.parentIsFlex).toBe(false);
      // Because it has width/height, it cannot be rendered as a raw <Text>
      expect(span.extra?.isInline).toBe(false);
      // But it still has native inline tag semantics
      expect(span.extra?.defaultDisplay).toBe('inline');
    });

    it('span with flex item properties is recognized as non-pure inline', () => {
      const { ast } = parseRichContent('<span style="flex: 1;">Flexible</span>');
      const span = ast[0];

      expect(span.extra?.isInlineTag).toBe(true);
      expect(span.extra?.isInline).toBe(false);
    });

    it('explicit display in style attribute takes precedence', () => {
      const { ast: ast1 } = parseRichContent('<span style="display: block;">Block Span</span>');
      expect(ast1[0].styleObj?.display).toBe('block');

      const { ast: ast2 } = parseRichContent('<div style="display: inline-block;">Inline Div</div>');
      expect(ast2[0].styleObj?.display).toBe('inline-block');
    });
  });

  describe('Flex Container Context Propagation', () => {
    it('children inside display: flex container are marked with parentIsFlex=true and defaultDisplay=block', () => {
      const html = `
        <div style="display: flex; justify-content: space-between;">
          <span>Left Title</span>
          <span style="color: #999;">Right More</span>
        </div>
      `;
      const { ast } = parseRichContent(html);
      const container = ast[0];

      expect(container.styleObj?.display).toBe('flex');
      expect(container.extra?.parentIsFlex).toBe(false);

      const children = container.children?.filter((c) => c.type === 'element') || [];
      expect(children).toHaveLength(2);

      for (const child of children) {
        expect(child.name).toBe('span');
        expect(child.extra?.parentIsFlex).toBe(true);
        expect(child.extra?.defaultDisplay).toBe('block');
        // Because parentIsFlex is true, it must NOT be rendered as a raw <Text>
        expect(child.extra?.isInline).toBe(false);
      }
    });

    it('supports -webkit-flex and inline-flex containers', () => {
      const html1 = '<div style="display: -webkit-flex;"><span>Child 1</span></div>';
      const { ast: ast1 } = parseRichContent(html1);
      const child1 = ast1[0].children?.find((c) => c.name === 'span');
      expect(child1?.extra?.parentIsFlex).toBe(true);

      const html2 = '<div style="display: inline-flex;"><span>Child 2</span></div>';
      const { ast: ast2 } = parseRichContent(html2);
      const child2 = ast2[0].children?.find((c) => c.name === 'span');
      expect(child2?.extra?.parentIsFlex).toBe(true);
    });

    it('children of non-flex element inside a flex container revert to normal flow', () => {
      const html = `
        <div style="display: flex;">
          <div class="col">
            <span>Nested Text</span>
          </div>
        </div>
      `;
      const { ast } = parseRichContent(html);
      const flexParent = ast[0];
      const col = flexParent.children?.find((c) => c.name === 'div');
      expect(col?.extra?.parentIsFlex).toBe(true);

      // The span inside .col should NOT have parentIsFlex because .col is not display: flex!
      const span = col?.children?.find((c) => c.name === 'span');
      expect(span?.extra?.parentIsFlex).toBe(false);
      expect(span?.extra?.defaultDisplay).toBe('inline');
      expect(span?.extra?.isInline).toBe(true);
    });

    it('handles flex row with flex: 1 and fixed width items accurately', () => {
      const html = `
        <div style="display: flex; align-items: center;">
          <span style="flex: 1;">Flexible Content</span>
          <span style="width: 80px; text-align: right;">Action</span>
        </div>
      `;
      const { ast } = parseRichContent(html);
      const container = ast[0];
      const spans = container.children?.filter((c) => c.name === 'span') || [];

      expect(spans).toHaveLength(2);
      expect(spans[0].extra?.parentIsFlex).toBe(true);
      expect(spans[0].styleObj?.flex).toBe('1');

      expect(spans[1].extra?.parentIsFlex).toBe(true);
      expect(spans[1].styleObj?.width).toBe('4.2667rem');
    });

    it('preserves natural content sizing and prevents equal percentage width forcing for pure text/inline flex rows', () => {
      const html = `
        <section style="display: flex; justify-content: center; align-items: center;">
          <section>羊毛亚麻</section>
          <section>|</section>
          <section>天然、干爽、混色</section>
        </section>
      `;
      const { ast } = parseRichContent(html, { mode: 'wechat' });
      const parent = ast[0];
      const children = parent.children?.filter((c) => c.type === 'element') || [];

      expect(children).toHaveLength(3);

      // Must NOT be forced to 33.33% or flex: 1 1 0%
      for (const child of children) {
        expect(child.styleObj['width']).toBeUndefined();
        expect(child.styleObj['flex']).not.toBe('1 1 0%');
      }
    });

    it('does not force flex: 1 on multiple flexible items when centered with a fixed divider', () => {
      const html = `
        <section style="display: flex; justify-content: center; align-items: center;">
          <section>羊毛亚麻</section>
          <section style="width: 1px; height: 12px; background: #333;"></section>
          <section>天然、干爽、混色</section>
        </section>
      `;
      const { ast } = parseRichContent(html, { mode: 'wechat' });
      const parent = ast[0];
      const children = parent.children?.filter((c) => c.type === 'element') || [];

      expect(children).toHaveLength(3);
      // Fixed divider
      expect(children[1].styleObj['width']).toBe('1px');
      expect(children[1].styleObj['flex-shrink']).toBe('0');

      // The 2 text items must NOT be forced to flex: 1 1 0% because the container is centered
      expect(children[0].styleObj['flex']).not.toBe('1 1 0%');
      expect(children[2].styleObj['flex']).not.toBe('1 1 0%');
    });

    it('strictly preserves authored flex: 0 0 auto and flex-shrink: 0 on template cards without converting to flex-shrink: 1', () => {
      const html = `
        <section style="display: flex; flex-flow: row; justify-content: flex-start;">
          <section style="display: block; flex: 0 0 auto;">超长互拼 告别大刀弯</section>
          <section style="display: block; flex: 0 0 auto; text-align: right;">&nbsp; &nbsp; &nbsp; &nbsp;应用场景 户外帐篷</section>
        </section>
      `;
      const { ast } = parseRichContent(html, { mode: 'wechat' });
      const parent = ast[0];
      const children = parent.children?.filter((c) => c.type === 'element') || [];

      expect(children).toHaveLength(2);
      expect(children[0].styleObj['flex']).toBe('0 0 auto');
      expect(children[0].styleObj['flex-shrink']).toBe('0');

      expect(children[1].styleObj['flex']).toBe('0 0 auto');
      expect(children[1].styleObj['flex-shrink']).toBe('0');

      // Check that non-breaking spaces are preserved in text
      const textChild = children[1].children?.[0];
      expect(textChild?.type).toBe('text');
      expect(textChild?.text).toContain('\u00A0');
      expect((textChild?.text?.match(/\u00A0/g) || []).length).toBe(4);
    });
  });
});



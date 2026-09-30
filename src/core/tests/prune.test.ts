import { describe, it, expect } from 'vitest';
import { parseRichContent } from '../index';
import { pruneAST, hasVisualStyles, isVisuallyEmpty, isEmptyParagraph } from '../optimizer/tree-pruner';

describe('AST Tree Pruner (tree-pruner.ts)', () => {
  it('should remove visually empty tags without styles or dimensions', () => {
    const html = `
      <div>
        <p>Real paragraph</p>
        <p></p>
        <span></span>
        <div> </div>
        <p><span></span></p>
      </div>
    `;

    const result = parseRichContent(html);
    // Outer div contains only the real paragraph after empty tags are pruned
    const root = result.ast[0];
    expect(root.children).toHaveLength(1);
    expect(root.children![0].name).toBe('p');
    expect(root.children![0].children![0].text).toBe('Real paragraph');
  });

  it('should preserve void and replaced tags even when empty', () => {
    const html = `
      <div>
        <img src="https://example.com/test.png" />
        <br />
        <hr />
        <video src="https://example.com/test.mp4"></video>
        <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" /></svg>
      </div>
    `;

    const result = parseRichContent(html);
    const root = result.ast[0];
    const tagNames = root.children?.map((c) => c.name);
    expect(tagNames).toContain('img');
    expect(tagNames).toContain('br');
    expect(tagNames).toContain('hr');
    expect(tagNames).toContain('video');
    expect(tagNames).toContain('svg');
  });

  it('should preserve empty elements that have visual styling (bg, border, height, shadow)', () => {
    const html = `
      <div>
        <div style="background-color: #ff0000;"></div>
        <div style="border: 1px solid #ccc;"></div>
        <div style="height: 30px;"></div>
        <div style="box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></div>
        <div id="anchor-target"></div>
      </div>
    `;

    const result = parseRichContent(html);
    const root = result.ast[0];
    // All 5 should be preserved because they have visual styles or an ID
    expect(root.children).toHaveLength(5);
    expect(root.children![0].styleObj['background-color']).toBe('#ff0000');
    expect(root.children![1].styleObj['border']).toContain('1px solid');
    expect(root.children![2].styleObj['height']).toBeDefined();
    expect(root.children![3].styleObj['box-shadow']).toBeDefined();
    expect(root.children![4].attrs.id).toBe('anchor-target');
  });

  it('should fold multiple consecutive blank paragraphs into exactly one spacer', () => {
    const html = `
      <div>
        <p>First paragraph</p>
        <p><br></p>
        <p><br></p>
        <p>&nbsp;</p>
        <p></p>
        <p>Second paragraph</p>
        <p><br></p>
        <p><br></p>
        <p>Third paragraph</p>
      </div>
    `;

    const result = parseRichContent(html);
    const root = result.ast[0];
    const children = root.children || [];

    // Should have:
    // 1: First paragraph
    // 2: 1 folded spacer paragraph
    // 3: Second paragraph
    // 4: 1 folded spacer paragraph
    // 5: Third paragraph
    expect(children).toHaveLength(5);
    expect(children[0].children?.[0]?.text).toBe('First paragraph');
    expect(isEmptyParagraph(children[1])).toBe(true);
    expect(children[2].children?.[0]?.text).toBe('Second paragraph');
    expect(isEmptyParagraph(children[3])).toBe(true);
    expect(children[4].children?.[0]?.text).toBe('Third paragraph');
  });

  it('should unwrap unstyled single-child wrapper containers to reduce tree depth', () => {
    const html = `
      <div>
        <div>
          <section>
            <div>
              <p>Deeply nested text</p>
            </div>
          </section>
        </div>
      </div>
    `;

    const result = parseRichContent(html);
    // 4 levels of unstyled div/section wrappers should unwrap directly down
    expect(result.ast).toHaveLength(1);
    const root = result.ast[0];
    expect(root.name).toBe('p');
    expect(root.children?.[0]?.text).toBe('Deeply nested text');
  });

  it('should not unwrap containers with layout styles (flex, grid, absolute positioning)', () => {
    const html = `
      <div style="display: flex;">
        <section>
          <p>Text</p>
        </section>
      </div>
    `;

    const result = parseRichContent(html);
    expect(result.ast[0].name).toBe('div');
    expect(result.ast[0].styleObj['display']).toBe('flex');
    expect(result.ast[0].children?.[0]?.name).toBe('p'); // inner unstyled section was unwrapped into p
  });

  it('should allow disabling pruning via prune: false option', () => {
    const html = `
      <div>
        <p></p>
        <span></span>
        <p>Text</p>
      </div>
    `;

    const withPrune = parseRichContent(html, { prune: true, cache: false });
    const withoutPrune = parseRichContent(html, { prune: false, cache: false });

    expect(withPrune.ast[0].children).toHaveLength(1);
    expect(withoutPrune.ast[0].children!.length).toBeGreaterThan(1);
  });

  it('should support fine-grained PruneOptions', () => {
    const html = `
      <div>
        <p>P1</p>
        <p><br></p>
        <p><br></p>
        <p>P2</p>
        <p></p>
      </div>
    `;

    // Only fold paragraphs, do not remove empty tags
    const result = parseRichContent(html, {
      prune: {
        removeEmpty: false,
        foldEmptyParagraphs: true
      },
      cache: false
    });

    const root = result.ast[0];
    // P1, 1 folded blank line, P2, empty p
    expect(root.children).toHaveLength(4);
  });
});

import { describe, it, expect } from 'vitest';
import { parseRichContent, truncateRichContent, truncateAST, calculateTotalTextLength } from '../index';

describe('AST Truncation & Excerpt Engine (truncator.ts)', () => {
  it('should accurately calculate total text length across nested elements', () => {
    const html = `
      <div>
        <h1>Title</h1>
        <p>This is a <strong>bold</strong> and <em>italic</em> sentence.</p>
      </div>
    `;
    const { ast } = parseRichContent(html);
    const totalLen = calculateTotalTextLength(ast);
    // "Title" (5) + "This is a " (10) + "bold" (4) + " and " (5) + "italic" (6) + " sentence." (10) = 40
    expect(totalLen).toBe(40);
  });

  it('should safely truncate AST text while strictly preserving tag closure and tree structure', () => {
    const html = `
      <div class="article">
        <p>Paragraph one with <strong>important bold</strong> text.</p>
        <p>Paragraph two with further explanations and details.</p>
      </div>
    `;

    // Truncate to 25 characters
    const result = truncateRichContent(html, { maxLength: 25, ellipsis: '...' });

    expect(result.isTruncated).toBe(true);
    expect(result.truncatedLength).toBe(25);
    expect(result.totalTextLength).toBeGreaterThan(25);

    // Root should still be valid div
    expect(result.ast).toHaveLength(1);
    const root = result.ast[0];
    expect(root.name).toBe('div');

    // First paragraph should exist, with tags properly closed
    const p1 = root.children?.[0];
    expect(p1?.name).toBe('p');

    // Check that ellipsis was appended at the truncation boundary
    const strong = p1?.children?.find((c) => c.name === 'strong');
    expect(strong).toBeDefined();
    // Subsequent paragraph 2 should not exist because limit was reached in paragraph 1
    expect(root.children).toHaveLength(1);
  });

  it('should support custom ellipsis string', () => {
    const html = '<p>Hello world from universal rich text rendering engine.</p>';
    const result = truncateRichContent(html, { maxLength: 11, ellipsis: ' [阅读更多]' });

    expect(result.isTruncated).toBe(true);
    const textNode = result.ast[0].children?.[0];
    expect(textNode?.text).toBe('Hello world [阅读更多]');
  });

  it('should preserve media tags within the truncated length by default (preserveMedia: true)', () => {
    const html = `
      <div>
        <p>Start text</p>
        <img src="https://example.com/cover.png" alt="Cover" />
        <p>Continuing text that goes on for a long time.</p>
      </div>
    `;

    const result = truncateRichContent(html, { maxLength: 15, preserveMedia: true });

    expect(result.isTruncated).toBe(true);
    expect(result.galleryList).toContain('https://example.com/cover.png');

    const root = result.ast[0];
    const imgNode = root.children?.find((c) => c.name === 'img');
    expect(imgNode).toBeDefined();
    expect(imgNode?.attrs.src).toBe('https://example.com/cover.png');
  });

  it('should filter out media tags when preserveMedia is false', () => {
    const html = `
      <div>
        <p>Start text</p>
        <img src="https://example.com/cover.png" alt="Cover" />
        <p>Continuing text that goes on for a long time.</p>
      </div>
    `;

    const result = truncateRichContent(html, { maxLength: 15, preserveMedia: false });

    expect(result.isTruncated).toBe(true);
    expect(result.galleryList).toHaveLength(0);

    const root = result.ast[0];
    const imgNode = root.children?.find((c) => c.name === 'img');
    expect(imgNode).toBeUndefined();
  });

  it('should not mark isTruncated if content is shorter than maxLength', () => {
    const html = '<p>Short text</p>';
    const result = truncateRichContent(html, { maxLength: 100 });

    expect(result.isTruncated).toBe(false);
    expect(result.ast[0].children?.[0]?.text).toBe('Short text');
  });

  it('should seamlessly integrate truncate into parseRichContent', () => {
    const html = `
      <div>
        <p>First paragraph with enough length to be truncated.</p>
        <p>Second paragraph that should not be reached.</p>
      </div>
    `;

    const result = parseRichContent(html, {
      truncate: { maxLength: 15, ellipsis: '...' }
    });

    expect(result.truncateInfo).toBeDefined();
    expect(result.truncateInfo?.isTruncated).toBe(true);
    expect(result.truncateInfo?.truncatedLength).toBe(15);
    expect(result.ast[0].children).toHaveLength(1);
  });

  it('should automatically shield border-radius with overflow: hidden', () => {
    const html = `
      <div style="border-radius: 12px; background-color: #f5f5f5;">
        <img src="https://example.com/banner.png" style="width: 100%;" />
      </div>
    `;

    const result = parseRichContent(html);
    const card = result.ast[0];
    expect(card.styleObj['border-radius']).toBeDefined();
    // overflow: hidden must be auto-injected to prevent inner media from piercing corners
    expect(card.styleObj['overflow']).toBe('hidden');
  });
});

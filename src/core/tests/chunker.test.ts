import { describe, it, expect } from 'vitest';
import { parseRichContent } from '../index';
import { chunkAST, calculateNodeWeight } from '../optimizer/chunker';

describe('Weighted Adaptive Chunker (chunker.ts)', () => {
  it('should calculate higher weight for heavy nodes (img, video, svg, table, code)', () => {
    const textNode = parseRichContent('<p>Simple text</p>').ast[0];
    const imgNode = parseRichContent('<img src="https://example.com/test.png" />').ast[0];
    const tableNode = parseRichContent('<table><tr><td>Row 1</td><td>Row 2</td></tr></table>').ast[0];

    const textWeight = calculateNodeWeight(textNode);
    const imgWeight = calculateNodeWeight(imgNode);
    const tableWeight = calculateNodeWeight(tableNode);

    // Paragraph + text = 2
    expect(textWeight).toBe(2);
    // Heavy img = 3
    expect(imgWeight).toBe(3);
    // Table is heavy (3) + tr + td + text
    expect(tableWeight).toBeGreaterThan(5);
  });

  it('should split blocks into initial and remaining batches based on weight budgets', () => {
    // Generate 50 paragraphs
    let html = '';
    for (let i = 1; i <= 50; i++) {
      html += `<p>Paragraph item number ${i}</p>`;
    }

    const { ast } = parseRichContent(html);
    expect(ast.length).toBe(50);

    // Initial budget = 20 weight (each p is weight 2 -> ~10 items), chunk budget = 30
    const chunked = chunkAST(ast, { initialWeight: 20, chunkWeight: 30 });

    expect(chunked.totalNodes).toBe(50);
    expect(chunked.initial.length).toBe(10);
    expect(chunked.remaining.length).toBeGreaterThan(0);

    // Sum of all chunks equals totalNodes
    const flattenedCount = chunked.initial.length + chunked.remaining.reduce((sum, batch) => sum + batch.length, 0);
    expect(flattenedCount).toBe(50);
  });

  it('should accommodate heavy media items properly without dropping nodes', () => {
    let html = '';
    for (let i = 1; i <= 20; i++) {
      html += `<img src="https://example.com/img${i}.png" />`;
    }

    const { ast } = parseRichContent(html);
    expect(ast.length).toBe(20);

    // Each img is weight 3. initialWeight: 15 -> 5 images in initial
    const chunked = chunkAST(ast, { initialWeight: 15, chunkWeight: 30 });

    expect(chunked.initial.length).toBe(5);
    expect(chunked.remaining.length).toBe(2); // 10 images (weight 30) + 5 images (weight 15)

    const total = chunked.initial.length + chunked.remaining.reduce((sum, b) => sum + b.length, 0);
    expect(total).toBe(20);
  });

  it('should guarantee at least 1 node in initial chunk even if weight exceeds limit', () => {
    // Single massive table
    let tableHtml = '<table>';
    for (let r = 0; r < 20; r++) {
      tableHtml += '<tr><td>Cell</td><td>Cell</td><td>Cell</td></tr>';
    }
    tableHtml += '</table><p>Next block</p>';

    const { ast } = parseRichContent(tableHtml);
    // Table weight will be > 50, but initialWeight is 10
    const chunked = chunkAST(ast, { initialWeight: 10, chunkWeight: 20 });

    // Must still have 1 node in initial
    expect(chunked.initial.length).toBe(1);
    expect(chunked.initial[0].name).toBe('table');
    expect(chunked.remaining.length).toBe(1);
    expect(chunked.remaining[0][0].name).toBe('p');
  });

  it('should support legacy chunkSize option for backward compatibility', () => {
    let html = '';
    for (let i = 1; i <= 30; i++) {
      html += `<p>Line ${i}</p>`;
    }

    const { ast } = parseRichContent(html);
    const chunked = chunkAST(ast, { chunkSize: 10 });

    expect(chunked.initial.length).toBe(10);
    expect(chunked.remaining.length).toBe(2);
    expect(chunked.remaining[0].length).toBe(10);
    expect(chunked.remaining[1].length).toBe(10);
  });
});

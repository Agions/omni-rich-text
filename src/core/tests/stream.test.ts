import { describe, it, expect } from 'vitest';
import {
  healMarkdownTail,
  isMarkdownIncomplete,
  createStreamParser,
  parseStreamContent,
  findLastSafeBlockBoundary,
  markdownToHtml,
  parseRichContent
} from '../index';

describe('Markdown Table & Stream Auto-Flush Compiler', () => {
  it('should compile GFM tables into <table> with headers and alignment', () => {
    const md = `
| Name | Age | City |
| :--- | :---: | ---: |
| Alice | 24 | New York |
| Bob | 30 | London |
`;
    const html = markdownToHtml(md);
    expect(html).toContain('<table>');
    expect(html).toContain('<thead><tr><th style="text-align: left;">Name</th>');
    expect(html).toContain('<th style="text-align: center;">Age</th>');
    expect(html).toContain('<th style="text-align: right;">City</th>');
    expect(html).toContain('<tbody><tr><td style="text-align: left;">Alice</td>');
    expect(html).toContain('<td style="text-align: center;">24</td>');
    expect(html).toContain('</table>');
  });

  it('should auto-flush unclosed code block at EOF during streaming', () => {
    const streamingCode = '```typescript\nconst message = "hello world";';
    const html = markdownToHtml(streamingCode);
    expect(html).toContain('<pre><code class="language-typescript">');
    expect(html).toContain('const message = "hello world";');
    expect(html).toContain('</code></pre>');
  });

  it('should parse inline math delimiters', () => {
    const md = 'The mass-energy equivalence is $E=mc^2$.';
    const html = markdownToHtml(md);
    expect(html).toContain('<span class="omni-math-inline">E=mc^2</span>');
  });
});

describe('Markdown Tail Syntax Healer (healMarkdownTail)', () => {
  it('should heal unclosed triple backtick code fence', () => {
    const unclosed = '```python\ndef test():\n    return 42';
    expect(isMarkdownIncomplete(unclosed)).toBe(true);
    const healed = healMarkdownTail(unclosed);
    expect(healed.endsWith('```')).toBe(true);
    expect(healed).toBe('```python\ndef test():\n    return 42\n```');
  });

  it('should heal unclosed tilde code fence (~~~)', () => {
    const unclosed = '~~~rust\nfn main() {}';
    const healed = healMarkdownTail(unclosed);
    expect(healed.endsWith('~~~')).toBe(true);
  });

  it('should heal unclosed inline code backtick', () => {
    const unclosed = 'Please install `omni-rich-text/core';
    expect(isMarkdownIncomplete(unclosed)).toBe(true);
    const healed = healMarkdownTail(unclosed);
    expect(healed).toBe('Please install `omni-rich-text/core`');
  });

  it('should heal unclosed bold (**) and italic (*)', () => {
    const unclosedBold = 'This is an **important notice:';
    expect(isMarkdownIncomplete(unclosedBold)).toBe(true);
    expect(healMarkdownTail(unclosedBold)).toBe('This is an **important notice:**');

    const unclosedItalic = 'This is *emphasized';
    expect(healMarkdownTail(unclosedItalic)).toBe('This is *emphasized*');
  });

  it('should heal unclosed strikethrough (~~)', () => {
    const unclosed = 'Price was ~~100';
    expect(isMarkdownIncomplete(unclosed)).toBe(true);
    expect(healMarkdownTail(unclosed)).toBe('Price was ~~100~~');
  });

  it('should heal unclosed links and images', () => {
    const unclosedLink = 'Check out [our documentation](https://github.com/Agions/omni-rich-text';
    expect(healMarkdownTail(unclosedLink)).toBe(
      'Check out [our documentation](https://github.com/Agions/omni-rich-text)'
    );

    const unclosedImg = '![Logo](https://example.com/logo.png';
    expect(healMarkdownTail(unclosedImg)).toBe('![Logo](https://example.com/logo.png)');
  });

  it('should heal unclosed table rows', () => {
    const unclosedRow = '| ID | Status | Message\n| 1 | Success';
    expect(isMarkdownIncomplete(unclosedRow)).toBe(true);
    const healed = healMarkdownTail(unclosedRow);
    expect(healed).toBe('| ID | Status | Message\n| 1 | Success |');
  });

  it('should heal unclosed LaTeX block math ($$)', () => {
    const unclosedMath = 'Formula:\n$$\\int_0^\\infty e^{-x^2} dx';
    expect(isMarkdownIncomplete(unclosedMath)).toBe(true);
    const healed = healMarkdownTail(unclosedMath);
    expect(healed.endsWith('$$')).toBe(true);
  });
});

describe('IncrementalStreamParser', () => {
  it('should detect safe block boundaries outside code blocks', () => {
    const text = 'Paragraph 1\n\nParagraph 2\n\nActive tail';
    const boundary = findLastSafeBlockBoundary(text);
    expect(boundary).toBeGreaterThan(0);
    expect(text.substring(0, boundary)).toContain('Paragraph 1');
  });

  it('should not break inside a code block fence', () => {
    const text = '```javascript\nconst a = 1;\n\nconst b = 2;\n```';
    const boundary = findLastSafeBlockBoundary(text);
    // Boundary is at the end or -1 (no trailing boundary after block)
    expect(boundary).toBe(-1);
  });

  it('should increment stream and attach blinking cursor node', () => {
    const parser = createStreamParser({
      showCursor: true,
      cursorChar: '▍'
    });

    const res1 = parser.write('Hello ');
    expect(res1.ast.length).toBeGreaterThan(0);
    const lastNode = res1.ast[res1.ast.length - 1];
    // Check cursor presence
    const cursor = JSON.stringify(res1.ast);
    expect(cursor).toContain('omni_stream_cursor_node');
    expect(cursor).toContain('▍');

    // Finish stream
    const finalRes = parser.finish();
    const finalJson = JSON.stringify(finalRes.ast);
    expect(finalJson).not.toContain('omni_stream_cursor_node');
    expect(parser.isCompleted()).toBe(true);
  });

  it('should correctly heal incomplete tail syntax across token writes', () => {
    const parser = createStreamParser();
    // Incomplete bold tag streamed
    const res = parser.update('This is **streaming text');
    const json = JSON.stringify(res.ast);
    // Should have healed into strong tag
    expect(json).toContain('"name":"strong"');
  });

  it('should support parseStreamContent convenience function', () => {
    const content = 'AI response is `typing';
    const streamRes = parseStreamContent(content, { format: 'markdown', showCursor: true });
    const json = JSON.stringify(streamRes.ast);
    // Incomplete inline code should be healed
    expect(json).toContain('"name":"code"');
    expect(json).toContain('omni_stream_cursor_node');

    // When complete, cursor is omitted
    const completedRes = parseStreamContent('AI response is `typing`', {
      format: 'markdown',
      isComplete: true
    });
    const completedJson = JSON.stringify(completedRes.ast);
    expect(completedJson).not.toContain('omni_stream_cursor_node');
  });
});

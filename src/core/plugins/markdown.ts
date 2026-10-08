/**
 * Lightweight Markdown Compiler
 * Converts Markdown text into clean HTML ready for the core AST pipeline.
 * Supports GFM tables, syntax-highlighted code blocks, lists, quotes, headings, math, and streaming auto-flush.
 */

export function markdownToHtml(md: string): string {
  if (!md || typeof md !== 'string') return '';

  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const htmlOutput: string[] = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockBuffer: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' = 'ul';

  // Table buffering state
  let inTable = false;
  let tableBuffer: string[] = [];

  const flushTable = () => {
    if (!inTable || tableBuffer.length === 0) {
      inTable = false;
      tableBuffer = [];
      return;
    }
    htmlOutput.push(renderMarkdownTable(tableBuffer));
    inTable = false;
    tableBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. Code Block Fence (``` or ~~~)
    const codeMatch = line.match(/^ *(```+|~~~+)(\w*)/);
    if (codeMatch) {
      flushTable();
      if (!inCodeBlock) {
        if (inList) {
          inList = false;
          htmlOutput.push(`</${listType}>`);
        }
        inCodeBlock = true;
        codeBlockLang = codeMatch[2] || '';
        codeBlockBuffer = [];
      } else {
        inCodeBlock = false;
        const escapedCode = codeBlockBuffer
          .join('\n')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        htmlOutput.push(
          `<pre><code class="language-${codeBlockLang}">${escapedCode}</code></pre>`
        );
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      continue;
    }

    // 2. Table row detection (| ... |)
    const isTableRow = line.trim().startsWith('|') || (line.includes('|') && /\|.*\|/.test(line));
    if (isTableRow) {
      if (inList) {
        inList = false;
        htmlOutput.push(`</${listType}>`);
      }
      inTable = true;
      tableBuffer.push(line);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // 3. Unordered & Ordered Lists
    const ulMatch = line.match(/^[\*\-]\s+(.*)/);
    const olMatch = line.match(/^(\d+)\.\s+(.*)/);

    if (ulMatch || olMatch) {
      const currentListType = ulMatch ? 'ul' : 'ol';
      const itemContent = ulMatch ? ulMatch[1] : olMatch![2];

      if (!inList) {
        inList = true;
        listType = currentListType;
        htmlOutput.push(`<${listType}>`);
      } else if (listType !== currentListType) {
        htmlOutput.push(`</${listType}>`);
        listType = currentListType;
        htmlOutput.push(`<${listType}>`);
      }

      htmlOutput.push(`<li>${parseInlineMarkdown(itemContent)}</li>`);
      continue;
    } else if (inList) {
      inList = false;
      htmlOutput.push(`</${listType}>`);
    }

    // Empty line
    if (line.trim() === '') {
      if (inList) {
        inList = false;
        htmlOutput.push(`</${listType}>`);
      }
      continue;
    }

    // 4. Headings (#)
    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = parseInlineMarkdown(headingMatch[2]);
      htmlOutput.push(`<h${level}>${title}</h${level}>`);
      continue;
    }

    // 5. Blockquote (>)
    const quoteMatch = line.match(/^>\s+(.*)/);
    if (quoteMatch) {
      const quote = parseInlineMarkdown(quoteMatch[1]);
      htmlOutput.push(`<blockquote><p>${quote}</p></blockquote>`);
      continue;
    }

    // 6. Horizontal Rule (---, ***, ___)
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      htmlOutput.push('<hr />');
      continue;
    }

    // 7. Regular Paragraph
    htmlOutput.push(`<p>${parseInlineMarkdown(line)}</p>`);
  }

  // End of content auto-flush for streaming
  if (inCodeBlock) {
    const escapedCode = codeBlockBuffer
      .join('\n')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    htmlOutput.push(
      `<pre><code class="language-${codeBlockLang}">${escapedCode}</code></pre>`
    );
  }

  if (inTable) {
    flushTable();
  }

  if (inList) {
    htmlOutput.push(`</${listType}>`);
  }

  return htmlOutput.join('\n');
}

/**
 * Parses inline markdown: images, links, bold, italic, code, strikethrough, math
 */
export function parseInlineMarkdown(text: string): string {
  if (!text) return '';

  return text
    // Inline Math: $...$
    .replace(/(^|[^\\])\$([^\$]+?)\$/g, '$1<span class="omni-math-inline">$2</span>')
    // Images: ![alt](url)
    .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" />')
    // Links: [title](url)
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
    // Bold: **text** or __text__
    .replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>')
    // Italic: *text* or _text_
    .replace(/(\*|_)(.*?)\1/g, '<em>$2</em>')
    // Inline code: `code`
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Strikethrough: ~~text~~
    .replace(/~~(.*?)~~/g, '<del>$1</del>');
}

/**
 * Parses markdown table rows into standard <table> HTML
 */
function renderMarkdownTable(rows: string[]): string {
  if (rows.length === 0) return '';

  const parseCells = (rowStr: string) => {
    let trimmed = rowStr.trim();
    if (trimmed.startsWith('|')) trimmed = trimmed.substring(1);
    if (trimmed.endsWith('|')) trimmed = trimmed.substring(0, trimmed.length - 1);
    return trimmed.split('|').map((c) => c.trim());
  };

  // Check if second row is separator e.g. |---|---| or |:---|---:|
  const isSeparator = (rowStr: string) => {
    return /^\|?[\s\-:]+(\|[\s\-:]+)+\|?$/.test(rowStr.trim());
  };

  const parseAlignments = (sepStr: string): string[] => {
    const cells = parseCells(sepStr);
    return cells.map((cell) => {
      const left = cell.startsWith(':');
      const right = cell.endsWith(':');
      if (left && right) return 'center';
      if (right) return 'right';
      if (left) return 'left';
      return '';
    });
  };

  let headerRow: string[] = [];
  let alignments: string[] = [];
  let dataStartIndex = 0;

  if (rows.length >= 2 && isSeparator(rows[1])) {
    headerRow = parseCells(rows[0]);
    alignments = parseAlignments(rows[1]);
    dataStartIndex = 2;
  } else if (rows.length >= 1 && isSeparator(rows[0])) {
    alignments = parseAlignments(rows[0]);
    dataStartIndex = 1;
  }

  const html: string[] = ['<table>'];

  if (headerRow.length > 0) {
    html.push('<thead><tr>');
    headerRow.forEach((cell, idx) => {
      const align = alignments[idx] ? ` style="text-align: ${alignments[idx]};"` : '';
      html.push(`<th${align}>${parseInlineMarkdown(cell)}</th>`);
    });
    html.push('</tr></thead>');
  }

  if (dataStartIndex < rows.length) {
    html.push('<tbody>');
    for (let r = dataStartIndex; r < rows.length; r++) {
      if (isSeparator(rows[r])) continue;
      const cells = parseCells(rows[r]);
      html.push('<tr>');
      cells.forEach((cell, idx) => {
        const align = alignments[idx] ? ` style="text-align: ${alignments[idx]};"` : '';
        html.push(`<td${align}>${parseInlineMarkdown(cell)}</td>`);
      });
      html.push('</tr>');
    }
    html.push('</tbody>');
  }

  html.push('</table>');
  return html.join('');
}

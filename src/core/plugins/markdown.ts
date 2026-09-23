/**
 * Lightweight Markdown Compiler
 * Converts Markdown text into clean HTML ready for the core AST pipeline.
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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. Code Block Fence (```)
    const codeMatch = line.match(/^```(\w*)/);
    if (codeMatch) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = codeMatch[1] || '';
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

    // 2. Unordered & Ordered Lists
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

    // 3. Headings (#)
    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = parseInlineMarkdown(headingMatch[2]);
      htmlOutput.push(`<h${level}>${title}</h${level}>`);
      continue;
    }

    // 4. Blockquote (>)
    const quoteMatch = line.match(/^>\s+(.*)/);
    if (quoteMatch) {
      const quote = parseInlineMarkdown(quoteMatch[1]);
      htmlOutput.push(`<blockquote><p>${quote}</p></blockquote>`);
      continue;
    }

    // 5. Horizontal Rule (---, ***, ___)
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      htmlOutput.push('<hr />');
      continue;
    }

    // 6. Regular Paragraph
    htmlOutput.push(`<p>${parseInlineMarkdown(line)}</p>`);
  }

  if (inList) {
    htmlOutput.push(`</${listType}>`);
  }

  return htmlOutput.join('\n');
}

/**
 * Parses inline markdown: images, links, bold, italic, code, strikethrough
 */
export function parseInlineMarkdown(text: string): string {
  if (!text) return '';

  return text
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

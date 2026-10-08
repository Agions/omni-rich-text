/**
 * Markdown Tail Syntax Healer for LLM Streaming
 * Automatically detects and repairs incomplete Markdown syntax at the streaming boundary.
 */

export interface HealOptions {
  /** Auto-close unclosed code block fences (``` or ~~~). Default: true */
  autoCloseFences?: boolean;
  /** Auto-close unclosed inline formatting (bold, italic, code, strike, math). Default: true */
  autoCloseInline?: boolean;
  /** Auto-balance incomplete table rows. Default: true */
  autoCloseTables?: boolean;
  /** Auto-close unclosed LaTeX math delimiters ($$ or $). Default: true */
  autoCloseMath?: boolean;
  /** Auto-close unclosed HTML tags. Default: true */
  autoCloseHtml?: boolean;
}

/**
 * Checks if a markdown text has unclosed syntax at its tail
 */
export function isMarkdownIncomplete(md: string): boolean {
  if (!md || typeof md !== 'string') return false;

  // 1. Check unclosed code fences
  const fenceMatches = md.match(/^ *(```|~~~)/gm);
  if (fenceMatches && fenceMatches.length % 2 !== 0) {
    return true;
  }

  // 2. Check unclosed block math $$
  const blockMathMatches = md.match(/\$\$/g);
  if (blockMathMatches && blockMathMatches.length % 2 !== 0) {
    return true;
  }

  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const lastLine = lines[lines.length - 1];

  // 3. Check incomplete link or image: [text](url or ![alt](url without )
  if (/!?\[[^\]]*\]\([^\)]*$/.test(lastLine)) {
    return true;
  }

  // 4. Check unclosed inline code (odd count of ` on last line)
  const backticks = (lastLine.match(/`/g) || []).length;
  if (backticks % 2 !== 0) {
    return true;
  }

  // 5. Check unclosed bold / italic
  const bolds = (lastLine.match(/\*\*/g) || []).length;
  if (bolds % 2 !== 0) return true;

  const strikes = (lastLine.match(/~~/g) || []).length;
  if (strikes % 2 !== 0) return true;

  // 6. Check unclosed table row
  if (lastLine.trim().startsWith('|') && !lastLine.trim().endsWith('|')) {
    return true;
  }

  return false;
}

/**
 * Repairs unclosed syntax at the end of a streaming Markdown string
 */
export function healMarkdownTail(md: string, options: HealOptions = {}): string {
  if (!md || typeof md !== 'string') return '';

  const {
    autoCloseFences = true,
    autoCloseInline = true,
    autoCloseTables = true,
    autoCloseMath = true,
    autoCloseHtml = true
  } = options;

  let healed = md.replace(/\r\n/g, '\n');

  // --- 1. Code Fences Healing (``` or ~~~) ---
  if (autoCloseFences) {
    const lines = healed.split('\n');
    let inFence = false;
    let fenceType = '```';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^ *(```+|~~~+)/);
      if (match) {
        const marker = match[1];
        if (!inFence) {
          inFence = true;
          fenceType = marker.startsWith('`') ? '```' : '~~~';
        } else {
          // If closing fence matches
          if (marker.startsWith(fenceType[0])) {
            inFence = false;
          }
        }
      }
    }

    if (inFence) {
      // Ensure there is a newline before closing fence
      if (!healed.endsWith('\n')) {
        healed += '\n';
      }
      healed += fenceType;
      // If we healed a code block fence, internal text is preserved as code, return early
      return healed;
    }
  }

  // --- 2. Block Math Healing ($$) ---
  if (autoCloseMath) {
    const blockMathMatches = healed.match(/\$\$/g);
    if (blockMathMatches && blockMathMatches.length % 2 !== 0) {
      if (!healed.endsWith('\n')) {
        healed += '\n';
      }
      healed += '$$';
      return healed;
    }
  }

  // Split into lines to inspect tail line
  const lines = healed.split('\n');
  let lastLine = lines[lines.length - 1];

  // --- 3. Table Rows Healing ---
  if (autoCloseTables && lastLine.trim().startsWith('|')) {
    const trimmed = lastLine.trimEnd();
    if (!trimmed.endsWith('|')) {
      // If typing a separator row like `| --- | --`
      if (/^\|[\s\-:]+(\|[\s\-:]+)*$/.test(trimmed)) {
        lastLine = trimmed + '-|';
      } else {
        lastLine = trimmed + ' |';
      }
      lines[lines.length - 1] = lastLine;
      healed = lines.join('\n');
    }
  }

  // --- 4. Links & Images Healing ---
  if (autoCloseInline) {
    // Incomplete link/image: [text](http... or ![alt](http... missing closing )
    if (/!?\[[^\]]*\]\([^)]*$/.test(lastLine)) {
      lastLine += ')';
      lines[lines.length - 1] = lastLine;
      healed = lines.join('\n');
    } else if (/!?\[[^\]]*$/.test(lastLine)) {
      // Incomplete bracket without url: `[text` or `![alt`
      // Close bracket and add dummy empty target `]()`
      lastLine += ']()';
      lines[lines.length - 1] = lastLine;
      healed = lines.join('\n');
    }
  }

  // --- 5. Inline Code Healing (`) ---
  if (autoCloseInline) {
    const codeTickCount = (lastLine.match(/`/g) || []).length;
    if (codeTickCount % 2 !== 0) {
      lastLine += '`';
      lines[lines.length - 1] = lastLine;
      healed = lines.join('\n');
    }
  }

  // --- 6. Inline Delimiters Healing (**, ~~, *, _, $) ---
  if (autoCloseInline) {
    // Strikethrough ~~
    const strikeCount = (lastLine.match(/~~/g) || []).length;
    if (strikeCount % 2 !== 0) {
      lastLine += '~~';
    }

    // Bold **
    // Strip code spans first so `**` inside code is not counted
    const strippedLine = lastLine.replace(/`[^`]*`/g, '');
    const boldStarCount = (strippedLine.match(/\*\*/g) || []).length;
    if (boldStarCount % 2 !== 0) {
      lastLine += '**';
    } else {
      // Italic * (only if not bold)
      // Remove double asterisks first
      const noBold = strippedLine.replace(/\*\*/g, '');
      const singleStarCount = (noBold.match(/(^|[^\\])\*/g) || []).length;
      if (singleStarCount % 2 !== 0) {
        lastLine += '*';
      }
    }

    // Bold __ or Italic _
    const boldUnderCount = (strippedLine.match(/__/g) || []).length;
    if (boldUnderCount % 2 !== 0) {
      lastLine += '__';
    }

    // Inline LaTeX math $
    if (autoCloseMath) {
      // Ignore escaped \$
      const mathCount = (lastLine.match(/(^|[^\\])\$/g) || []).length;
      if (mathCount % 2 !== 0) {
        lastLine += '$';
      }
    }

    lines[lines.length - 1] = lastLine;
    healed = lines.join('\n');
  }

  // --- 7. Unclosed HTML Tag Healing ---
  if (autoCloseHtml) {
    // If line ends with an opening tag snippet e.g. `<span class="abc"` without `>`
    const unclosedTagMatch = healed.match(/<([a-zA-Z][a-zA-Z0-9]*)[^>]*$/);
    if (unclosedTagMatch) {
      healed += '>';
    }
  }

  return healed;
}

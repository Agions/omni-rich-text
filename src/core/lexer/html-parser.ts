import { ASTNode, ParseOptions } from '../types/ast';
import {
  isAllowedTag,
  isAllowedAttr,
  sanitizeUrl,
  VOID_TAGS,
  BLOCK_TAGS,
  WX_IGNORED_TAGS,
  SVG_TAGS
} from '../sanitizer/whitelist';
import {
  resolveNodeStyles,
  WECHAT_REM_BASE,
  DEFAULT_REM_SCALE,
  DEFAULT_BASE_FONT_SIZE,
  DEFAULT_CONTENT_BASE_FONT_SIZE
} from '../styler/css-inliner';
import { extractStyleRules, resolveExtractedStyles, ExtractedStyleSheet } from '../styler/wx-style-extractor';

let idCounter = 0;
export function generateNodeId(): string {
  return `ur_node_${++idCounter}_${Math.random().toString(36).substring(2, 6)}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

/**
 * Basic HTML entity decoding
 */
export function decodeHtmlEntities(str: string): string {
  if (!str || !str.includes('&')) return str;
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

/**
 * Parses tag attribute string into key-value map
 */
export function parseAttributes(
  attrString: string,
  allowedAttrs?: string[],
  isCustomTag?: boolean
): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (!attrString) return attrs;

  // Regex matches: attrName="val", attrName='val', attrName=val, or boolean attrName
  const attrRegex = /([a-zA-Z0-9_:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(attrString)) !== null) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? '';

    if (!isAllowedAttr(name, allowedAttrs, isCustomTag)) {
      continue;
    }

    if (name === 'href' || name === 'src' || name === 'data-src') {
      attrs[name] = sanitizeUrl(value);
    } else {
      attrs[name] = decodeHtmlEntities(value);
    }
  }

  return attrs;
}

/**
 * Core HTML string to AST parser
 */
export function parseHtml(html: string, options: ParseOptions = {}): ASTNode[] {
  resetIdCounter();
  if (!html || typeof html !== 'string') return [];

  // 1. Extract <style> block rules if enabled or in wechat mode
  let styleSheet: ExtractedStyleSheet | undefined;
  let cleanHtml = html;
  if (options.extractStyles || options.mode === 'wechat') {
    const extracted = extractStyleRules(cleanHtml);
    cleanHtml = extracted.cleanHtml;
    styleSheet = extracted.styleSheet;
  } else {
    cleanHtml = cleanHtml.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  }

  // 2. Strip scripts, XML declarations, and comments
  cleanHtml = cleanHtml
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim();

  const root: ASTNode = {
    id: 'root',
    type: 'element',
    name: 'root',
    attrs: {},
    styleStr: '',
    styleObj: {},
    children: []
  };

const BLOCK_TAGS = new Set([
  'root', 'html', 'body', 'div', 'section', 'article', 'aside', 'header', 'footer',
  'nav', 'main', 'figure', 'figcaption', 'blockquote', 'p',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'form', 'fieldset', 'legend', 'details', 'summary'
]);

function isInsidePre(stack: ASTNode[]): boolean {
  for (let i = stack.length - 1; i >= 0; i--) {
    const name = stack[i].name;
    if (name === 'pre' || name === 'code') return true;
  }
  return false;
}

  const stack: ASTNode[] = [root];
  // Tag regex: 1: isCloseSlash, 2: tagName, 3: rawAttrs, 4: isSelfCloseSlash
  const tagRegex = /<(\/)?([a-zA-Z0-9:-]+)([^>]*)(\/?)>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(cleanHtml)) !== null) {
    const [fullMatch, isCloseSlash, rawTagName, rawAttrs, isSelfCloseSlash] = match;
    const matchIndex = match.index;

    // Handle text between tags
    if (matchIndex > lastIndex) {
      const textChunk = cleanHtml.slice(lastIndex, matchIndex);
      const decodedText = decodeHtmlEntities(textChunk);
      if (decodedText.length > 0) {
        const currentParent = stack[stack.length - 1];
        currentParent.children = currentParent.children || [];

        if (isInsidePre(stack)) {
          currentParent.children.push({
            id: generateNodeId(),
            type: 'text',
            attrs: {},
            styleStr: '',
            styleObj: {},
            text: decodedText
          });
        } else {
          const isAllWhitespace = /^\s*$/.test(decodedText);
          const isParentBlock = BLOCK_TAGS.has(currentParent.name || '');

          if (isAllWhitespace) {
            // Ignore inter-block whitespace (formatting indentation between block elements)
            if (!isParentBlock) {
              const lastChild = currentParent.children[currentParent.children.length - 1];
              if (lastChild && lastChild.type === 'text' && lastChild.text && !lastChild.text.endsWith(' ')) {
                lastChild.text += ' ';
              }
            }
          } else {
            let text = decodedText.replace(/\s+/g, ' ');

            if (textChunk.startsWith('\n') || textChunk.startsWith('\r') || (isParentBlock && currentParent.children.length === 0)) {
              text = text.trimStart();
            }

            if (textChunk.endsWith('\n') || textChunk.endsWith('\r')) {
              text = text.trimEnd();
            }

            if (text.length > 0) {
              currentParent.children.push({
                id: generateNodeId(),
                type: 'text',
                attrs: {},
                styleStr: '',
                styleObj: {},
                text
              });
            }
          }
        }
      }
    }

    lastIndex = tagRegex.lastIndex;
    const tagName = rawTagName.toLowerCase();
    const isCustomTag = !!(options.customTags && options.customTags.includes(tagName));

    // Check tag whitelist
    if (options.sanitize !== false && !isAllowedTag(tagName, options.allowedTags, options.customTags)) {
      continue;
    }

    const isClose = !!isCloseSlash;
    const isSelfClosing = !!isSelfCloseSlash || VOID_TAGS.has(tagName);

    if (isClose) {
      // Find matching tag in stack from top to bottom
      let foundIndex = -1;
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].name === tagName) {
          foundIndex = i;
          break;
        }
      }
      if (foundIndex > 0) {
        const closingNode = stack[foundIndex];
        if (closingNode.children && closingNode.children.length > 0 && !isInsidePre(stack)) {
          const lastChild = closingNode.children[closingNode.children.length - 1];
          if (lastChild.type === 'text' && lastChild.text && BLOCK_TAGS.has(closingNode.name || '')) {
            lastChild.text = lastChild.text.trimEnd();
            if (lastChild.text.length === 0) {
              closingNode.children.pop();
            }
          }
        }
        // Pop back to the found tag
        stack.length = foundIndex;
      }
    } else {
      // Open tag
      const parsedAttrs = parseAttributes(rawAttrs, options.allowedAttrs, isCustomTag);

      // WeChat image handling: data-src -> src fallback
      if (tagName === 'img') {
        if (!parsedAttrs.src && parsedAttrs['data-src']) {
          parsedAttrs.src = parsedAttrs['data-src'];
        }
      }

      // Pre-calculate image aspect ratio from data-ratio
      let dataRatio: number | undefined;
      let placeholderHeight: string | undefined;
      if (tagName === 'img' && parsedAttrs['data-ratio']) {
        const ratioNum = parseFloat(parsedAttrs['data-ratio']);
        if (!isNaN(ratioNum) && ratioNum > 0) {
          dataRatio = ratioNum;
          placeholderHeight = `${(ratioNum * 100).toFixed(2)}%`;
        }
      }

      // Resolve CSS styles (tag default + extracted classes/ids + inline styles)
      const userStyle = parsedAttrs.style || '';
      const extraStyles = resolveExtractedStyles(tagName, parsedAttrs, styleSheet);
      const { styleStr, styleObj } = resolveNodeStyles(
        tagName,
        userStyle,
        options.mode,
        extraStyles,
        options.fontScale ?? 1,
        options.rootFontSize ?? WECHAT_REM_BASE,
        options.remScale ?? DEFAULT_REM_SCALE,
        options.baseFontSize ?? options.fontSize ?? DEFAULT_BASE_FONT_SIZE,
        options.contentBaseFontSize ?? DEFAULT_CONTENT_BASE_FONT_SIZE
      );

      const isWxIgnored = WX_IGNORED_TAGS.has(tagName);
      const isSvg = SVG_TAGS.has(tagName);

      const node: ASTNode = {
        id: generateNodeId(),
        type: 'element',
        name: tagName,
        attrs: parsedAttrs,
        styleStr,
        styleObj,
        children: isSelfClosing ? undefined : [],
        extra: {
          isCustom: isCustomTag,
          isBlock: BLOCK_TAGS.has(tagName) || isCustomTag,
          isSvg,
          wxIgnored: isWxIgnored,
          dataRatio,
          placeholderHeight
        }
      };

      const currentParent = stack[stack.length - 1];
      currentParent.children = currentParent.children || [];
      currentParent.children.push(node);

      if (!isSelfClosing) {
        stack.push(node);
      }
    }
  }

  // Trailing text after last tag
  if (lastIndex < cleanHtml.length) {
    const trailingText = decodeHtmlEntities(cleanHtml.slice(lastIndex));
    if (trailingText.length > 0 && !/^\s*$/.test(trailingText)) {
      root.children = root.children || [];
      root.children.push({
        id: generateNodeId(),
        type: 'text',
        attrs: {},
        styleStr: '',
        styleObj: {},
        text: trailingText.replace(/\s+/g, ' ').trim()
      });
    }
  }

  return root.children || [];
}

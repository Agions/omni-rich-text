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
  stringifyStyleObject,
  WECHAT_REM_BASE,
  DEFAULT_REM_SCALE,
  DEFAULT_BASE_FONT_SIZE,
  DEFAULT_CONTENT_BASE_FONT_SIZE
} from '../styler/css-inliner';
import { extractStyleRules, resolveExtractedStyles, ExtractedStyleSheet } from '../styler/wx-style-extractor';
import { calculateImageDimensions } from '../utils/image';

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
        options.contentBaseFontSize ?? DEFAULT_CONTENT_BASE_FONT_SIZE,
        options.fontSizeResolver
      );

      // Pre-calculate image aspect ratio and placeholder height from attrs & style
      let dataRatio: number | undefined;
      let placeholderHeight: string | undefined;
      let aspectRatio: number | undefined;
      if (tagName === 'img') {
        const imgDims = calculateImageDimensions(parsedAttrs, styleObj);
        dataRatio = imgDims.dataRatio;
        placeholderHeight = imgDims.placeholderHeight;
        aspectRatio = imgDims.aspectRatio;
      }

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
          aspectRatio,
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

  const resultNodes = root.children || [];
  optimizeASTLayout(resultNodes);
  return resultNodes;
}

/**
 * Recursively post-processes and optimizes layout for flex containers,
 * multi-image rows, and mobile responsive adaptation.
 */
function optimizeASTLayout(nodes: ASTNode[]): void {
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      optimizeASTLayout(node.children);

      const isFlex =
        node.styleObj?.display === 'flex' ||
        node.styleObj?.display === 'inline-flex' ||
        node.styleStr?.includes('display: flex') ||
        node.styleStr?.includes('display: inline-flex');

      const isColumn =
        node.styleObj?.['flex-direction'] === 'column' ||
        node.styleObj?.['flex-flow']?.includes('column');

      // 1. Flex container optimization for mobile:
      // Prevent flex children from overflowing screen by setting min-width: 0 and allowing flex items to shrink
      if (isFlex && !isColumn) {
        for (const child of node.children) {
          if (child.type !== 'element') continue;
          child.styleObj = child.styleObj || {};
          child.styleObj['min-width'] = child.styleObj['min-width'] || '0';
          child.styleObj['max-width'] = child.styleObj['max-width'] || '100%';
          child.styleObj['box-sizing'] = child.styleObj['box-sizing'] || 'border-box';

          // In WeChat articles, desktop editors often output `flex: 0 0 auto` for columns.
          // On mobile, flex: 0 0 auto has flex-shrink: 0 which prevents columns from shrinking,
          // causing the right-hand column to overflow the screen. We convert it to allow shrinking.
          if (child.styleObj.flex === '0 0 auto') {
            child.styleObj.flex = '0 1 auto';
            child.styleObj['flex-shrink'] = '1';
          }

          // If direct child is an img, make it flex-share the row
          if (child.name === 'img') {
            child.styleObj.flex = child.styleObj.flex || '1 1 0%';
            child.styleObj['max-width'] = '100%';
          }
          child.styleStr = stringifyStyleObject(child.styleObj);
        }
      }

      // 2. Multi-image row optimization (e.g. multiple images in a p / div / section):
      const imgChildren = node.children.filter((c) => c.name === 'img');
      if (imgChildren.length >= 2) {
        node.extra = node.extra || {};
        node.extra.isMultiImage = true;
        for (const img of imgChildren) {
          img.extra = img.extra || {};
          img.extra.isMultiImage = true;
          img.styleObj = img.styleObj || {};
          // Ensure it does not force 100% width if sibling images exist
          if (!isFlex) {
            img.styleObj['display'] = img.styleObj['display'] || 'inline-block';
            img.styleObj['vertical-align'] = img.styleObj['vertical-align'] || 'top';
            img.styleObj['box-sizing'] = img.styleObj['box-sizing'] || 'border-box';
            img.styleObj['max-width'] = img.styleObj['max-width'] || '100%';
          }
          img.styleStr = stringifyStyleObject(img.styleObj);
        }
      }
    }
  }
}

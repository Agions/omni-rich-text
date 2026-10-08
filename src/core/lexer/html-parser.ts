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
import { INLINE_TAGS, isFlexDisplay, getDefaultDisplay, isAllInline } from '../utils/inline';
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
        if (closingNode.extra) {
          closingNode.extra.isInline = isAllInline(closingNode);
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
        options.baseFontSize,
        options.contentBaseFontSize,
        options.fontSizeResolver,
        parsedAttrs
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
      const currentParent = stack[stack.length - 1];
      const parentIsFlex = isFlexDisplay(currentParent?.styleObj?.display);
      const isInlineTag = INLINE_TAGS.has(tagName);
      const defaultDisplay = getDefaultDisplay(tagName, parentIsFlex);

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
          parentIsFlex,
          isInlineTag,
          defaultDisplay,
          dataRatio,
          aspectRatio,
          placeholderHeight
        }
      };

      if (isSelfClosing && node.extra) {
        node.extra.isInline = isAllInline(node);
      }

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

  function finalizeInlineStatus(nodes: ASTNode[]): void {
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        finalizeInlineStatus(node.children);
      }
      if (node.extra && node.extra.isInline === undefined) {
        node.extra.isInline = isAllInline(node);
      }
    }
  }
  finalizeInlineStatus(resultNodes);

  return resultNodes;
}

/**
 * Converts length value with px, rem, rpx, or pure number into pixels
 */
function parseLengthToPx(raw: any, rootFontSize: number = WECHAT_REM_BASE): number | undefined {
  if (typeof raw === 'number') return raw;
  if (!raw || typeof raw !== 'string') return undefined;
  const s = raw.trim();
  const m = s.match(/^([+-]?[\d.]+)\s*(px|rem|rpx|em|pt)?$/i);
  if (!m) return undefined;
  const num = parseFloat(m[1]);
  if (isNaN(num)) return undefined;
  const unit = (m[2] || 'px').toLowerCase();
  if (unit === 'rem' || unit === 'em') return num * rootFontSize;
  if (unit === 'rpx') return num / 2;
  if (unit === 'pt') return (num * 4) / 3;
  return num;
}

/**
 * Helper to identify if an <img> represents a small inline icon, avatar, or emoji sticker (<= 80px)
 */
function isIconImage(node: ASTNode, rootFontSize: number = WECHAT_REM_BASE): boolean {
  if (node.name !== 'img') return false;
  const rawClass = node.attrs?.class || '';
  if (/wx_emoji|emoji|icon/i.test(rawClass)) return true;

  const dataW = node.attrs?.['data-w'] ? parseFloat(node.attrs['data-w']) : undefined;
  const dataH = node.attrs?.['data-h'] ? parseFloat(node.attrs['data-h']) : undefined;
  if ((dataW !== undefined && dataW > 0 && dataW <= 80) || (dataH !== undefined && dataH > 0 && dataH <= 80)) {
    return true;
  }

  const wPx = parseLengthToPx(node.styleObj?.width || node.attrs?.width, rootFontSize);
  const hPx = parseLengthToPx(node.styleObj?.height || node.attrs?.height, rootFontSize);

  // Explicit small icons, avatars, and stickers <= 80px
  if ((wPx !== undefined && wPx > 0 && wPx <= 80) || (hPx !== undefined && hPx > 0 && hPx <= 80)) {
    return true;
  }
  // Check inline display with small dimension
  if (node.styleObj?.display === 'inline-block' && wPx !== undefined && wPx <= 120) {
    return true;
  }
  return false;
}

function hasDescendantImage(node: ASTNode): boolean {
  if (node.name === 'img' && !isIconImage(node)) return true;
  if (!node.children || node.children.length === 0) return false;
  return node.children.some(hasDescendantImage);
}

/**
 * Recursively optimizes descendant elements and images inside a column of a multi-column row.
 * Ensures images and wrapper sections scale down properly on mobile and never overflow the column.
 */
function optimizeColumnDescendants(node: ASTNode, isMultiColumn: boolean): void {
  if (node.name === 'img') {
    if (isIconImage(node)) {
      node.extra = node.extra || {};
      node.extra.isIcon = true;
      node.styleObj = node.styleObj || {};
      node.styleObj['display'] = 'inline-block';
      node.styleObj['vertical-align'] = 'middle';
    } else {
      node.extra = node.extra || {};
      node.extra.isMultiImage = isMultiColumn;
      node.styleObj = node.styleObj || {};

      const hasAuthoredWidth =
        (node.styleObj['width'] && node.styleObj['width'] !== '100%' && node.styleObj['width'] !== 'auto') ||
        (node.attrs?.width && node.attrs.width !== '100%') ||
        (node.attrs?.['data-w'] && Number(node.attrs['data-w']) < 500);

      if (!hasAuthoredWidth) {
        node.styleObj['width'] = '100%';
        if (node.styleObj['height'] && !node.attrs?.height) {
          delete node.styleObj['height'];
        }
      }
      node.styleObj['max-width'] = node.styleObj['max-width'] || '100%';
      node.styleObj['display'] = hasAuthoredWidth ? (node.styleObj['display'] || 'inline-block') : 'block';
      node.styleObj['box-sizing'] = 'border-box';
      node.styleStr = stringifyStyleObject(node.styleObj);
    }
    return;
  }

  if (node.type === 'element') {
    node.styleObj = node.styleObj || {};
    node.styleObj['box-sizing'] = node.styleObj['box-sizing'] || 'border-box';
    // Only clamp very large container widths (>= 300px or >= 16rem from desktop editors)
    // Preserves intentional small decorative items, avatars (e.g. 40px, 56px, 80px), badges, icons
    const rawW = node.styleObj['width'];
    if (rawW && !rawW.endsWith('%')) {
      const wPx = parseLengthToPx(rawW);
      if (wPx !== undefined && wPx >= 300 && node.styleObj['flex-shrink'] !== '0') {
        node.styleObj['width'] = '100%';
        node.styleObj['max-width'] = '100%';
      }
    }
    node.styleStr = stringifyStyleObject(node.styleObj);
  }

  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      optimizeColumnDescendants(child, isMultiColumn);
    }
  }
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
        isFlexDisplay(node.styleObj?.display) ||
        node.styleStr?.includes('display: flex') ||
        node.styleStr?.includes('display: inline-flex');

      if (isFlex) {
        for (const child of node.children) {
          if (child.type === 'element') {
            child.extra = child.extra || {};
            child.extra.parentIsFlex = true;
            child.extra.defaultDisplay = 'block';
            child.extra.isInline = isAllInline(child);
          }
        }
      }

      const isColumn =
        node.styleObj?.['flex-direction'] === 'column' ||
        node.styleObj?.['flex-flow']?.includes('column');

      // 1. Flex container multi-column gallery and layout optimization for mobile:
      // Preserves intentional authored fixed widths (avatars, icons, product covers),
      // while balancing unconstrained columns to (100 / count)% and flex: 1 1 0% so
      // percentage-width children (like images) never collapse to 0px in CSS flexbox.
      if (isFlex && !isColumn) {
        const elemChildren = node.children.filter((c) => c.type === 'element');

        function hasExplicitColWidth(col: ASTNode): boolean {
          const w = col.styleObj?.width;
          if (w && w !== 'auto' && w !== '100%') {
            const px = parseLengthToPx(w);
            // Desktop multi-column grid from WeChat/Xiumi has width: 333.5px or >= 300px.
            // On mobile, these large widths should NOT be treated as fixed columns, but responsive grid columns!
            if (px !== undefined && px >= 300) {
              return false;
            }
            return true;
          }
          if (col.attrs?.width && col.attrs.width !== '100%') {
            const px = parseLengthToPx(col.attrs.width);
            if (px !== undefined && px >= 300) return false;
            return true;
          }
          // Check if column wraps a fixed-size avatar/icon/cover (<= 240px)
          if (col.children && col.children.length === 1) {
            const onlyChild = col.children[0];
            const cw =
              onlyChild.styleObj?.width ||
              onlyChild.attrs?.width ||
              (onlyChild.attrs?.['data-w'] && Number(onlyChild.attrs['data-w']) <= 240 ? `${onlyChild.attrs['data-w']}px` : undefined);
            if (cw && cw !== 'auto' && cw !== '100%') {
              const px = parseLengthToPx(cw);
              if (px !== undefined && px <= 240) return true;
            }
          }
          return false;
        }

        if (elemChildren.length === 1) {
          const only = elemChildren[0];
          if (!hasExplicitColWidth(only)) {
            only.styleObj = only.styleObj || {};
            only.styleObj['width'] = '100%';
            if (!only.styleObj['flex']) {
              only.styleObj['flex'] = '1 1 0%';
            }
            only.styleStr = stringifyStyleObject(only.styleObj);
          }
        } else if (elemChildren.length > 1) {
          const fixedCols = elemChildren.filter(hasExplicitColWidth);
          const flexCols = elemChildren.filter((c) => !hasExplicitColWidth(c));

          node.styleObj = node.styleObj || {};
          node.styleObj['box-sizing'] = node.styleObj['box-sizing'] || 'border-box';
          node.styleObj['max-width'] = node.styleObj['max-width'] || '100%';
          node.styleStr = stringifyStyleObject(node.styleObj);

          if (fixedCols.length > 0 && flexCols.length > 0) {
            // Asymmetric layout with authored fixed columns (e.g. 56px avatar + bio text)
            for (const col of fixedCols) {
              col.styleObj = col.styleObj || {};
              col.styleObj['flex-shrink'] = '0';
              col.styleStr = stringifyStyleObject(col.styleObj);
            }
            for (const col of flexCols) {
              col.styleObj = col.styleObj || {};
              if (!col.styleObj['flex']) {
                col.styleObj['flex'] = '1 1 0%';
              }
              col.styleObj['min-width'] = '0';
              col.styleObj['box-sizing'] = col.styleObj['box-sizing'] || 'border-box';
              if (hasDescendantImage(col)) {
                optimizeColumnDescendants(col, true);
              }
              col.styleStr = stringifyStyleObject(col.styleObj);
            }
          } else if (fixedCols.length === 0) {
            const imgCols = elemChildren.filter(hasDescendantImage);
            const textCols = elemChildren.filter((c) => !hasDescendantImage(c));

            if (imgCols.length > 0 && textCols.length > 0) {
              // Asymmetric Media Object layout: image/badge alongside text
              // Media column should NOT blow up to 50% or squish the text column!
              for (const col of imgCols) {
                col.styleObj = col.styleObj || {};
                col.styleObj['flex-shrink'] = '0';
                col.styleObj['box-sizing'] = col.styleObj['box-sizing'] || 'border-box';
                if (!col.styleObj['width'] || col.styleObj['width'] === '100%') {
                  col.styleObj['width'] = '35%';
                  col.styleObj['max-width'] = '35%';
                }
                optimizeColumnDescendants(col, false);
                col.styleStr = stringifyStyleObject(col.styleObj);
              }
              for (const col of textCols) {
                col.styleObj = col.styleObj || {};
                col.styleObj['flex'] = '1 1 0%';
                col.styleObj['min-width'] = '0';
                col.styleObj['box-sizing'] = col.styleObj['box-sizing'] || 'border-box';
                col.styleStr = stringifyStyleObject(col.styleObj);
              }
            } else {
              // Pure multi-column layout (e.g. multi-image gallery row or multi-column text)
              const count = elemChildren.length;
              const percentWidth = `${parseFloat((100 / count).toFixed(2))}%`;

              for (const col of elemChildren) {
                col.styleObj = col.styleObj || {};
                col.styleObj['min-width'] = '0';
                col.styleObj['max-width'] = '100%';
                col.styleObj['box-sizing'] = col.styleObj['box-sizing'] || 'border-box';
                if (!col.styleObj['flex'] || col.styleObj['flex'] === '0 0 auto') {
                  col.styleObj['flex'] = '1 1 0%';
                }
                col.styleObj['flex-shrink'] = '1';

                if (!col.styleObj['width'] || !col.styleObj['width'].endsWith('%')) {
                  col.styleObj['width'] = percentWidth;
                }
                if (hasDescendantImage(col)) {
                  if (col.name !== 'img') {
                    optimizeColumnDescendants(col, true);
                  } else if (isIconImage(col)) {
                    col.extra = col.extra || {};
                    col.extra.isIcon = true;
                    col.styleObj['display'] = 'inline-block';
                    col.styleObj['vertical-align'] = 'middle';
                  } else {
                    col.extra = col.extra || {};
                    col.extra.isMultiImage = true;
                    col.styleObj['display'] = 'block';
                  }
                }
                col.styleStr = stringifyStyleObject(col.styleObj);
              }
            }
          } else {
            // All columns have explicit widths: ensure none shrink unintentionally
            for (const col of elemChildren) {
              col.styleObj = col.styleObj || {};
              col.styleObj['flex-shrink'] = col.styleObj['flex-shrink'] || '0';
              col.styleStr = stringifyStyleObject(col.styleObj);
            }
          }
        }
      }

      // 2. Multi-image row optimization (e.g. multiple images in a non-flex p / div / section):
      const imgChildren = node.children.filter((c) => c.name === 'img' && !isIconImage(c));
      if (imgChildren.length >= 2) {
        node.extra = node.extra || {};
        node.extra.isMultiImage = true;
        const count = imgChildren.length;
        const percentWidth = `${parseFloat((100 / count).toFixed(2))}%`;
        for (const img of imgChildren) {
          img.extra = img.extra || {};
          img.extra.isMultiImage = true;
          img.styleObj = img.styleObj || {};
          if (!isFlex) {
            img.styleObj['display'] = 'inline-block';
            img.styleObj['vertical-align'] = 'top';
            img.styleObj['box-sizing'] = 'border-box';
            img.styleObj['width'] = percentWidth;
            img.styleObj['max-width'] = '100%';
          }
          img.styleStr = stringifyStyleObject(img.styleObj);
        }
      }

      // 3. Mark standalone icons
      for (const child of node.children) {
        if (child.name === 'img' && isIconImage(child)) {
          child.extra = child.extra || {};
          child.extra.isIcon = true;
          child.styleObj = child.styleObj || {};
          child.styleObj['display'] = 'inline-block';
          child.styleObj['vertical-align'] = 'middle';
          if (child.styleObj['width'] === '100%') {
            const rawW = child.attrs?.width;
            child.styleObj['width'] = rawW ? (rawW.endsWith('px') ? rawW : `${rawW}px`) : 'auto';
          }
          child.styleStr = stringifyStyleObject(child.styleObj);
        }
      }
    }
  }
}

/**
 * Detects the dominant theme background color of a WeChat article (if any).
 * Articles designed in tools like Xiumi or 135 often apply the theme background color
 * (e.g. beige #f7f4ea) repeatedly to major content sections instead of the body.
 */
export function detectArticleThemeBg(nodes: ASTNode[]): string | undefined {
  const bgScores: Record<string, number> = {};

  function isColored(bg: string | undefined): boolean {
    if (!bg) return false;
    const lower = bg.trim().toLowerCase();
    if (
      lower === 'transparent' ||
      lower === 'none' ||
      lower === 'inherit' ||
      lower === 'initial' ||
      lower === 'currentcolor' ||
      lower.startsWith('rgba(0,') ||
      lower.startsWith('rgba(255, 255, 255, 0') ||
      lower === 'white' ||
      lower === '#fff' ||
      lower === '#ffffff' ||
      lower === 'rgb(255, 255, 255)' ||
      lower.startsWith('rgb(255, 255, 255')
    ) {
      return false;
    }
    return true;
  }

  function scoreNodes(list: ASTNode[], depth: number) {
    for (const node of list) {
      const bg = node.styleObj?.['background-color'] || node.styleObj?.['background'];
      if (isColored(bg)) {
        const weight = depth <= 2 ? 3 : 1;
        const width = node.styleObj?.['width'];
        const isFull = !width || width === '100%' || width.endsWith('100%');
        const score = weight + (isFull ? 2 : 0);
        bgScores[bg!] = (bgScores[bg!] || 0) + score;
      }
      if (node.children && node.children.length > 0) {
        scoreNodes(node.children, depth + 1);
      }
    }
  }

  scoreNodes(nodes, 0);

  let bestBg: string | undefined;
  let maxScore = 0;
  for (const [bg, score] of Object.entries(bgScores)) {
    if (score > maxScore) {
      maxScore = score;
      bestBg = bg;
    }
  }

  if (bestBg && maxScore >= 4) {
    return bestBg;
  }
  return undefined;
}

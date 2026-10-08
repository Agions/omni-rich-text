/**
 * CSS Parser, Style Inliner, and Mini Program REM Converter
 */

export const DEFAULT_TAG_STYLES: Record<string, Record<string, string>> = {
  img: {
    width: '100%'
  }
};

export const WX_ARTICLE_TAG_STYLES: Record<string, Record<string, string>> = {};

/**
 * WeChat Official Account article desktop canvas baseline width in px.
 * Desktop rich text editors (Xiumi, 135editor, MP editor) default to a 677px wide editing container.
 */
export const WECHAT_CANVAS_WIDTH = 677;

/**
 * WeChat Mini Program standard rem base:
 * In WeChat Mini Program, screen width is specified as 20rem.
 * On standard 375px screen (750rpx):
 * 1rem = 375px / 20 = 18.75px.
 * 1rem = 750rpx / 20 = 37.5rpx.
 *
 * For rich text layout content (often authored in 750px design/retina canvas),
 * rem values are halved (DEFAULT_REM_SCALE = 0.5) to render accurately in Mini Program.
 */
export const WECHAT_REM_BASE = 18.75;
export const WECHAT_RPX_REM_BASE = 37.5;
export const DEFAULT_ROOT_FONT_SIZE = WECHAT_REM_BASE;
export const DEFAULT_REM_SCALE = 1.0;

/**
 * Default target base font size (in px): e.g. 15px.
 * Normal body text will display at 15px (0.8rem).
 */
export const DEFAULT_BASE_FONT_SIZE = 15;

/**
 * Default source content base font size (in px): e.g. 22px.
 * Standard body text size in WeChat article & Quill editors.
 */
export const DEFAULT_CONTENT_BASE_FONT_SIZE = 22;

/**
 * Dimension properties where pure numbers or length values represent pixel distances
 * in HTML inline styles.
 */
export const DIMENSION_PROPERTIES = new Set([
  'width',
  'min-width',
  'max-width',
  'height',
  'min-height',
  'max-height',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'top',
  'bottom',
  'left',
  'right',
  'border-width',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-radius',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-left-radius',
  'border-bottom-right-radius',
  'letter-spacing',
  'word-spacing',
  'text-indent',
  'gap',
  'row-gap',
  'column-gap',
  'flex-basis',
  'font-size'
]);

/**
 * Parses raw CSS style string into key-value map.
 * Robust state-machine tokenizer that respects quotes ('...', "...") and parentheses
 * (url(...), calc(...), linear-gradient(...)) so semicolons inside Data URIs or URLs
 * do not prematurely split style declarations.
 */
export function parseStyleString(rawStyle: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!rawStyle || typeof rawStyle !== 'string') return result;

  const len = rawStyle.length;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let parenDepth = 0;
  let current = '';

  for (let i = 0; i < len; i++) {
    const char = rawStyle[i];

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      current += char;
    } else if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      current += char;
    } else if (char === '(' && !inSingleQuote && !inDoubleQuote) {
      parenDepth++;
      current += char;
    } else if (char === ')' && !inSingleQuote && !inDoubleQuote) {
      if (parenDepth > 0) parenDepth--;
      current += char;
    } else if (char === ';' && !inSingleQuote && !inDoubleQuote && parenDepth === 0) {
      const colonIdx = current.indexOf(':');
      if (colonIdx !== -1) {
        const prop = current.slice(0, colonIdx).trim().toLowerCase();
        const val = current.slice(colonIdx + 1).trim();
        if (prop && val) {
          result[prop] = val;
        }
      }
      current = '';
    } else {
      current += char;
    }
  }

  // Trailing declaration without final semicolon
  if (current.trim()) {
    const colonIdx = current.indexOf(':');
    if (colonIdx !== -1) {
      const prop = current.slice(0, colonIdx).trim().toLowerCase();
      const val = current.slice(colonIdx + 1).trim();
      if (prop && val) {
        result[prop] = val;
      }
    }
  }

  return result;
}

/**
 * Serializes style object to inline CSS string
 */
export function stringifyStyleObject(styleObj: Record<string, string>): string {
  return Object.entries(styleObj)
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ');
}

/**
 * Converts CSS dimension and style values with concrete units (px, rpx, upx, pt) or
 * dimension pure numbers into rem units based on WeChat Mini Program rem calculation rules:
 * - Screen width = 20rem
 * - Standard 375px viewport (750rpx):
 *   1rem = 375px / 20 = 18.75px
 *   1rem = 750rpx / 20 = 37.5rpx
 * - rem is halved (remScale = 0.5) to accurately fit mobile display.
 */
export function formatDimensionToRem(
  prop: string,
  value: string,
  rootFontSize: number = WECHAT_REM_BASE,
  scale: number = 1,
  remScale: number = DEFAULT_REM_SCALE,
  mode: 'default' | 'wechat' = 'default'
): string {
  if (!value || typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  const isImportant = /!important\s*$/i.test(trimmed);
  const cleanVal = trimmed.replace(/!important\s*$/i, '').trim();

  const baseRoot = typeof rootFontSize === 'number' && rootFontSize > 0 ? rootFontSize : WECHAT_REM_BASE;
  const lowerProp = prop.toLowerCase();
  const isWidthProp = lowerProp === 'width' || lowerProp === 'max-width' || lowerProp === 'min-width';

  const effectiveRemScale =
    typeof remScale === 'number' && remScale > 0
      ? remScale
      : DEFAULT_REM_SCALE;

  const effectiveScale = (typeof scale === 'number' && scale > 0 ? scale : 1) * effectiveRemScale;
  const rpxBase = baseRoot * 2; // e.g. 18.75 * 2 = 37.5

  // In WeChat mode, if an element or image has width >= 600px (like 677px), it was meant to be 100% full width
  if (mode === 'wechat' && (lowerProp === 'width' || lowerProp === 'max-width')) {
    const singleMatch = cleanVal.match(/^([\d.]+)(px)?$/i);
    if (singleMatch) {
      const pxNum = parseFloat(singleMatch[1]);
      if (!isNaN(pxNum) && pxNum >= 600) {
        return isImportant ? '100% !important' : '100%';
      }
    }
  }

  // Case 1: Pure single number e.g. "200" or "0"
  const singleNumMatch = cleanVal.match(/^([+-]?[\d.]+)$/);
  if (singleNumMatch) {
    const num = parseFloat(singleNumMatch[1]);
    if (isNaN(num)) return trimmed;
    if (num === 0) return isImportant ? '0 !important' : '0';

    // Only convert pure number to rem if property is a dimension property
    if (DIMENSION_PROPERTIES.has(lowerProp)) {
      const val = (num * effectiveScale) / baseRoot;
      const remStr = `${parseFloat(val.toFixed(4))}rem`;
      return isImportant ? `${remStr} !important` : remStr;
    }
    return trimmed;
  }

  // Case 2: Multi-value pure numbers e.g. "10 20" or "10 0 20" for dimension properties
  if (DIMENSION_PROPERTIES.has(lowerProp) && !cleanVal.includes('(')) {
    const parts = cleanVal.split(/\s+/);
    if (
      parts.length > 1 &&
      parts.every(
        (p) =>
          /^[+-]?[\d.]+(px|rpx|upx|pt)?$/i.test(p) ||
          p === 'auto' ||
          p === 'inherit'
      )
    ) {
      const convertedParts = parts.map((part) => {
        if (part === 'auto' || part === 'inherit') return part;
        const m = part.match(/^([+-]?[\d.]+)(px|rpx|upx|pt)?$/i);
        if (!m) return part;
        const num = parseFloat(m[1]);
        if (isNaN(num)) return part;
        if (num === 0) return '0';
        const unit = (m[2] || 'px').toLowerCase();
        let remVal: number;
        if (unit === 'px') {
          remVal = (num * effectiveScale) / baseRoot;
        } else if (unit === 'rpx' || unit === 'upx') {
          remVal = (num * effectiveScale) / rpxBase;
        } else if (unit === 'pt') {
          remVal = (((num * 4) / 3) * effectiveScale) / baseRoot;
        } else {
          remVal = num * effectiveScale;
        }
        return `${parseFloat(remVal.toFixed(4))}rem`;
      });
      const res = convertedParts.join(' ');
      return isImportant ? `${res} !important` : res;
    }
  }

  // Case 3: Values containing explicit px / rpx / upx / pt units
  // e.g. "200px", "10px 0px", "border: 1px solid #ccc", "calc(100% - 200px)"
  // Protect all url(...) blocks so image paths or query params with 'px' (e.g. url('img-100px.png')) are not corrupted
  const urlPlaceholders: string[] = [];
  let maskedVal = cleanVal;
  if (maskedVal.includes('url(')) {
    maskedVal = maskedVal.replace(/url\((?:'[^']*'|"[^"]*"|[^)]*)\)/gi, (match) => {
      urlPlaceholders.push(match);
      return `__OMNI_URL_${urlPlaceholders.length - 1}__`;
    });
  }

  let converted = maskedVal.replace(
    /([\d.]+)\s*(px|rpx|upx|pt)\b/gi,
    (_, numStr, unit) => {
      const num = parseFloat(numStr);
      if (isNaN(num)) return _;
      if (num === 0) return '0';
      const lowerUnit = unit.toLowerCase();
      // Keep 1px hairline borders to prevent subpixel disappearance on mobile
      if (lowerUnit === 'px' && num <= 1 && num > 0) return _;
      let remVal: number;
      if (lowerUnit === 'px') {
        remVal = (num * effectiveScale) / baseRoot;
      } else if (lowerUnit === 'rpx' || lowerUnit === 'upx') {
        remVal = (num * effectiveScale) / rpxBase;
      } else if (lowerUnit === 'pt') {
        remVal = (((num * 4) / 3) * effectiveScale) / baseRoot;
      } else {
        return _;
      }
      return `${parseFloat(remVal.toFixed(4))}rem`;
    }
  );

  // Restore protected url(...) values
  if (urlPlaceholders.length > 0) {
    for (let i = 0; i < urlPlaceholders.length; i++) {
      converted = converted.replace(`__OMNI_URL_${i}__`, urlPlaceholders[i]);
    }
  }

  // Case 4: font-size with relative units (rem / em / %) scaling
  if (lowerProp === 'font-size' && scale !== 1) {
    const relMatch = converted.match(/^([\d.]+)\s*(rem|em|%)$/i);
    if (relMatch) {
      const num = parseFloat(relMatch[1]);
      const unit = relMatch[2];
      const scaledVal = num * scale;
      converted = `${parseFloat(scaledVal.toFixed(4))}${unit}`;
    }
  }

  return isImportant ? `${converted} !important` : converted;
}

/**
 * Converts and calculates CSS font-size to rem units based on base font settings.
 * - Supports setting base font size (e.g. 15px).
 * - If content base font is 22px, it displays as 15px.
 * - For every 1px increase/decrease in content font size, it accumulates/deducts from 15px.
 * - Converts final pixel size to rem based on WeChat Mini Program rule: rem = px / rootFontSize.
 */
export function formatFontSizeToRem(
  value: string,
  rootFontSize: number = WECHAT_REM_BASE,
  fontScale: number = 1,
  baseFontSize?: number | string,
  contentBaseFontSize?: number | string,
  fontSizeResolver?: (sourcePx: number, rawValue: string) => string | number
): string {
  if (!value || typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  const isImportant = /!important\s*$/i.test(trimmed);
  const cleanVal = trimmed.replace(/!important\s*$/i, '').trim();

  // Match numbers with units: px, rpx, upx, pt, rem, em, %
  const match = cleanVal.match(/^([\d.]+)\s*(px|rpx|upx|pt|rem|em|%)?$/i);
  if (!match) return trimmed;

  const num = parseFloat(match[1]);
  if (isNaN(num)) return trimmed;
  if (num === 0) return isImportant ? '0 !important' : '0';

  const unit = (match[2] || 'px').toLowerCase();
  const effectiveScale = typeof fontScale === 'number' && fontScale > 0 ? fontScale : 1;
  const baseRoot = typeof rootFontSize === 'number' && rootFontSize > 0 ? rootFontSize : WECHAT_REM_BASE;

  // Convert source unit to px
  let sourcePx: number;
  if (unit === 'px' || !match[2]) {
    sourcePx = num;
  } else if (unit === 'rpx' || unit === 'upx') {
    sourcePx = num / 2;
  } else if (unit === 'pt') {
    sourcePx = (num * 4) / 3;
  } else if (unit === 'rem' || unit === 'em') {
    sourcePx = num * baseRoot;
  } else {
    sourcePx = num;
  }

  // External custom font size rule adjustment
  if (typeof fontSizeResolver === 'function') {
    const customResult = fontSizeResolver(sourcePx, cleanVal);
    if (typeof customResult === 'string' && customResult.trim()) {
      const res = customResult.trim();
      return isImportant && !res.includes('!important') ? `${res} !important` : res;
    }
    if (typeof customResult === 'number' && !isNaN(customResult) && customResult > 0) {
      const remVal = (customResult * effectiveScale) / baseRoot;
      const res = `${parseFloat(remVal.toFixed(4))}rem`;
      return isImportant ? `${res} !important` : res;
    }
  }

  let finalRem: string;

  if (unit === 'rem' || unit === 'em' || unit === '%') {
    const val = num * effectiveScale;
    finalRem = `${parseFloat(val.toFixed(4))}${unit}`;
  } else if (
    baseFontSize !== undefined &&
    baseFontSize !== null &&
    baseFontSize !== ''
  ) {
    // Only apply delta accumulation if the caller explicitly passed baseFontSize
    const targetBase =
      typeof baseFontSize === 'number'
        ? baseFontSize
        : parseFloat(String(baseFontSize));
    const contentBase =
      typeof contentBaseFontSize === 'number'
        ? contentBaseFontSize
        : (contentBaseFontSize ? parseFloat(String(contentBaseFontSize)) : DEFAULT_CONTENT_BASE_FONT_SIZE);

    if (!isNaN(targetBase) && !isNaN(contentBase)) {
      const delta = sourcePx - contentBase;
      const mappedPx = Math.max(8, targetBase + delta);
      const scaledPx = mappedPx * effectiveScale;
      const remVal = scaledPx / baseRoot;
      finalRem = `${parseFloat(remVal.toFixed(4))}rem`;
    } else {
      const scaledPx = sourcePx * effectiveScale;
      const remVal = scaledPx / baseRoot;
      finalRem = `${parseFloat(remVal.toFixed(4))}rem`;
    }
  } else {
    // Standard 1:1 conversion (preserves content author font size, no 0.5 halving, no -7px reduction)
    const scaledPx = sourcePx * effectiveScale;
    const remVal = scaledPx / baseRoot;
    finalRem = `${parseFloat(remVal.toFixed(4))}rem`;
  }

  return isImportant ? `${finalRem} !important` : finalRem;
}

/**
 * Backward-compatible alias for formatFontSizeToRem
 */
export const scaleFontSizeValue = formatFontSizeToRem;

/**
 * Converts a fontSize prop or theme fontSize value to a rem CSS string
 */
export function toRemFontSize(
  fontSize?: number | string,
  rootFontSize: number = WECHAT_REM_BASE,
  _remScale?: number,
  defaultPx: number = DEFAULT_BASE_FONT_SIZE
): string {
  const baseRoot = rootFontSize > 0 ? rootFontSize : WECHAT_REM_BASE;
  if (fontSize === undefined || fontSize === null || fontSize === '') {
    return `${parseFloat((defaultPx / baseRoot).toFixed(4))}rem`;
  }
  if (typeof fontSize === 'number') {
    return `${parseFloat((fontSize / baseRoot).toFixed(4))}rem`;
  }
  const str = String(fontSize).trim();
  if (str.endsWith('rem') || str.endsWith('em') || str.endsWith('%')) {
    return str;
  }
  const num = parseFloat(str);
  if (!isNaN(num)) {
    return `${parseFloat((num / baseRoot).toFixed(4))}rem`;
  }
  return `${parseFloat((defaultPx / baseRoot).toFixed(4))}rem`;
}

/**
 * Merges tag defaults (e.g. img default 100% width), extracted class/id/tag styles,
 * and user inline styles (which take highest priority).
 * Converts concrete dimensions (width: 200px, padding: 14px 16px, etc.) to rem (halved),
 * and converts font-size based on baseFontSize (15px) and contentBaseFontSize (22px) mapping.
 */
export function resolveNodeStyles(
  tagName: string,
  userInlineStyle: string,
  mode: 'default' | 'wechat' = 'default',
  extraStyles?: Record<string, string>,
  fontScale: number = 1,
  rootFontSize: number = WECHAT_REM_BASE,
  remScale: number = DEFAULT_REM_SCALE,
  baseFontSize?: number | string,
  contentBaseFontSize?: number | string,
  fontSizeResolver?: (sourcePx: number, rawValue: string) => string | number,
  attrs?: Record<string, string>
): {
  styleStr: string;
  styleObj: Record<string, string>;
} {
  const lowerTag = tagName.toLowerCase();
  const tagDefaults: Record<string, string> = { ...(DEFAULT_TAG_STYLES[lowerTag] || {}) };
  const userStyles = parseStyleString(userInlineStyle);

  // If img has explicit width/height in HTML attributes and no inline width in userStyles,
  // preserve the attribute width/height instead of forcing width: 100%
  if (lowerTag === 'img') {
    if (attrs?.width && !userStyles['width']) {
      const rawW = attrs.width.trim();
      tagDefaults['width'] = rawW.endsWith('px') || rawW.endsWith('%') || rawW.endsWith('rem') ? rawW : `${rawW}px`;
    }
    if (attrs?.height && !userStyles['height']) {
      const rawH = attrs.height.trim();
      tagDefaults['height'] = rawH.endsWith('px') || rawH.endsWith('%') || rawH.endsWith('rem') ? rawH : `${rawH}px`;
    }
    // Support WeChat data-w < 500 as explicit width for stickers, badges, and icons
    if (attrs?.['data-w'] && !attrs?.width && !userStyles['width']) {
      const dw = parseFloat(attrs['data-w']);
      if (!isNaN(dw) && dw > 0 && dw < 500) {
        tagDefaults['width'] = `${dw}px`;
      }
    }
    // If image has explicit height (style or attribute) but no width specified, do not force width: 100%
    if ((userStyles['height'] || attrs?.height) && !userStyles['width'] && !attrs?.width) {
      delete tagDefaults['width'];
    }
  }

  const merged: Record<string, string> = {
    ...tagDefaults,
    ...(extraStyles || {}),
    ...userStyles
  };

  for (const [prop, val] of Object.entries(merged)) {
    if (!val) continue;
    if (prop === 'font-size') {
      merged[prop] = formatFontSizeToRem(val, rootFontSize, fontScale, baseFontSize, contentBaseFontSize, fontSizeResolver);
    } else if (prop === 'line-height') {
      // Unitless line-height (e.g. line-height: 2, 1.8) should stay unitless
      if (/^[\d.]+(\s*!important)?$/i.test(val.trim())) {
        continue;
      }
      merged[prop] = formatDimensionToRem(prop, val, rootFontSize, fontScale, remScale, mode);
    } else {
      merged[prop] = formatDimensionToRem(prop, val, rootFontSize, 1, remScale, mode);
    }
  }

  // Ensure img tag always has max-width: 100%
  if (tagName.toLowerCase() === 'img') {
    merged['max-width'] = merged['max-width'] || '100%';
  }

  // Border-radius overflow shielding: prevent inner media or background from piercing rounded corners
  const radius = merged['border-radius'] || merged['border-top-left-radius'];
  if (radius && radius !== '0' && radius !== '0px') {
    if (!merged['overflow']) {
      merged['overflow'] = 'hidden';
    }
  }

  const cleanStyleObj: Record<string, string> = {};
  for (const [prop, val] of Object.entries(merged)) {
    if (!val) continue;
    cleanStyleObj[prop] = typeof val === 'string' ? val.replace(/\s*!important/gi, '').trim() : val;
  }

  return {
    styleStr: stringifyStyleObject(merged),
    styleObj: cleanStyleObj
  };
}

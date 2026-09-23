/**
 * XSS Filter and Whitelist Manager
 */

export const DEFAULT_ALLOWED_TAGS = new Set([
  'div', 'p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'img', 'video', 'audio', 'source',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  'blockquote', 'pre', 'code', 'kbd', 'samp',
  'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'strike',
  'sub', 'sup', 'mark', 'small', 'big',
  'br', 'hr', 'figure', 'figcaption', 'section', 'article', 'aside', 'header', 'footer',
  // Semantic tags for WeChat articles
  'nav', 'main', 'details', 'summary', 'label', 'abbr', 'cite', 'q', 'ruby', 'rt', 'rp',
  // SVG tags (WeChat articles use SVG decorations extensively)
  'svg', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'g',
  'defs', 'use', 'text', 'tspan', 'clippath', 'mask', 'lineargradient', 'radialgradient', 'stop',
]);

export const DEFAULT_ALLOWED_ATTRS = new Set([
  'class', 'style', 'id',
  'src', 'href', 'alt', 'title',
  'width', 'height',
  'poster', 'controls', 'autoplay', 'loop', 'muted',
  'target', 'rel',
  'mode', 'lazy-load',
  // WeChat article image attributes
  'data-src', 'data-ratio', 'data-w', 'data-croporisrc', 'data-type',
  'data-backw', 'data-backh', 'data-id', 'data-tools',
  // SVG attributes
  'viewbox', 'd', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
  'transform', 'xmlns', 'points', 'opacity', 'fill-opacity', 'stroke-opacity',
  'font-size', 'text-anchor', 'dominant-baseline',
  'offset', 'stop-color', 'stop-opacity', 'gradientunits', 'gradienttransform',
  'clip-path', 'clip-rule', 'fill-rule',
]);

export const BLOCK_TAGS = new Set([
  'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'table', 'tr', 'blockquote', 'pre', 'figure',
  'section', 'article', 'aside', 'header', 'footer', 'hr',
  'nav', 'main', 'details', 'summary'
]);

export const VOID_TAGS = new Set([
  'img', 'br', 'hr', 'source', 'input', 'meta', 'link',
  // SVG void-like tags
  'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'stop', 'use'
]);

/** WeChat-specific tags that should be recognized but NOT rendered */
export const WX_IGNORED_TAGS = new Set([
  'mpvoice', 'mp-miniprogram', 'mp-vote', 'qqmusic',
  'mp-common-product', 'mp-style', 'mp-app'
]);

/** SVG container tags */
export const SVG_TAGS = new Set([
  'svg', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'g',
  'defs', 'use', 'text', 'tspan', 'clippath', 'mask', 'lineargradient', 'radialgradient', 'stop',
]);

/**
 * Validates if tag is permitted
 */
export function isAllowedTag(tag: string, customAllowed?: string[], customTags?: string[]): boolean {
  const lower = tag.toLowerCase();
  if (customAllowed && customAllowed.includes(lower)) return true;
  if (customTags && customTags.includes(lower)) return true;
  return DEFAULT_ALLOWED_TAGS.has(lower) || WX_IGNORED_TAGS.has(lower);
}

/**
 * Validates if attribute is permitted
 */
export function isAllowedAttr(attr: string, customAllowed?: string[], isCustomTag?: boolean): boolean {
  const lower = attr.toLowerCase();
  if (lower.startsWith('on')) return false; // Prevent all inline event handlers (onload, onerror, etc.)
  if (isCustomTag) return true; // Custom tags retain custom props/attributes
  if (lower.startsWith('data-')) return true;
  if (customAllowed && customAllowed.includes(lower)) return true;
  return DEFAULT_ALLOWED_ATTRS.has(lower);
}

/**
 * Sanitizes URLs to prevent javascript: or vbscript: injection
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:') || lower.startsWith('data:text/html')) {
    return '';
  }
  return trimmed;
}

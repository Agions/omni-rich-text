import { ASTNode } from '../types/ast';

/**
 * Standard inline tags that render inline text contents without forcing block layout.
 */
export const INLINE_TAGS = new Set([
  'span', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'strike',
  'sub', 'sup', 'mark', 'small', 'big', 'font', 'label', 'abbr', 'cite', 'q',
  'time', 'code'
]);

/**
 * Checks if a CSS display value represents a flexbox container.
 * Supports standard 'flex', 'inline-flex', and vendor-prefixed '-webkit-flex', '-webkit-box'.
 */
export function isFlexDisplay(display?: string): boolean {
  if (!display) return false;
  const d = display.toLowerCase().trim();
  return d === 'flex' || d === 'inline-flex' || d === '-webkit-flex' || d === '-webkit-box';
}

/**
 * Resolves the native HTML/CSS default display for a given tag.
 * - Under a flex container: flex items are blockified (CSS Flexbox spec Section 4).
 * - Under normal flow: inline tags default to 'inline' (or 'inline-block' if rendered as container), block tags to 'block'.
 */
export function getDefaultDisplay(tagName: string, parentIsFlex?: boolean): string {
  const tag = (tagName || '').toLowerCase();
  if (parentIsFlex) {
    return 'block';
  }
  if (INLINE_TAGS.has(tag)) {
    return 'inline';
  }
  if (tag === 'img' || tag === 'svg' || tag === 'video' || tag === 'canvas') {
    return 'inline-block';
  }
  if (tag === 'table') return 'table';
  if (tag === 'thead') return 'table-header-group';
  if (tag === 'tbody') return 'table-row-group';
  if (tag === 'tfoot') return 'table-footer-group';
  if (tag === 'tr') return 'table-row';
  if (tag === 'th' || tag === 'td') return 'table-cell';
  return 'block';
}

/**
 * Recursively checks if an AST node and all its descendants are purely inline tags or text.
 * If a node specifies a block-level display, explicit dimensions / vertical margins,
 * flex item layout properties, or is a direct child of a flex container,
 * it cannot be rendered as a pure <Text> in mini-programs without losing layout fidelity.
 */
export function isAllInline(node: ASTNode): boolean {
  if (node.type === 'text') return true;
  if (!INLINE_TAGS.has(node.name || '')) return false;
  if (node.extra?.parentIsFlex) return false;

  const style = node.styleObj;
  if (style) {
    const d = style.display;
    if (
      d &&
      (d === 'block' ||
        d === 'inline-block' ||
        d === 'flex' ||
        d === 'inline-flex' ||
        d === 'grid' ||
        d === 'inline-grid' ||
        d === '-webkit-flex' ||
        d === '-webkit-box')
    ) {
      return false;
    }
    // Flex item properties
    if (
      style.flex ||
      style['flex-grow'] ||
      style['flex-shrink'] ||
      style['flex-basis'] ||
      style['align-self'] ||
      style.order
    ) {
      return false;
    }
    if (
      style.width ||
      style.height ||
      style.margin ||
      style['margin-top'] ||
      style['margin-bottom'] ||
      style['margin-left'] ||
      style['margin-right'] ||
      style.padding ||
      style['padding-top'] ||
      style['padding-bottom'] ||
      style['padding-left'] ||
      style['padding-right'] ||
      style.background ||
      style['background-color'] ||
      style['background-image'] ||
      style.border ||
      style['border-radius'] ||
      style['border-top'] ||
      style['border-bottom'] ||
      style['border-left'] ||
      style['border-right'] ||
      style['border-width'] ||
      style['box-shadow'] ||
      style.transform ||
      style.opacity
    ) {
      return false;
    }
  }

  if (!node.children || node.children.length === 0) return true;
  return node.children.every(isAllInline);
}

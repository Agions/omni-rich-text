import { ASTNode } from '../types/ast';

/**
 * Standard inline tags that render inline text contents without forcing block layout.
 */
export const INLINE_TAGS = new Set([
  'span', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'strike',
  'sub', 'sup', 'mark', 'small', 'big', 'font', 'label', 'abbr', 'cite', 'q'
]);

/**
 * Recursively checks if an AST node and all its descendants are purely inline tags or text.
 * If a node specifies a block-level display or explicit dimensions / vertical margins,
 * it cannot be rendered as a pure <Text> in mini-programs without losing its layout styles.
 */
export function isAllInline(node: ASTNode): boolean {
  if (node.type === 'text') return true;
  if (!INLINE_TAGS.has(node.name || '')) return false;

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
        d === 'inline-grid')
    ) {
      return false;
    }
    if (
      style.width ||
      style.height ||
      style.margin ||
      style['margin-top'] ||
      style['margin-bottom']
    ) {
      return false;
    }
  }

  if (!node.children || node.children.length === 0) return true;
  return node.children.every(isAllInline);
}

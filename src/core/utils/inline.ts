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
 */
export function isAllInline(node: ASTNode): boolean {
  if (node.type === 'text') return true;
  if (!INLINE_TAGS.has(node.name || '')) return false;
  if (!node.children || node.children.length === 0) return true;
  return node.children.every(isAllInline);
}

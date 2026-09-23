import { ASTNode } from '../types/ast';

/**
 * Serializes an SVG AST node and its children into a valid XML string
 * for data URI rendering or cross-platform display.
 */
export function serializeSvgToXml(node: ASTNode): string {
  if (node.type === 'text') {
    return node.text || '';
  }
  const tag = node.name || 'g';
  const attrs = { ...node.attrs };
  if (tag === 'svg' && !attrs.xmlns) {
    attrs.xmlns = 'http://www.w3.org/2000/svg';
  }
  if (!attrs.style && node.styleStr) {
    attrs.style = node.styleStr;
  }
  const attrEntries = Object.entries(attrs)
    .map(([k, v]) => {
      const attrKey = k === 'viewbox' ? 'viewBox' : k;
      return `${attrKey}="${String(v).replace(/"/g, '&quot;')}"`;
    })
    .join(' ');
  const attrString = attrEntries ? ` ${attrEntries}` : '';

  if (!node.children || node.children.length === 0) {
    return `<${tag}${attrString}/>`;
  }
  const childrenXml = node.children.map(serializeSvgToXml).join('');
  return `<${tag}${attrString}>${childrenXml}</${tag}>`;
}

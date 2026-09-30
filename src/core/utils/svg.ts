import { ASTNode } from '../types/ast';

/** Map of lowercase SVG attribute names to their canonical camelCase XML forms */
const SVG_CAMEL_CASE_ATTRS: Record<string, string> = {
  viewbox: 'viewBox',
  preserveaspectratio: 'preserveAspectRatio',
  gradientunits: 'gradientUnits',
  gradienttransform: 'gradientTransform',
  patternunits: 'patternUnits',
  patterncontentunits: 'patternContentUnits',
  clippathunits: 'clipPathUnits',
  markerwidth: 'markerWidth',
  markerheight: 'markerHeight',
  refx: 'refX',
  refy: 'refY',
  attributename: 'attributeName',
  attributetype: 'attributeType',
  repeatcount: 'repeatCount',
  keytimes: 'keyTimes',
  keysplines: 'keySplines',
  calcmode: 'calcMode',
  'xlink:href': 'xlink:href'
};

/**
 * Extracts aspect ratio (width / height) from SVG viewBox attribute
 */
export function extractSvgViewBoxRatio(node: ASTNode): number | undefined {
  const vb = node.attrs?.viewbox || node.attrs?.viewBox;
  if (!vb || typeof vb !== 'string') return undefined;

  const parts = vb.trim().split(/[\s,]+/).map(Number);
  if (parts.length === 4 && !isNaN(parts[2]) && !isNaN(parts[3]) && parts[2] > 0 && parts[3] > 0) {
    return parseFloat((parts[2] / parts[3]).toFixed(4));
  }
  return undefined;
}

/**
 * Checks if an SVG node or any of its descendants contains a <foreignObject>
 */
export function hasForeignObject(node: ASTNode): boolean {
  if (node.name === 'foreignobject') return true;
  if (!node.children || node.children.length === 0) return false;
  return node.children.some(hasForeignObject);
}

/**
 * Separates an SVG node into background static SVG elements and embedded foreignObject nodes.
 * Used for 100% fidelity rendering of interactive Xiumi and 135 editor SVG components.
 */
export function splitSvgForeignObject(svgNode: ASTNode): {
  bgSvgXml?: string;
  foreignObjectNodes: ASTNode[];
} {
  const foreignObjectNodes: ASTNode[] = [];
  const staticChildren: ASTNode[] = [];

  function collect(node: ASTNode) {
    if (node.name === 'foreignobject') {
      foreignObjectNodes.push(node);
      return;
    }
    if (node.children && node.children.length > 0) {
      const childHasFo = node.children.some(hasForeignObject);
      if (childHasFo) {
        for (const child of node.children) {
          collect(child);
        }
        return;
      }
    }
    staticChildren.push(node);
  }

  if (svgNode.children) {
    for (const child of svgNode.children) {
      collect(child);
    }
  }

  let bgSvgXml: string | undefined;
  if (staticChildren.length > 0) {
    const bgNode: ASTNode = {
      ...svgNode,
      children: staticChildren
    };
    bgSvgXml = serializeSvgToXml(bgNode);
  }

  return { bgSvgXml, foreignObjectNodes };
}

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

  if (tag === 'svg') {
    if (!attrs.xmlns) {
      attrs.xmlns = 'http://www.w3.org/2000/svg';
    }
    const vb = attrs.viewbox || attrs.viewBox;
    if (vb && typeof vb === 'string') {
      const parts = vb.trim().split(/[\s,]+/).map(Number);
      if (parts.length === 4 && !isNaN(parts[2]) && !isNaN(parts[3])) {
        // If width / height not explicit, inject viewBox dimensions so image loaders know the natural size
        if (!attrs.width && parts[2] > 0) {
          attrs.width = `${parts[2]}`;
        }
        if (!attrs.height && parts[3] > 0) {
          attrs.height = `${parts[3]}`;
        }
      }
      if (!attrs.preserveaspectratio && !attrs.preserveAspectRatio) {
        attrs.preserveAspectRatio = 'xMidYMid meet';
      }
    }
  }

  if (!attrs.style && node.styleStr) {
    attrs.style = node.styleStr;
  }

  const attrEntries = Object.entries(attrs)
    .map(([k, v]) => {
      const lower = k.toLowerCase();
      const attrKey = SVG_CAMEL_CASE_ATTRS[lower] || k;
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

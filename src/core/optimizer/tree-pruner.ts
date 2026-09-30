/**
 * AST Tree Pruning and Cleanup Optimizer
 * Safely removes visually redundant DOM nodes, collapses consecutive blank paragraphs,
 * and unnests unstyled single-child wrapper containers to maximize rendering performance.
 */

import { ASTNode, PruneOptions } from '../types/ast';
import { stringifyStyleObject } from '../styler/css-inliner';

/** Void or replaced tags that must NEVER be pruned even if they have no children */
const PRESERVED_TAGS = new Set([
  'img', 'video', 'audio', 'hr', 'br', 'source', 'input', 'textarea',
  'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'g',
  'defs', 'use', 'iframe', 'canvas', 'embed', 'object'
]);

/** Standard HTML block-level tags */
const BLOCK_TAGS = new Set([
  'div', 'section', 'article', 'aside', 'main', 'header', 'footer', 'nav',
  'p', 'blockquote', 'pre', 'ul', 'ol', 'li', 'table', 'thead', 'tbody',
  'tr', 'figure', 'figcaption', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
]);

/**
 * Checks if a node has visual styling (background, border, shadow, dimensions, padding)
 * that would make an empty node visible as a box or spacer on screen.
 */
export function hasVisualStyles(node: ASTNode): boolean {
  const styles = node.styleObj;
  if (!styles || Object.keys(styles).length === 0) return false;

  // 1. Background
  const bg = styles['background'] || styles['background-color'] || styles['backgroundColor'];
  if (bg && bg !== 'transparent' && bg !== 'none' && bg !== 'inherit') return true;
  const bgImg = styles['background-image'] || styles['backgroundImage'];
  if (bgImg && bgImg !== 'none') return true;

  // 2. Border
  const border = styles['border'] || styles['border-top'] || styles['border-bottom'] || styles['border-left'] || styles['border-right'];
  if (border && border !== 'none' && border !== '0' && border !== '0px') return true;
  const borderWidth = styles['border-width'] || styles['borderWidth'];
  if (borderWidth && borderWidth !== '0' && borderWidth !== '0px') return true;

  // 3. Box Shadow
  const shadow = styles['box-shadow'] || styles['boxShadow'];
  if (shadow && shadow !== 'none') return true;

  // 4. Dimensions & Spacers (positive height or min-height)
  const height = styles['height'] || styles['min-height'] || styles['minHeight'];
  if (height) {
    const num = parseFloat(height);
    if (!isNaN(num) && num > 0) return true;
  }

  // 5. Padding
  const padding = styles['padding'] || styles['padding-top'] || styles['paddingTop'] || styles['padding-bottom'] || styles['paddingBottom'];
  if (padding) {
    const num = parseFloat(padding);
    if (!isNaN(num) && num > 0) return true;
  }

  // 6. Margin Spacers (intentional non-zero margins e.g. <section style="margin-top: 20px;"></section>)
  const margin = styles['margin'] || styles['margin-top'] || styles['marginTop'] || styles['margin-bottom'] || styles['marginBottom'];
  if (margin) {
    const num = parseFloat(margin);
    if (!isNaN(num) && num !== 0) return true;
  }

  return false;
}

/**
 * Checks if a node has layout/positioning styles that affect its descendants
 * (e.g. flexbox, absolute positioning, text alignment, overflow).
 */
export function hasLayoutStyles(node: ASTNode): boolean {
  const styles = node.styleObj;
  if (!styles || Object.keys(styles).length === 0) return false;

  const display = styles['display'];
  if (display && (display.includes('flex') || display.includes('grid') || display === 'inline-block')) return true;

  const pos = styles['position'];
  if (pos && (pos === 'absolute' || pos === 'fixed' || pos === 'relative')) return true;

  const overflow = styles['overflow'] || styles['overflow-x'] || styles['overflow-y'];
  if (overflow && overflow !== 'visible') return true;

  const opacity = styles['opacity'];
  if (opacity && parseFloat(opacity) < 1) return true;

  const transform = styles['transform'];
  if (transform && transform !== 'none') return true;

  // text-align establishes inline-block centering context for descendants
  const textAlign = styles['text-align'] || styles['textAlign'];
  if (textAlign && textAlign !== 'inherit' && textAlign !== 'initial') return true;

  // Explicit widths or max-widths
  const width = styles['width'] || styles['max-width'] || styles['min-width'];
  if (width && width !== '100%') return true;

  return false;
}

/**
 * Determines if a node is visually empty (no text, no media, no children, no visual styles).
 */
export function isVisuallyEmpty(node: ASTNode): boolean {
  if (node.type === 'text') {
    // Only standard whitespace (spaces, tabs, newlines) is considered empty.
    // Non-breaking space \u00a0 (&nbsp;) is considered intentional content.
    return !node.text || node.text.replace(/[\s\t\r\n]/g, '').length === 0;
  }

  // Keep preserved / replaced tags
  const tag = node.name || '';
  if (PRESERVED_TAGS.has(tag) || node.extra?.isSvg || node.extra?.isCustom || node.extra?.wxIgnored) {
    return false;
  }

  // Keep elements with IDs (potential anchor targets)
  if (node.attrs && (node.attrs.id || node.attrs.name)) {
    return false;
  }

  // Keep elements with visual styles (backgrounds, borders, dimensions)
  if (hasVisualStyles(node)) {
    return false;
  }

  // If no children, it's empty
  if (!node.children || node.children.length === 0) {
    return true;
  }

  // If all children are visually empty, this node is visually empty
  return node.children.every(isVisuallyEmpty);
}

/**
 * Checks if a node is an intentional line spacer paragraph (e.g. `<p><br></p>`, `<p>&nbsp;</p>`).
 * These represent intentional breathing room created by the author pressing Enter.
 */
export function isLineSpacerParagraph(node: ASTNode): boolean {
  if (node.type !== 'element') return false;
  const tag = node.name || '';
  if (tag !== 'p' && tag !== 'div' && tag !== 'section') return false;

  // If it has visual box model styles or an id, it's not a generic blank spacer
  if (hasVisualStyles(node) || node.attrs?.id) return false;

  if (!node.children || node.children.length === 0) return false;

  let hasSpacer = false;
  for (const child of node.children) {
    if (child.type === 'text') {
      const text = child.text || '';
      // Non-breaking space (&nbsp; or \u00a0) is an intentional blank line spacer
      if (/^[\s\u00a0\u3000]+$/.test(text)) {
        if (text.includes('\u00a0') || text.includes('&nbsp;')) {
          hasSpacer = true;
        }
      } else {
        return false;
      }
    } else if (child.type === 'element') {
      if (child.name === 'br') {
        hasSpacer = true;
      } else if (child.name === 'span' && isLineSpacerParagraph(child)) {
        hasSpacer = true;
      } else {
        return false;
      }
    }
  }

  return hasSpacer;
}

/** Alias for backward compatibility */
export const isEmptyParagraph = isLineSpacerParagraph;

/**
 * Checks if a container is an unstyled single-child wrapper that can be unwrapped
 * without affecting layout or visuals.
 */
export function isUnwrappableWrapper(node: ASTNode): boolean {
  if (node.type !== 'element') return false;
  const tag = node.name || '';
  // Only target generic block wrappers
  if (tag !== 'div' && tag !== 'section') return false;

  // Must not have an anchor ID
  if (node.attrs?.id) return false;

  // Must not have editor template classes or data attributes (Xiumi / 135editor layout containers)
  if (node.attrs?.class && /xmtpl|135|layout|brush|title|header|card/i.test(node.attrs.class)) {
    return false;
  }
  if (node.attrs && (node.attrs['data-tools'] || node.attrs['data-id'] || node.attrs['data-brushtype'])) {
    return false;
  }

  // Must not have visual or layout styles
  if (hasVisualStyles(node) || hasLayoutStyles(node)) return false;

  // Must have exactly one child
  if (!node.children || node.children.length !== 1) return false;

  const child = node.children[0];
  // Child must be an element
  if (child.type !== 'element') return false;

  const childTag = child.name || '';
  // Ensure layout fidelity: child must be a block element or same tag so unwrapping doesn't break flow
  if (BLOCK_TAGS.has(childTag) || childTag === tag || child.extra?.isBlock) {
    return true;
  }

  return false;
}

/**
 * Safely unnests single-child wrappers.
 */
function unwrapSingleChildWrapper(node: ASTNode): ASTNode {
  if (!isUnwrappableWrapper(node)) return node;

  const child = node.children![0];
  // Merge any non-visual styling down to child
  if (node.styleObj && Object.keys(node.styleObj).length > 0) {
    child.styleObj = { ...node.styleObj, ...child.styleObj };
    child.styleStr = stringifyStyleObject(child.styleObj);
  }

  // Recurse in case child is also an unstyled wrapper (e.g. <div><div><section>...</section></div></div>)
  return unwrapSingleChildWrapper(child);
}

/**
 * Recursively prunes an AST node and its children according to options.
 */
export function pruneNode(node: ASTNode, options: PruneOptions): ASTNode | null {
  // Text node
  if (node.type === 'text') {
    return node;
  }

  // 1. Unwrap single-child wrappers if enabled
  if (options.unwrapSingleChild !== false) {
    node = unwrapSingleChildWrapper(node);
  }

  // 2. Process children recursively
  if (node.children && node.children.length > 0) {
    const nextChildren: ASTNode[] = [];
    let consecutiveSpacers = 0;

    for (const child of node.children) {
      // Check for line spacer folding
      if (options.foldEmptyParagraphs !== false && isLineSpacerParagraph(child)) {
        consecutiveSpacers++;
        if (consecutiveSpacers > 1) {
          // Drop redundant consecutive spacer
          continue;
        }
      } else {
        consecutiveSpacers = 0;
      }

      const prunedChild = pruneNode(child, options);
      if (prunedChild) {
        // If removeEmpty is enabled, filter out visually empty child elements
        if (options.removeEmpty !== false && isVisuallyEmpty(prunedChild)) {
          continue;
        }
        nextChildren.push(prunedChild);
      }
    }

    node.children = nextChildren;
  }

  // 3. Check if current node is visually empty after children pruning
  if (options.removeEmpty !== false && isVisuallyEmpty(node)) {
    return null;
  }

  return node;
}

/**
 * Prunes the AST tree: removes empty nodes, collapses consecutive blank paragraphs,
 * and unnests unstyled single-child wrapper containers.
 */
export function pruneAST(nodes: ASTNode[], options: PruneOptions = {}): ASTNode[] {
  if (!nodes || nodes.length === 0) return [];

  const prunedList: ASTNode[] = [];
  let consecutiveSpacers = 0;

  for (const node of nodes) {
    // Fold top-level consecutive line spacers
    if (options.foldEmptyParagraphs !== false && isLineSpacerParagraph(node)) {
      consecutiveSpacers++;
      if (consecutiveSpacers > 1) {
        continue;
      }
    } else {
      consecutiveSpacers = 0;
    }

    const pruned = pruneNode(node, options);
    if (pruned) {
      if (options.removeEmpty !== false && isVisuallyEmpty(pruned)) {
        continue;
      }
      prunedList.push(pruned);
    }
  }

  return prunedList;
}

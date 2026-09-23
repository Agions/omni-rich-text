/**
 * AST Tree Flattener and Bounded Depth Optimizer
 * Prevents mini-program recursive template call stack explosion and reduces setData payload.
 */

import { ASTNode } from '../types/ast';
import { stringifyStyleObject } from '../styler/css-inliner';

const INLINE_TAGS = new Set([
  'span', 'b', 'strong', 'i', 'em', 'u', 's', 'del', 'ins', 'small', 'big', 'mark', 'sub', 'sup'
]);

const DEFAULT_MAX_DEPTH = 8;

function mergeInlineStyles(parentStyle: Record<string, string>, childStyle: Record<string, string>): Record<string, string> {
  return {
    ...parentStyle,
    ...childStyle
  };
}

/**
 * Optimizes an AST node and its children recursively with bounded depth
 */
export function optimizeNode(node: ASTNode, currentDepth = 1, maxDepth = DEFAULT_MAX_DEPTH): ASTNode[] {
  if (node.type === 'text') {
    return [node];
  }

  // 1. Inline tag flattening: e.g. <span><b><em>Text</em></b></span>
  if (
    node.name && INLINE_TAGS.has(node.name) &&
    node.children && node.children.length === 1 &&
    node.children[0].name && INLINE_TAGS.has(node.children[0].name)
  ) {
    const child = node.children[0];
    const mergedStyleObj = mergeInlineStyles(node.styleObj, child.styleObj);
    child.styleObj = mergedStyleObj;
    child.styleStr = stringifyStyleObject(mergedStyleObj);
    return optimizeNode(child, currentDepth, maxDepth);
  }

  // 2. Bounded depth guard: if we've reached maxDepth - 1, flatten all nested children to leaves
  if (currentDepth >= maxDepth - 1) {
    const flattenedLeaves: ASTNode[] = [];
    function collectLeaves(n: ASTNode) {
      if (n.type === 'text') {
        flattenedLeaves.push(n);
      } else if (n.name === 'img' || n.name === 'video') {
        // Retain leaf media tags
        flattenedLeaves.push({ ...n, children: undefined });
      } else if (n.children && n.children.length > 0) {
        for (const c of n.children) {
          collectLeaves(c);
        }
      }
    }

    if (node.children) {
      for (const c of node.children) {
        collectLeaves(c);
      }
    }
    node.children = flattenedLeaves;
    node.extra = { ...node.extra, depth: currentDepth };
    return [node];
  }

  // 3. Normal recursive processing
  const children: ASTNode[] = [];
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      if (
        child.type === 'text' &&
        (!child.text || child.text.trim() === '') &&
        (node.extra?.isBlock || node.extra?.isSvg || node.name === 'svg')
      ) {
        continue;
      }
      const optimizedChildren = optimizeNode(child, currentDepth + 1, maxDepth);
      children.push(...optimizedChildren);
    }
  }

  node.children = children;
  node.extra = { ...node.extra, depth: currentDepth };
  return [node];
}

/**
 * Optimizes the entire AST tree
 */
export function optimizeAST(nodes: ASTNode[], maxDepth = DEFAULT_MAX_DEPTH): ASTNode[] {
  const result: ASTNode[] = [];
  for (const node of nodes) {
    if (node.type === 'text' && (!node.text || node.text.trim() === '')) {
      continue;
    }
    result.push(...optimizeNode(node, 1, maxDepth));
  }
  return result;
}

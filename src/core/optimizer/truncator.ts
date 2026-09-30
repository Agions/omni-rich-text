/**
 * Safe AST-Level Truncation & Excerpt Engine
 * Truncates rich text at the AST tree level, ensuring 100% valid HTML tag closure,
 * precise character counting, custom ellipsis mounting, and optional media preservation.
 */

import { ASTNode, TruncateOptions, TruncateResult, ParseOptions } from '../types/ast';
import { extractGallery } from '../gallery/image-extractor';

const MEDIA_TAGS = new Set(['img', 'video', 'audio', 'svg', 'canvas', 'iframe', 'embed']);

/**
 * Calculates the total text character count across an entire AST tree.
 */
export function calculateTotalTextLength(nodes: ASTNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.type === 'text') {
      count += (node.text || '').length;
    } else if (node.children && node.children.length > 0) {
      count += calculateTotalTextLength(node.children);
    }
  }
  return count;
}

/**
 * Safely truncates an AST tree by character count and/or node count,
 * guaranteeing all ancestor tags remain properly closed.
 */
export function truncateAST(nodes: ASTNode[], options: TruncateOptions = {}): TruncateResult {
  const maxLength = options.maxLength !== undefined ? Math.max(0, options.maxLength) : Infinity;
  const maxNodes = options.maxNodes !== undefined ? Math.max(0, options.maxNodes) : Infinity;
  const ellipsis = options.ellipsis !== undefined ? options.ellipsis : '...';
  const preserveMedia = options.preserveMedia !== false;

  const totalTextLength = calculateTotalTextLength(nodes);

  if (!nodes || nodes.length === 0) {
    return {
      ast: [],
      totalTextLength: 0,
      truncatedLength: 0,
      isTruncated: false,
      galleryList: []
    };
  }

  // Fast path: if no limits are set or content is strictly within limits
  if (maxLength === Infinity && maxNodes === Infinity && preserveMedia) {
    const { galleryList } = extractGallery(nodes);
    return {
      ast: nodes,
      totalTextLength,
      truncatedLength: totalTextLength,
      isTruncated: false,
      galleryList
    };
  }

  let accumulatedLength = 0;
  let reachedLimit = false;
  let isTruncated = false;
  let rootNodeCount = 0;

  function processNode(node: ASTNode, isRoot: boolean): ASTNode | null {
    if (reachedLimit) return null;

    if (isRoot) {
      if (rootNodeCount >= maxNodes) {
        reachedLimit = true;
        isTruncated = true;
        return null;
      }
    }

    // Media filter: if preserveMedia is false, omit media tags
    if (!preserveMedia) {
      if (node.name && MEDIA_TAGS.has(node.name)) {
        return null;
      }
      if (node.extra?.isSvg) {
        return null;
      }
    }

    // Handle Text Node
    if (node.type === 'text') {
      const text = node.text || '';
      const textLen = text.length;

      if (accumulatedLength + textLen <= maxLength) {
        accumulatedLength += textLen;
        if (isRoot) rootNodeCount++;
        return { ...node };
      }

      // Truncation boundary reached inside this text node
      reachedLimit = true;
      isTruncated = true;

      const allowedChars = Math.max(0, maxLength - accumulatedLength);
      accumulatedLength += allowedChars;

      const truncatedText = text.slice(0, allowedChars) + ellipsis;
      if (isRoot) rootNodeCount++;

      return {
        ...node,
        text: truncatedText
      };
    }

    // Handle Element Node
    const truncatedChildren: ASTNode[] = [];
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        if (reachedLimit) break;

        const processedChild = processNode(child, false);
        if (processedChild) {
          truncatedChildren.push(processedChild);
        }
      }
    }

    // If limit was reached before or within children
    if (isRoot) rootNodeCount++;

    return {
      ...node,
      children: truncatedChildren
    };
  }

  const truncatedAST: ASTNode[] = [];

  for (const rootNode of nodes) {
    if (reachedLimit) break;
    const processed = processNode(rootNode, true);
    if (processed) {
      truncatedAST.push(processed);
    }
  }

  // If text exceeded maxLength but somehow no text node triggered truncation (e.g. maxLength === 0)
  if (!isTruncated && totalTextLength > maxLength) {
    isTruncated = true;
  }

  const { galleryList } = extractGallery(truncatedAST);

  return {
    ast: truncatedAST,
    totalTextLength,
    truncatedLength: accumulatedLength,
    isTruncated,
    galleryList
  };
}

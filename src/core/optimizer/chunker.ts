/**
 * Weighted Adaptive Chunking Engine for Large Documents
 * Splits top-level AST blocks into batches for progressive setData delivery.
 * Balances instant first-screen paint with smooth background rendering.
 */

import { ASTNode } from '../types/ast';

const HEAVY_TAGS = new Set([
  'img', 'video', 'audio', 'svg', 'table', 'pre', 'code', 'canvas', 'iframe'
]);

export interface ChunkOptions {
  /**
   * Number of root blocks per chunk.
   * If provided and weights are omitted, legacy fixed-count chunking is used.
   */
  chunkSize?: number;
  /**
   * Initial screen weight budget. Defaults to 35.
   * Ensures instant first-screen paint without blocking the UI thread.
   */
  initialWeight?: number;
  /**
   * Subsequent batch weight budget. Defaults to 80.
   * Higher throughput for background streaming without causing frame drops.
   */
  chunkWeight?: number;
}

export interface ChunkedAST {
  initial: ASTNode[];
  remaining: ASTNode[][];
  totalNodes: number;
}

/**
 * Calculates the rendering complexity weight of a node and its recursive subtree.
 * Heavy nodes (images, videos, SVGs, tables, code blocks) receive higher weight.
 */
export function calculateNodeWeight(node: ASTNode): number {
  let weight = 1;
  if (node.name && HEAVY_TAGS.has(node.name)) {
    weight = 3;
  }
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      weight += calculateNodeWeight(child);
    }
  }
  return weight;
}

/**
 * Splits root nodes into manageable, weighted chunks for progressive streaming.
 */
export function chunkAST(nodes: ASTNode[], options: ChunkOptions = {}): ChunkedAST {
  if (!nodes || nodes.length === 0) {
    return {
      initial: [],
      remaining: [],
      totalNodes: 0
    };
  }

  // Backwards compatibility: if chunkSize is explicitly given without custom weights, use legacy fixed-count
  if (options.chunkSize !== undefined && options.initialWeight === undefined && options.chunkWeight === undefined) {
    const chunkSize = options.chunkSize > 0 ? options.chunkSize : 15;
    if (nodes.length <= chunkSize) {
      return {
        initial: nodes,
        remaining: [],
        totalNodes: nodes.length
      };
    }
    const initial = nodes.slice(0, chunkSize);
    const remaining: ASTNode[][] = [];
    for (let i = chunkSize; i < nodes.length; i += chunkSize) {
      remaining.push(nodes.slice(i, i + chunkSize));
    }
    return {
      initial,
      remaining,
      totalNodes: nodes.length
    };
  }

  // Weighted adaptive chunking
  const initialWeightLimit = options.initialWeight ?? 35;
  const chunkWeightLimit = options.chunkWeight ?? 80;

  const initial: ASTNode[] = [];
  const remaining: ASTNode[][] = [];

  let currentWeight = 0;
  let currentBatch: ASTNode[] = [];
  let isInitial = true;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const weight = calculateNodeWeight(node);

    if (isInitial) {
      // Always guarantee at least 1 node in initial chunk
      if (initial.length === 0 || currentWeight + weight <= initialWeightLimit) {
        initial.push(node);
        currentWeight += weight;
      } else {
        isInitial = false;
        currentBatch = [node];
        currentWeight = weight;
      }
    } else {
      // For remaining batches
      if (currentBatch.length === 0 || currentWeight + weight <= chunkWeightLimit) {
        currentBatch.push(node);
        currentWeight += weight;
      } else {
        remaining.push(currentBatch);
        currentBatch = [node];
        currentWeight = weight;
      }
    }
  }

  if (currentBatch.length > 0) {
    remaining.push(currentBatch);
  }

  return {
    initial,
    remaining,
    totalNodes: nodes.length
  };
}

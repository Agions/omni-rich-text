/**
 * Chunking Engine for Large Documents
 * Splits top-level AST blocks into batches for progressive setData delivery.
 */

import { ASTNode } from '../types/ast';

export interface ChunkOptions {
  /** Number of root blocks per chunk. Default is 15 */
  chunkSize?: number;
}

export interface ChunkedAST {
  initial: ASTNode[];
  remaining: ASTNode[][];
  totalNodes: number;
}

/**
 * Splits root nodes into manageable chunks
 */
export function chunkAST(nodes: ASTNode[], options: ChunkOptions = {}): ChunkedAST {
  const chunkSize = options.chunkSize || 15;
  if (!nodes || nodes.length <= chunkSize) {
    return {
      initial: nodes || [],
      remaining: [],
      totalNodes: nodes ? nodes.length : 0
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

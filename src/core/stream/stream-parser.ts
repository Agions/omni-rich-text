/**
 * Incremental Stream Parser for AI / LLM Streaming
 * Provides block freezing, tail syntax healing, and blinking cursor injection.
 */

import { ASTNode, ParseOptions, ParseResult } from '../types/ast';
import { parseRichContent } from '../index';
import { healMarkdownTail } from './markdown-healer';

export interface StreamParserOptions extends ParseOptions {
  /**
   * Whether to attach a blinking cursor at the typing head.
   * Default: true
   */
  showCursor?: boolean;
  /**
   * Character or symbol used for cursor.
   * Default: '▍'
   */
  cursorChar?: string;
  /**
   * CSS class name for cursor.
   * Default: 'omni-stream-cursor'
   */
  cursorClass?: string;
}

/**
 * Creates an AST node representing the typing cursor
 */
export function createCursorNode(cursorChar = '▍', cursorClass = 'omni-stream-cursor'): ASTNode {
  return {
    id: 'omni_stream_cursor_node',
    type: 'element',
    name: 'span',
    attrs: {
      class: cursorClass,
      style: 'display:inline-block;margin-left:2px;animation:omniBlink 1s infinite;vertical-align:baseline;color:currentColor;'
    },
    styleObj: {
      display: 'inline-block',
      marginLeft: '2px',
      verticalAlign: 'baseline'
    },
    styleStr: 'display:inline-block;margin-left:2px;',
    children: [
      {
        id: 'omni_stream_cursor_text',
        type: 'text',
        attrs: {},
        styleStr: '',
        styleObj: {},
        text: cursorChar
      }
    ],
    extra: {
      isStreamCursor: true
    }
  };
}

/**
 * Appends the cursor node into the deepest trailing inline position of the AST
 */
export function appendCursorToAST(nodes: ASTNode[], cursorNode: ASTNode): ASTNode[] {
  if (!nodes || nodes.length === 0) {
    return [
      {
        id: 'omni_cursor_p',
        type: 'element',
        name: 'p',
        attrs: {},
        styleStr: '',
        styleObj: {},
        children: [cursorNode]
      }
    ];
  }

  // Clone top-level array
  const result = [...nodes];
  const lastIdx = result.length - 1;
  const lastNode = { ...result[lastIdx] };

  // If last node is a pre/code block, append cursor inside code
  if (lastNode.name === 'pre' && lastNode.children && lastNode.children.length > 0) {
    const codeIdx = lastNode.children.findIndex((c) => c.name === 'code');
    if (codeIdx !== -1) {
      const codeNode = { ...lastNode.children[codeIdx] };
      codeNode.children = [...(codeNode.children || []), cursorNode];
      const newPreChildren = [...lastNode.children];
      newPreChildren[codeIdx] = codeNode;
      lastNode.children = newPreChildren;
      result[lastIdx] = lastNode;
      return result;
    }
  }

  // If last node has children, recursively place in its last child
  if (lastNode.children && lastNode.children.length > 0) {
    lastNode.children = appendCursorToAST(lastNode.children, cursorNode);
    result[lastIdx] = lastNode;
    return result;
  }

  // If last node is a leaf (text or element without children)
  if (lastNode.type === 'text') {
    // Cannot add children to text node, wrap or append next to it
    result.push(cursorNode);
    return result;
  }

  lastNode.children = [cursorNode];
  result[lastIdx] = lastNode;
  return result;
}

/**
 * Finds the last safe Markdown block boundary (double newline outside code fences)
 */
export function findLastSafeBlockBoundary(text: string): number {
  const lines = text.split('\n');
  let inFence = false;
  let lastSafeIndex = -1;
  let charCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^ *(```+|~~~+)/);
    if (match) {
      inFence = !inFence;
    }

    charCount += line.length + 1; // + 1 for \n

    // A boundary occurs on an empty line when not inside a fence
    if (!inFence && line.trim() === '' && i > 0 && i < lines.length - 1) {
      lastSafeIndex = charCount;
    }
  }

  return lastSafeIndex;
}

/**
 * Incremental Stream Parser Class
 */
export class IncrementalStreamParser {
  private fullText = '';
  private frozenRaw = '';
  private frozenAst: ASTNode[] = [];
  private options: StreamParserOptions;
  private isDone = false;

  constructor(options: StreamParserOptions = {}) {
    this.options = {
      format: 'markdown',
      showCursor: true,
      cursorChar: '▍',
      cursorClass: 'omni-stream-cursor',
      ...options
    };
  }

  /**
   * Reset parser state
   */
  public reset(): void {
    this.fullText = '';
    this.frozenRaw = '';
    this.frozenAst = [];
    this.isDone = false;
  }

  /**
   * Append a token delta chunk from the stream
   */
  public write(chunk: string): ParseResult {
    return this.update(this.fullText + chunk);
  }

  /**
   * Update full accumulated text (supports both incremental write and full state updates)
   */
  public update(newFullText: string): ParseResult {
    this.fullText = newFullText;
    this.isDone = false;

    if (!newFullText) {
      return {
        ast: this.options.showCursor ? [createCursorNode(this.options.cursorChar, this.options.cursorClass)] : [],
        galleryList: [],
        rawImages: []
      };
    }

    // If new text doesn't start with frozen prefix (e.g. stream restarted or reset), discard frozen cache
    if (this.frozenRaw && !newFullText.startsWith(this.frozenRaw)) {
      this.frozenRaw = '';
      this.frozenAst = [];
    }

    // Try finding new frozen boundary
    const boundary = findLastSafeBlockBoundary(newFullText);
    if (boundary > this.frozenRaw.length) {
      const newFrozenText = newFullText.substring(0, boundary);
      // Parse the newly closed blocks once
      const parsedFrozen = parseRichContent(newFrozenText, {
        ...this.options,
        cache: true
      });
      this.frozenRaw = newFrozenText;
      this.frozenAst = parsedFrozen.ast;
    }

    // Active tail block
    const tailRaw = newFullText.substring(this.frozenRaw.length);
    let tailAst: ASTNode[] = [];
    let galleryList: string[] = [];
    let rawImages: any[] = [];

    if (tailRaw.trim()) {
      // 1. Syntax Heal tail
      const healedTail = this.options.format === 'markdown' ? healMarkdownTail(tailRaw) : tailRaw;

      // 2. Parse healed tail block
      const tailResult = parseRichContent(healedTail, {
        ...this.options,
        cache: false
      });
      tailAst = tailResult.ast;
      galleryList = tailResult.galleryList || [];
      rawImages = tailResult.rawImages || [];
    }

    // 3. Attach cursor to tail if active
    if (this.options.showCursor !== false) {
      const cursor = createCursorNode(this.options.cursorChar, this.options.cursorClass);
      tailAst = appendCursorToAST(tailAst, cursor);
    }

    // Combine frozen AST + active tail AST
    const combinedAst = [...this.frozenAst, ...tailAst];

    return {
      ast: combinedAst,
      galleryList,
      rawImages
    };
  }

  /**
   * Mark stream as finished (clears cursor, does final full AST parse)
   */
  public finish(): ParseResult {
    this.isDone = true;
    const finalResult = parseRichContent(this.fullText, {
      ...this.options,
      cache: true
    });
    this.frozenRaw = this.fullText;
    this.frozenAst = finalResult.ast;
    return finalResult;
  }

  /**
   * Get current parsed AST
   */
  public getAST(): ASTNode[] {
    return this.frozenAst;
  }

  /**
   * Check if stream has finished
   */
  public isCompleted(): boolean {
    return this.isDone;
  }
}

/**
 * Factory function to create a new IncrementalStreamParser
 */
export function createStreamParser(options?: StreamParserOptions): IncrementalStreamParser {
  return new IncrementalStreamParser(options);
}

/**
 * Functional helper: parse rich content with stream tail-healing and optional cursor
 */
export function parseStreamContent(
  content: string,
  options: StreamParserOptions & { isComplete?: boolean } = {}
): ParseResult {
  const { isComplete = false, showCursor = true, cursorChar = '▍', cursorClass = 'omni-stream-cursor', ...parseOpts } = options;

  if (isComplete) {
    return parseRichContent(content, parseOpts);
  }

  // Stream active: heal tail
  const rawText = content || '';
  const healedText = parseOpts.format === 'html' ? rawText : healMarkdownTail(rawText);

  const result = parseRichContent(healedText, {
    ...parseOpts,
    cache: false
  });

  if (showCursor) {
    const cursor = createCursorNode(cursorChar, cursorClass);
    result.ast = appendCursorToAST(result.ast, cursor);
  }

  return result;
}

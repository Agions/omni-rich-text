/**
 * @universal-rt/core Entry Point
 */

import { ASTNode, ParseOptions, ParseResult } from './types/ast';
import { parseHtml } from './lexer/html-parser';
import { optimizeAST } from './optimizer/tree-flattener';
import { extractGallery } from './gallery/image-extractor';
import { markdownToHtml } from './plugins/markdown';
import { highlightCode } from './plugins/prism';

export * from './types/ast';
export * from './types/theme';
export * from './utils/svg';
export * from './utils/inline';
export * from './lexer/html-parser';
export * from './sanitizer/whitelist';
export * from './styler/css-inliner';
export * from './styler/wx-style-extractor';
export * from './optimizer/tree-flattener';
export * from './optimizer/chunker';
export * from './gallery/image-extractor';
export * from './bridge/platform';
export * from './dispatcher/link';
export * from './plugins/markdown';
export * from './plugins/prism';

/**
 * Parses and optimizes rich text content (HTML or Markdown) into a normalized AST tree
 */
export function parseRichContent(content: string, options: ParseOptions = {}): ParseResult {
  if (!content) {
    return { ast: [], galleryList: [], rawImages: [] };
  }

  // 1. Format preprocessing
  const rawHtml = options.format === 'markdown' ? markdownToHtml(content) : content;

  // 2. Lexical & AST parsing
  let nodes = parseHtml(rawHtml, options);

  // 3. Post-process code blocks for syntax highlighting
  nodes = enhanceCodeBlocks(nodes);

  // 4. Tree flattening & depth bounded optimization
  // WeChat articles often use deep section nesting for card borders, default depth is 12 for wechat
  const defaultDepth = options.mode === 'wechat' ? 12 : 8;
  const optimizedNodes = optimizeAST(nodes, options.maxDepth || defaultDepth);

  // 5. Extract images and build ordered gallery list
  const { galleryList, rawImages } = extractGallery(optimizedNodes);

  return {
    ast: optimizedNodes,
    galleryList,
    rawImages
  };
}

/**
 * Traverses AST to find <pre><code> and applies Prism-style syntax highlighting
 */
function enhanceCodeBlocks(nodes: ASTNode[]): ASTNode[] {
  for (const node of nodes) {
    if (node.name === 'pre' && node.children && node.children.length > 0) {
      const codeNode = node.children.find((c) => c.name === 'code');
      if (codeNode && codeNode.children) {
        // Extract raw code text
        const rawCode = extractTextFromNode(codeNode);
        const langMatch = (codeNode.attrs.class || '').match(/language-(\w+)/);
        const lang = langMatch ? langMatch[1] : '';

        // Highlight into styled AST spans
        const highlightedNodes = highlightCode(rawCode, lang);
        codeNode.children = highlightedNodes;
        codeNode.extra = { ...codeNode.extra, isCodeBlock: true, lang };
      }
    } else if (node.children && node.children.length > 0) {
      enhanceCodeBlocks(node.children);
    }
  }
  return nodes;
}

function extractTextFromNode(node: ASTNode): string {
  if (node.type === 'text') {
    return node.text || '';
  }
  if (!node.children || node.children.length === 0) {
    return '';
  }
  return node.children.map(extractTextFromNode).join('');
}

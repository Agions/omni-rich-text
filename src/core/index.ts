/**
 * @universal-rt/core Entry Point
 */

import { ASTNode, ParseOptions, ParseResult, TruncateOptions, TruncateResult } from './types/ast';
import { parseHtml, detectArticleThemeBg } from './lexer/html-parser';
import { optimizeAST } from './optimizer/tree-flattener';
import { pruneAST } from './optimizer/tree-pruner';
import { truncateAST } from './optimizer/truncator';
import { extractGallery } from './gallery/image-extractor';
import { markdownToHtml } from './plugins/markdown';
import { highlightCode } from './plugins/prism';
import { detectSvgCarousel, isSvgSourceCode, serializeSvgToXml } from './utils/svg';

export * from './types/ast';
export * from './types/theme';
export * from './utils/svg';
export * from './utils/inline';
export * from './lexer/html-parser';
export * from './sanitizer/whitelist';
export * from './styler/css-inliner';
export * from './styler/wx-style-extractor';
export * from './optimizer/tree-flattener';
export * from './optimizer/tree-pruner';
export * from './optimizer/truncator';
export * from './optimizer/chunker';
export * from './gallery/image-extractor';
export * from './bridge/platform';
export * from './dispatcher/link';
export * from './plugins/markdown';
export * from './plugins/prism';
export * from './cache/lru';
export * from './utils/image';
export * from './stream/markdown-healer';
export * from './stream/stream-parser';

import { LRUCache, generateCacheKey } from './cache/lru';

// Global LRU cache for parsed AST results (capacity 50)
const globalASTCache = new LRUCache<string, ParseResult>(50);

/**
 * Clear the global AST parse cache
 */
export function clearASTCache(): void {
  globalASTCache.clear();
}

/**
 * Get current number of items in the AST parse cache
 */
export function getASTCacheSize(): number {
  return globalASTCache.size;
}

/**
 * Parses and optimizes rich text content (HTML or Markdown) into a normalized AST tree
 */
export function parseRichContent(content: string, options: ParseOptions = {}): ParseResult {
  if (!content) {
    return { ast: [], galleryList: [], rawImages: [] };
  }

  // 0. Check LRU Cache (enabled by default unless options.cache === false)
  const useCache = options.cache !== false;
  let cacheKey = '';
  if (useCache) {
    cacheKey = generateCacheKey(content, options);
    const cached = globalASTCache.get(cacheKey);
    if (cached) {
      return cached;
    }
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
  let optimizedNodes = optimizeAST(nodes, options.maxDepth || defaultDepth);

  // 4.5. AST tree pruning & spacer folding
  if (options.prune !== false) {
    const pruneOpts = typeof options.prune === 'object' ? options.prune : {};
    optimizedNodes = pruneAST(optimizedNodes, pruneOpts);
  }

  // 4.6. AST safe truncation & excerpt (if requested)
  let truncateInfo: ParseResult['truncateInfo'];
  if (options.truncate) {
    const truncRes = truncateAST(optimizedNodes, options.truncate);
    optimizedNodes = truncRes.ast;
    truncateInfo = {
      isTruncated: truncRes.isTruncated,
      totalTextLength: truncRes.totalTextLength,
      truncatedLength: truncRes.truncatedLength
    };
  }

  // 4.7. SVG Carousel detection and frame normalization
  optimizedNodes = enhanceSvgCarousels(optimizedNodes);

  // 5. Extract images and build ordered gallery list
  const { galleryList, rawImages } = extractGallery(optimizedNodes);

  // 6. Detect article theme background color
  const themeBgColor = detectArticleThemeBg(optimizedNodes);

  const result: ParseResult = {
    ast: optimizedNodes,
    galleryList,
    rawImages,
    themeBgColor,
    truncateInfo
  };

  if (useCache && cacheKey) {
    globalASTCache.set(cacheKey, result);
  }

  return result;
}

/**
 * Traverses AST to find SVG carousels and attach normalized slides and aspect ratio
 */
function enhanceSvgCarousels(nodes: ASTNode[]): ASTNode[] {
  for (const node of nodes) {
    const carouselInfo = detectSvgCarousel(node);
    if (carouselInfo) {
      if (!node.extra) node.extra = {};
      node.extra.isSvgCarousel = true;
      node.extra.carouselSlides = carouselInfo.slides;
      node.extra.aspectRatio = carouselInfo.aspectRatio;
    } else if (node.children && node.children.length > 0) {
      enhanceSvgCarousels(node.children);
    }
  }
  return nodes;
}

/**
 * Parses rich content and safely truncates it into a normalized excerpt AST.
 */
export function truncateRichContent(
  content: string,
  options: TruncateOptions & ParseOptions = {}
): TruncateResult {
  const parseResult = parseRichContent(content, { ...options, truncate: undefined });
  return truncateAST(parseResult.ast, options);
}

/**
 * Traverses AST to find <pre><code> and applies Prism-style syntax highlighting
 */
function enhanceCodeBlocks(nodes: ASTNode[]): ASTNode[] {
  for (const node of nodes) {
    if (node.name === 'pre' && node.children && node.children.length > 0) {
      const codeNode = node.children.find((c) => c.name === 'code');
      if (codeNode && codeNode.children) {
        // Extract raw code text (serializing XML/SVG element children if any)
        const rawCode = extractTextFromCodeNode(codeNode);
        const langMatch = (codeNode.attrs.class || '').match(/language-(\w+)/);
        let lang = langMatch ? langMatch[1] : '';

        const isSvgCode = isSvgSourceCode(rawCode);
        if (isSvgCode && !lang) {
          lang = 'xml';
        }

        // Highlight into styled AST spans
        const highlightedNodes = highlightCode(rawCode, lang);
        codeNode.children = highlightedNodes;
        codeNode.extra = {
          ...codeNode.extra,
          isCodeBlock: true,
          lang,
          isSvgCodeBlock: isSvgCode,
          rawSvgCode: isSvgCode ? rawCode : undefined
        };
        node.extra = {
          ...node.extra,
          isCodeBlock: true,
          lang,
          isSvgCodeBlock: isSvgCode,
          rawSvgCode: isSvgCode ? rawCode : undefined
        };
      }
    } else if (node.children && node.children.length > 0) {
      enhanceCodeBlocks(node.children);
    }
  }
  return nodes;
}

function extractTextFromCodeNode(node: ASTNode): string {
  if (node.type === 'text') {
    return node.text || '';
  }
  if (node.name === 'svg') {
    return serializeSvgToXml(node);
  }
  if (!node.children || node.children.length === 0) {
    return '';
  }
  return node.children.map(extractTextFromCodeNode).join('');
}

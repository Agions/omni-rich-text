/**
 * AST Node Types and Definitions for Universal Rich Text Core
 */

export type NodeType = 'element' | 'text';

export interface ASTNode {
  /** Unique identifier for node tracking and anchor routing */
  id: string;
  /** Node discriminator */
  type: NodeType;
  /** HTML tag name in lower case, e.g. 'div', 'p', 'a', 'img', 'span', 'pre', 'code' */
  name?: string;
  /** Filtered and sanitized attributes */
  attrs: Record<string, string>;
  /** CSS inline style string normalized for cross-platform components */
  styleStr: string;
  /** Key-value style map for easy manipulation */
  styleObj: Record<string, string>;
  /** Child nodes */
  children?: ASTNode[];
  /** Raw text content for text nodes */
  text?: string;
  /** Extra metadata for multimedia, code highlight, layout optimizations */
  extra?: {
    galleryIndex?: number;
    isBlock?: boolean;
    lang?: string;
    isCodeBlock?: boolean;
    depth?: number;
    /** WeChat image aspect ratio from data-ratio attribute */
    dataRatio?: number;
    /** Image aspect ratio (width / height or dataRatio) */
    aspectRatio?: number;
    /** Pre-calculated placeholder height based on data-ratio */
    placeholderHeight?: string;
    /** SVG element marker */
    isSvg?: boolean;
    /** WeChat-specific tag that should not be rendered (mpvoice, mp-miniprogram, etc.) */
    wxIgnored?: boolean;
    /** Whether node or container contains multiple images in a single row/flow */
    isMultiImage?: boolean;
    /** Whether node is an inline icon or emoji sticker (<= 40px) */
    isIcon?: boolean;
    /** Custom component tag marker */
    isCustom?: boolean;
    /** Whether the direct parent of this node is a flex container (display: flex / inline-flex) */
    parentIsFlex?: boolean;
    /** Whether this tag is inherently an inline tag (span, strong, em, etc.) */
    isInlineTag?: boolean;
    /** Whether this node and all its descendants are purely inline text flow */
    isInline?: boolean;
    /** Native default display value if not explicitly specified: 'inline', 'inline-block', or 'block' */
    defaultDisplay?: string;
    /** Whether this node is identified as an interactive SVG-based carousel/slider */
    isSvgCarousel?: boolean;
    /** Normalized slide frames extracted from SVG carousel */
    carouselSlides?: Array<{
      src: string;
      href?: string;
      title?: string;
      width?: number;
      height?: number;
    }>;
    /** Whether this code block represents SVG XML source code */
    isSvgCodeBlock?: boolean;
    /** Raw SVG code string for preview rendering */
    rawSvgCode?: string;
    /** AI streaming typewriter cursor marker */
    isStreamCursor?: boolean;
  };
}

export interface ImageGalleryItem {
  index: number;
  src: string;
  alt?: string;
  width?: number | string;
  height?: number | string;
}

export interface LinkTapContext {
  href: string;
  node: ASTNode;
  rawEvent?: any;
}

/** Media playback event payload */
export interface MediaEventPayload {
  /** Event type: play, pause, ended, error, timeupdate */
  type: string;
  /** Media source URL */
  src: string;
  /** Associated AST node */
  node: ASTNode;
  /** Current playback time in seconds */
  currentTime?: number;
  /** Total duration in seconds */
  duration?: number;
  /** Raw platform event object */
  rawEvent?: any;
}

export interface ParseOptions {
  /** Input content format: 'html' or 'markdown' */
  format?: 'html' | 'markdown';
  /** Max nested tree recursion depth before flattening. Defaults to 8 */
  maxDepth?: number;
  /** Whether to apply XSS whitelist filtering. Defaults to true */
  sanitize?: boolean;
  /** Custom extra tag whitelist */
  allowedTags?: string[];
  /** Custom extra attribute whitelist */
  allowedAttrs?: string[];
  /** Custom tags to be treated as allowed elements and retain all attributes */
  customTags?: string[];
  /** Default image display mode */
  defaultImageMode?: string;
  /** Rendering mode: 'default' for generic rich text, 'wechat' for WeChat article fidelity */
  mode?: 'default' | 'wechat';
  /** Extract <style> tag content and apply as inline styles. Defaults to false */
  extractStyles?: boolean;
  /**
   * Root font size in px used for rem calculation. Defaults to 18.75 (WeChat Mini Program 20rem rule).
   */
  rootFontSize?: number;
  /**
   * Scaling factor for rem conversion. Defaults to 0.5 (halved for 750px mobile retina display).
   */
  remScale?: number;
  /**
   * Font size scaling factor. Defaults to 1.
   */
  fontScale?: number;
  /**
   * Target base font size in px. Default: 15 (15px).
   * If content has 22px as its base, it displays as 15px.
   */
  baseFontSize?: number | string;
  /**
   * Source content base font size in px. Default: 22 (22px).
   * For every 1px increase in content font size, text size accumulates 1px onto baseFontSize.
   */
  contentBaseFontSize?: number | string;
  /**
   * Custom external font size resolver function.
   * If provided, allows complete external control over font-size calculation.
   * Receives (sourcePx, rawValue) and returns a CSS string (e.g. '16px', '1.1rem') or number.
   */
  fontSizeResolver?: (sourcePx: number, rawValue: string) => string | number;
  /**
   * Custom default/base font size alias (backward compatible). e.g. 15, '15px', '1rem'.
   */
  fontSize?: number | string;
  /**
   * Whether to enable LRU caching of parse results. Defaults to true.
   */
  cache?: boolean;
  /**
   * Whether to enable AST tree pruning (empty tag cleanup, consecutive blank paragraph folding, wrapper unnesting).
   * Defaults to true. Pass false to disable, or pass a PruneOptions object for fine-grained control.
   */
  prune?: boolean | PruneOptions;
  /**
   * Safe AST text and node truncation options for generating excerpts and clamping DOM size.
   */
  truncate?: TruncateOptions;
}

export interface TruncateOptions {
  /** Maximum character count for text content. Undefined means no character limit. */
  maxLength?: number;
  /** Maximum number of root/block nodes to retain. Undefined means no limit. */
  maxNodes?: number;
  /** Custom ellipsis string appended to the last cut text node. Defaults to '...' */
  ellipsis?: string;
  /** Whether to preserve image and media tags encountered within the truncation limit. Defaults to true. */
  preserveMedia?: boolean;
}

export interface TruncateResult {
  /** Safely truncated and structurally valid AST tree */
  ast: ASTNode[];
  /** Total text character count in the original content */
  totalTextLength: number;
  /** Character count retained in the truncated AST */
  truncatedLength: number;
  /** Whether truncation actually took place */
  isTruncated: boolean;
  /** Extracted image URLs retained in the truncated AST */
  galleryList: string[];
}

export interface PruneOptions {
  /** Remove visually empty tags without styles or dimensions. Defaults to true */
  removeEmpty?: boolean;
  /** Collapse 2+ consecutive blank paragraphs into 1 spacer. Defaults to true */
  foldEmptyParagraphs?: boolean;
  /** Unwrap unstyled single-child wrapper containers (div/section). Defaults to true */
  unwrapSingleChild?: boolean;
}

export interface ParseResult {
  /** Optimized AST tree ready for rendering */
  ast: ASTNode[];
  /** Ordered list of all image URLs in the rich text */
  galleryList: string[];
  /** Detailed metadata for all images */
  rawImages: ImageGalleryItem[];
  /** Detected dominant article theme background color (if any) */
  themeBgColor?: string;
  /** Truncation metadata if truncate option was provided */
  truncateInfo?: {
    isTruncated: boolean;
    totalTextLength: number;
    truncatedLength: number;
  };
}

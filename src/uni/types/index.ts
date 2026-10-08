import {
  ASTNode,
  LinkTapContext,
  MediaEventPayload,
  ThemeConfig,
  TruncateOptions
} from '../../core';

export type { ThemeConfig, TruncateOptions, ASTNode, LinkTapContext, MediaEventPayload };

export interface UniRichTextProps {
  /** HTML or Markdown content */
  content: string;
  /** Content format. Default: 'html' */
  format?: 'html' | 'markdown';
  /** Rendering mode. Default: 'default' */
  mode?: 'default' | 'wechat';
  /** Max recursion depth. Default: 8 (12 in wechat mode) */
  maxDepth?: number;
  /** Extract <style> tag rules. Auto-enabled in wechat mode */
  extractStyles?: boolean;
  /** Enable progressive chunked rendering. Default: true */
  chunked?: boolean;
  /** Whether to enable in-memory LRU cache for parse results. Default: true */
  cache?: boolean;
  /** Nodes per chunk. Default: 15 */
  chunkSize?: number;
  /** Whether text nodes are selectable. Default: false (文本默认不可选中复制) */
  selectable?: boolean;
  /** Optional webview page path for external links */
  webviewPath?: string;
  /** Declared TabBar routes for smart routing */
  tabBarList?: string[];
  /** Container CSS class */
  className?: string;
  /** Container inline style object */
  style?: Record<string, any>;
  /** Target base font size in px. Default: 15. e.g. content 22px → renders as 15px */
  baseFontSize?: number | string;
  /** Source content base font size in px. Default: 22 */
  contentBaseFontSize?: number | string;
  /** Container text font size (alias). e.g. '1rem', 16. Default: baseFontSize */
  fontSize?: number | string;
  /** Root font size in px used for rem calculation. Default: 18.75 (WeChat Mini Program 20rem rule) */
  rootFontSize?: number;
  /** Scaling factor for rem conversion. Default is 0.5 (halved for mobile display) */
  remScale?: number;
  /** Font size scaling factor for parsed styles. Default is 1 */
  fontScale?: number;
  /** Semantic color theme overrides */
  theme?: ThemeConfig;
  /** Custom external font size resolver function */
  fontSizeResolver?: (sourcePx: number, rawValue: string) => string | number;
  /** Action when tapping an image that has an anchor link. 'link': navigate (default), 'preview': open gallery, 'both': both */
  imageLinkAction?: 'link' | 'preview' | 'both';
  /** Enable image skeleton placeholder. Default: true */
  imageSkeleton?: boolean;
  /** Whether to show fallback placeholder on image load failure. Default: false (hides failed images). */
  showImageError?: boolean;
  /** Safe AST truncation options for generating excerpts and clamping node size */
  truncate?: TruncateOptions;
  /** Quick alias for truncate.maxLength (number of characters) */
  truncateLength?: number;
  /** Max height threshold for visual container clamping with expand/collapse (e.g. 240 or '240px') */
  clampMaxHeight?: number | string;
  /** Text for expand button. Defaults to '展开全文' */
  expandText?: string;
  /** Text for collapse button. Defaults to '收起' */
  collapseText?: string;
  /** Whether to show collapse button after expanding. Defaults to true */
  showCollapse?: boolean;
  /** Callback emitted when expanded state changes */
  onExpandChange?: (expanded: boolean) => void;
  /** Global image crop mode override: 'widthFix' | 'aspectFill' | 'aspectFit' | 'auto' */
  imageCropMode?: 'widthFix' | 'aspectFill' | 'aspectFit' | 'auto';
  /** Global image crop aspect ratio (e.g. 16/9, 4/3, 1) */
  imageCropRatio?: number;
  /** Custom node renderer override (Vue component or render function) */
  customRender?: (node: ASTNode) => any;
  /** Custom components map: tag name -> Vue Component */
  components?: Record<string, any>;
  /** Custom interceptor for link clicks */
  onLinkTap?: (ctx: LinkTapContext) => boolean | void | Promise<boolean | void>;
  /** Event emitted on image tap */
  onImageTap?: (payload: { src: string; index: number }) => void;
  /** Event emitted on text long-press */
  onLongPressText?: (text: string, node: ASTNode) => void;
  /** Event emitted on video/audio play, pause, end, error */
  onMediaEvent?: (payload: MediaEventPayload) => void;
  /** Generic node event hook for custom events */
  onNodeEvent?: (eventType: string, node: ASTNode, rawEvent?: any) => void;
  /** Enable AI streaming mode with incremental syntax healing. Default: false */
  streaming?: boolean;
  /** Whether to show blinking typewriter cursor at tail during streaming. Default: true */
  showCursor?: boolean;
  /** Custom cursor character (e.g. '▍', '|', '█'). Default: '▍' */
  cursorChar?: string;
}

export type OmniRichTextProps = UniRichTextProps;
export type UniversalRichTextProps = UniRichTextProps;


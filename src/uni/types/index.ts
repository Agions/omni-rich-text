import { ASTNode, LinkTapContext, MediaEventPayload, ThemeConfig } from '../../core';

export type { ThemeConfig };

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
  /** Enable image skeleton placeholder. Default: true */
  imageSkeleton?: boolean;
}

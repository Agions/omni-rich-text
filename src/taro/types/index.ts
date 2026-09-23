import React from 'react';
import { ASTNode, LinkTapContext, MediaEventPayload, ThemeConfig } from '../../core';

export type { ThemeConfig };

export interface UniversalRichTextProps {
  /** Rich text content (HTML or Markdown) */
  content: string;
  /** Content format: 'html' | 'markdown'. Default is 'html' */
  format?: 'html' | 'markdown';
  /** Rendering mode: 'default' | 'wechat'. Default is 'html' / 'default' */
  mode?: 'default' | 'wechat';
  /** Max recursion depth before flattening. Default is 8 (12 in wechat mode) */
  maxDepth?: number;
  /** Whether to parse <style> tag blocks into inline styles. Auto-enabled in wechat mode */
  extractStyles?: boolean;
  /** Enable progressive chunked rendering for long articles. Default is true */
  chunked?: boolean;
  /** Number of root blocks rendered per chunk. Default is 15 */
  chunkSize?: number;
  /** Whether text is selectable. Default is false (文本默认不可选中复制) */
  selectable?: boolean;
  /** Optional custom path to internal web-view page for external links */
  webviewPath?: string;
  /** Declared TabBar page routes */
  tabBarList?: string[];
  /** Outer container CSS class name */
  className?: string;
  /** Outer container inline style */
  style?: React.CSSProperties;
  /** Target base font size in px. Default: 15 (15px). e.g. if set to 15, content 22px displays as 15px */
  baseFontSize?: number | string;
  /** Source content base font size in px. Default: 22. For every 1px larger, cumulate onto baseFontSize */
  contentBaseFontSize?: number | string;
  /** Container text font size (alias, backward compatible). e.g. '1rem', 16, '15px' */
  fontSize?: number | string;
  /** Root font size in px used for rem calculation. Default: 18.75 (WeChat Mini Program 20rem rule) */
  rootFontSize?: number;
  /** Scaling factor for rem conversion. Default is 0.5 (halved for mobile display) */
  remScale?: number;
  /** Font size scaling factor for parsed styles. Default is 1 */
  fontScale?: number;
  /** Theme: override semantic colors for links, blockquote, code, table, list bullets, hr, image skeleton */
  theme?: ThemeConfig;
  /** Custom interceptor for link clicks */
  onLinkTap?: (ctx: LinkTapContext) => boolean | void | Promise<boolean | void>;
  /** Event emitted on image tap */
  onImageTap?: (payload: { src: string; index: number }) => void;
  /** Event emitted on text long-press */
  onLongPressText?: (text: string, node: ASTNode) => void;
  /** Event emitted on video/audio play, pause, end, error */
  onMediaEvent?: (payload: MediaEventPayload) => void;
  /** Generic node event hook for custom events */
  onNodeEvent?: (eventType: string, node: ASTNode, rawEvent: any) => void;
  /** Custom node renderer override */
  customRender?: (node: ASTNode) => React.ReactNode | null;
  /** Custom components map: tag name -> React component */
  components?: Record<
    string,
    React.ComponentType<{
      node: ASTNode;
      attrs: Record<string, string>;
      children?: React.ReactNode;
      [key: string]: any;
    }>
  >;
  /** Enable skeleton placeholder and smooth fade-in for images. Default is true */
  imageSkeleton?: boolean;
}


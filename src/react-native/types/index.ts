import { ASTNode, LinkTapContext, MediaEventPayload, ThemeConfig } from '../../core';

export type { ThemeConfig };

export interface UniversalRichTextProps {
  /** Rich text content (HTML or Markdown string) */
  content: string;

  /** Content format. Default: 'html' */
  format?: 'html' | 'markdown';

  /** Rendering mode. 'wechat' enables WeChat article fidelity tweaks. Default: 'default' */
  mode?: 'default' | 'wechat';

  /** Max recursion depth before the optimizer flattens nested nodes. Default: 8 */
  maxDepth?: number;

  /** Whether to parse <style> tag blocks into inline styles. Auto-enabled in wechat mode */
  extractStyles?: boolean;

  /** Enable progressive chunked rendering for long articles. Default: true */
  chunked?: boolean;

  /** Whether to enable in-memory LRU cache for parse results. Default: true */
  cache?: boolean;

  /** Number of root AST blocks rendered per chunk iteration. Default: 15 */
  chunkSize?: number;

  /** Semantic color theme overrides */
  theme?: ThemeConfig;

  /** Target base font size in px. Default: 15. e.g. if content has 22px, it renders as 15px */
  baseFontSize?: number | string;

  /** Source content base font size in px. Default: 22 */
  contentBaseFontSize?: number | string;

  /** Container text font size (alias). e.g. '1rem', 16, '16px'. Default: baseFontSize */
  fontSize?: number | string;

  /** Root font size in px used for rem calculation. Default: 18.75 (WeChat Mini Program 20rem rule) */
  rootFontSize?: number;

  /** Scaling factor for rem conversion. Default is 0.5 (halved for mobile display) */
  remScale?: number;

  /** Font size scaling factor for parsed styles. Default is 1 */
  fontScale?: number;

  /** Outer container View style (React Native ViewStyle) */
  style?: object;

  /**
   * Enable image skeleton placeholder and Animated fade-in on load.
   * Default: true
   */
  imageSkeleton?: boolean;

  /**
   * Custom node renderer override. Return a React element to replace the
   * default rendering for that node, or return null / undefined to fall
   * through to the built-in renderer.
   *
   * This is the recommended way to integrate custom video / audio players
   * since React Native has no standard <video> component.
   *
   * @example
   * customRender={(node) => {
   *   if (node.name === 'video') {
   *     return <Video source={{ uri: node.attrs.src }} style={{ width: '100%', height: 220 }} />;
   *   }
   *   return null;
   * }}
   */
  customRender?: (node: ASTNode) => React.ReactNode | null;

  /** Declared internal TabBar route list used for smart link navigation */
  tabBarList?: string[];

  /**
   * Called when the user taps a link. Return `false` to prevent the default
   * `Linking.openURL()` behaviour.
   */
  onLinkTap?: (ctx: LinkTapContext) => boolean | void | Promise<boolean | void>;

  /**
   * Called when the user taps an image. Use with a library such as
   * `react-native-image-viewing` to implement a lightbox.
   */
  onImageTap?: (payload: { src: string; index: number }) => void;

  /** Called when the user long-presses a text node */
  onLongPressText?: (text: string, node: ASTNode) => void;

  /** Called for video / audio playback events when using a custom player via customRender */
  onMediaEvent?: (payload: MediaEventPayload) => void;
}

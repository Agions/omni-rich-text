/**
 * Theme configuration for customizing semantic colors across all rendered elements.
 * All values are optional; omitted keys fall back to the built-in defaults.
 */
export interface ThemeConfig {
  /** Color of <a> link text. Default: '#576b95' (WeChat blue) */
  linkColor?: string;

  /** Left-border color of <blockquote>. Default: '#dcdfe6' */
  blockquoteBorderColor?: string;
  /** Background color of <blockquote>. Default: '#f7f7f7' */
  blockquoteBgColor?: string;
  /** Text color of <blockquote>. Default: 'rgba(0,0,0,0.55)' */
  blockquoteTextColor?: string;

  /** Background color of <pre><code> blocks. Default: '#282c34' */
  codeBgColor?: string;
  /** Text color of <pre><code> blocks. Default: '#abb2bf' */
  codeTextColor?: string;

  /** Border color of <table> cells. Default: '#e7e7e7' */
  tableBorderColor?: string;
  /** Background color of <th> header cells. Default: '#f8f8f8' */
  tableHeaderBgColor?: string;

  /** Color of bullet / number markers in <li>. Default: '#666' */
  bulletColor?: string;

  /** Color of <hr> divider line. Default: '#e7e7e7' */
  hrColor?: string;

  /** Background color of image skeleton placeholder. Default: '#f1f5f9' */
  imageSkeletonColor?: string;

  /** Target base font size in px. Default: 15 */
  baseFontSize?: number | string;

  /** Content base font size in px. Default: 22 */
  contentBaseFontSize?: number | string;

  /** Base font size for container text. e.g. '1rem', '0.875rem', 16, 15. Default: '0.8rem' (15px) */
  fontSize?: number | string;

  /** Root font size in px used for rem calculation. Default: 18.75 (WeChat Mini Program 20rem rule) */
  rootFontSize?: number;

  /** Rem scaling factor. Default is 0.5 (halved) */
  remScale?: number;

  /** Font scaling ratio. Default is 1 */
  fontScale?: number;
}

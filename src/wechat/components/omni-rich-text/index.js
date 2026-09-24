// omni-rich-text: Omni Rich Text Top-Level Container
// Native WeChat Mini Program Component
//
// Usage A — pass raw HTML and let the component parse internally:
//   <omni-rich-text content="{{htmlString}}" />
//
// Usage B — pre-parse on the page and pass the AST directly:
//   const { parseRichContent } = require('omni-rich-text/core');
//   const { ast } = parseRichContent(html, { mode: 'wechat' });
//   this.setData({ nodes: ast });
//   <omni-rich-text nodes="{{nodes}}" />

let parseRichContent, chunkAST, toRemFontSize;
try {
  let core;
  try {
    core = require('omni-rich-text/core');
  } catch (err) {
    core = require('../../../core');
  }
  parseRichContent = core.parseRichContent;
  chunkAST = core.chunkAST;
  toRemFontSize = core.toRemFontSize;
} catch (e) {
  parseRichContent = null;
  chunkAST = null;
  toRemFontSize = null;
}

Component({
  properties: {
    /**
     * Raw HTML string. Parsed internally when @universal-rt/core is available
     * via miniprogram_npm. Triggers re-parse whenever the value changes.
     */
    content: { type: String, value: '', observer: '_onContentChange' },

    /**
     * Pre-parsed AST nodes array (alternative to `content`).
     * Use this when you call parseRichContent yourself in the page JS.
     */
    nodes: {
      type: Array,
      value: [],
      observer(newVal) {
        if (newVal && newVal.length) {
          this._setNodes(newVal);
        }
      }
    },

    /**
     * Rendering mode passed through to core.
     * 'wechat' enables WeChat article style (extracts <style> blocks, etc.).
     * 'default' is plain HTML mode.
     * @default 'wechat'
     */
    mode: { type: String, value: 'wechat' },

    /**
     * Whether to extract and apply inline <style> tag rules found in the HTML.
     * Defaults to true for wechat mode.
     * @default true
     */
    extractStyles: { type: Boolean, value: true },

    /**
     * Semantic color theme overrides.
     * Shape: { linkColor, hrColor, codeBgColor, codeTextColor,
     *          blockquoteBorderColor, blockquoteBgColor, blockquoteTextColor,
     *          tableBorderColor, tableHeaderBgColor, bulletColor,
     *          imageSkeletonColor }
     */
    theme: { type: Object, value: {} },

    /** Extra CSS class(es) to append to the container view. */
    className: { type: String, value: '' },

    /**
     * Enable progressive chunked rendering to avoid long setData calls
     * on large documents. Highly recommended for production use.
     * @default true
     */
    chunked: { type: Boolean, value: true },

    /**
     * Number of top-level AST nodes to include in each streamed chunk.
     * @default 15
     */
    chunkSize: { type: Number, value: 15 },

    /**
     * Array of tab-bar page paths (without query strings).
     * Used for smart link routing: matching links use wx.switchTab instead
     * of wx.navigateTo.
     * Example: ['/pages/home/index', '/pages/mine/index']
     */
    tabBarList: { type: Array, value: [] },

    /**
     * Path to a webview page in this mini-program used to open external URLs.
     * The URL is appended as a query parameter: `?url=<encoded-href>`.
     * If omitted, external links are copied to clipboard instead.
     * Example: '/pages/webview/index'
     */
    webviewPath: { type: String, value: '' },

    /**
     * Base font size for container text. e.g. '1rem', '0.875rem', 16, '16px'.
     * @default '1rem'
     */
    fontSize: {
      type: null,
      value: null,
      observer: '_updateContainerStyle'
    },

    /**
     * Root font size in px used for rem calculation. Default: 18.75 (WeChat Mini Program 20rem rule)
     * @default 18.75
     */
    rootFontSize: {
      type: Number,
      value: 18.75,
      observer: '_updateContainerStyle'
    },

    /**
     * Rem scaling factor. Default is 0.5 (halved).
     * @default 0.5
     */
    remScale: {
      type: Number,
      value: 0.5
    },

    /**
     * Font size scaling factor. Default is 1.
     * @default 1
     */
    fontScale: {
      type: Number,
      value: 1
    },

    /**
     * Target base font size in px. Content at contentBaseFontSize maps to baseFontSize.
     * e.g. baseFontSize=15, contentBaseFontSize=22: content 22px → 15px, 23px → 16px.
     * @default 15
     */
    baseFontSize: {
      type: Number,
      value: 15,
      observer: '_updateContainerStyle'
    },

    /**
     * Source content base font size in px. Default: 22 (WeChat/Quill article default).
     * @default 22
     */
    contentBaseFontSize: {
      type: Number,
      value: 22
    },

    /**
     * Custom font size resolver function: (sourcePx: number, rawValue: string) => string | number
     */
    fontSizeResolver: {
      type: null,
      value: null
    },

    /**
     * Action when tapping an image that has a link. 'link' (default), 'preview', 'both'.
     * @default 'link'
     */
    imageLinkAction: {
      type: String,
      value: 'link'
    }
  },

  data: {
    /** Nodes currently rendered in the template (grows as chunks stream in) */
    displayNodes: [],
    /** All images found in the document, used for wx.previewImage gallery */
    galleryList: [],
    /**
     * Default container inline style — can be overridden by passing
     * an explicit `style` attribute on the component in the parent WXML.
     */
    containerStyle: [
      'box-sizing:border-box',
      'width:100%',
      'max-width:100%',
      'word-break:break-word',
      'font-size:0.8rem'
    ].join(';')
  },

  lifetimes: {
    attached() {
      this._updateContainerStyle();
      // Kick off initial render when the component is first mounted.
      if (this.data.content) {
        this._parseAndRender(this.data.content);
      } else if (this.data.nodes && this.data.nodes.length) {
        this._setNodes(this.data.nodes);
      }
    }
  },

  methods: {
    // ── Private helpers ───────────────────────────────────────────────────

    _updateContainerStyle() {
      const fs = this.data.fontSize;
      const rfs = this.data.rootFontSize || 18.75;
      const defaultPx = this.data.baseFontSize || 15;
      let fsVal;
      if (toRemFontSize) {
        fsVal = toRemFontSize(fs, rfs, 0.5, defaultPx);
      } else if (fs !== null && fs !== undefined && fs !== '') {
        if (typeof fs === 'number') {
          fsVal = `${(fs / rfs).toFixed(4)}rem`;
        } else {
          const str = String(fs).trim();
          fsVal = str.endsWith('rem') ? str : (str.endsWith('px') ? `${(parseFloat(str) / rfs).toFixed(4)}rem` : str);
        }
      } else {
        fsVal = `${(defaultPx / rfs).toFixed(4)}rem`;
      }
      this.setData({
        containerStyle: [
          'box-sizing:border-box',
          'width:100%',
          'max-width:100%',
          'word-break:break-word',
          `font-size:${fsVal}`
        ].join(';')
      });
    },

    /** Observer called when the `content` property changes */
    _onContentChange(newVal) {
      if (newVal) this._parseAndRender(newVal);
    },

    /**
     * Parse raw HTML with @universal-rt/core and start rendering.
     * Falls back with a console warning when core is unavailable.
     */
    _parseAndRender(content) {
      if (!parseRichContent) {
        console.warn(
          '[omni-rich-text/wechat] core is not available. ' +
          'Build miniprogram_npm in WeChat DevTools, or use the `nodes` property ' +
          'and call parseRichContent yourself in the page JS.'
        );
        return;
      }

      const { ast, galleryList } = parseRichContent(content, {
        format: 'html',
        mode: this.data.mode,
        extractStyles: this.data.extractStyles,
        remScale: this.data.remScale ?? 0.5,
        fontScale: this.data.fontScale ?? 1,
        rootFontSize: this.data.rootFontSize ?? 18.75,
        baseFontSize: this.data.baseFontSize ?? 15,
        contentBaseFontSize: this.data.contentBaseFontSize ?? 22,
        fontSize: this.data.fontSize,
        fontSizeResolver: this.data.fontSizeResolver
      });

      this.setData({ galleryList });
      this._setNodes(ast);
    },

    /**
     * Accept a pre-built AST array and begin streaming it into displayNodes.
     * If chunked mode is disabled (or chunkAST is unavailable) the full tree
     * is rendered in a single setData call.
     */
    _setNodes(ast) {
      if (!this.data.chunked || !chunkAST) {
        this.setData({ displayNodes: ast });
        return;
      }

      const chunked = chunkAST(ast, { chunkSize: this.data.chunkSize });
      // Render the initial batch immediately so content appears fast.
      this.setData({ displayNodes: chunked.initial });

      if (chunked.remaining.length > 0) {
        this._streamChunks(chunked.remaining);
      }
    },

    /**
     * Progressively append remaining chunks to displayNodes with small
     * setTimeout delays to keep the JS thread responsive.
     * @param {Array[]} remaining - Array of node-batch arrays
     */
    _streamChunks(remaining) {
      let idx = 0;
      const streamNext = () => {
        if (idx >= remaining.length) return;
        const batch = remaining[idx++];
        this.setData({
          displayNodes: this.data.displayNodes.concat(batch)
        });
        setTimeout(streamNext, 80);
      };
      // Small initial delay to let the first paint complete.
      setTimeout(streamNext, 60);
    },

    // ── Event handlers (exposed to parent via triggerEvent) ───────────────

    /**
     * Handles link taps from any descendant urt-node.
     * Implements smart routing:
     *   - '#anchor'  → ignored (no-op)
     *   - '/path'    → switchTab (if in tabBarList) or navigateTo
     *   - 'http(s)…' → navigateTo webview page, or copy to clipboard
     */
    onLinkTap(e) {
      const { href, node } = e.detail;
      // Always emit so the page can hook in.
      this.triggerEvent('linkTap', { href, node });

      if (!href) return;

      // Anchor links — no navigation.
      if (href.startsWith('#')) return;

      // Internal mini-program paths.
      if (href.startsWith('/')) {
        const cleanPath = href.split('?')[0];
        const isTab = (this.data.tabBarList || []).includes(cleanPath);
        if (isTab) {
          wx.switchTab({ url: href });
        } else {
          wx.navigateTo({ url: href });
        }
        return;
      }

      // External URLs.
      if (href.startsWith('http')) {
        if (this.data.webviewPath) {
          wx.navigateTo({
            url: `${this.data.webviewPath}?url=${encodeURIComponent(href)}`
          });
        } else {
          wx.setClipboardData({
            data: href,
            success: () => wx.showToast({ title: '链接已复制', icon: 'none' })
          });
        }
      }
    },

    /**
     * Handles image taps from any descendant urt-node.
     * Opens wx.previewImage with the full gallery list.
     */
    onImageTap(e) {
      const { src, index } = e.detail;
      this.triggerEvent('imageTap', { src, index });

      const urls =
        this.data.galleryList && this.data.galleryList.length > 0
          ? this.data.galleryList
          : src ? [src] : [];

      if (urls.length > 0) {
        wx.previewImage({ current: src, urls });
      }
    },

    /**
     * Handles long-press on text nodes.
     * Emits the event so the page can handle custom long-press actions if needed.
     */
    onLongPressText(e) {
      this.triggerEvent('longPressText', e.detail);
    }
  }
});

// omni-rich-text: Omni Rich Text Top-Level Container
// Native WeChat Mini Program Component

let parseRichContent, parseStreamContent, chunkAST, toRemFontSize, hasForeignObject, splitSvgForeignObject, extractSvgViewBoxRatio;
try {
  let core;
  try {
    core = require('omni-rich-text/core');
  } catch (err) {
    core = require('../../../core');
  }
  parseRichContent = core.parseRichContent;
  parseStreamContent = core.parseStreamContent;
  chunkAST = core.chunkAST;
  toRemFontSize = core.toRemFontSize;
  hasForeignObject = core.hasForeignObject;
  splitSvgForeignObject = core.splitSvgForeignObject;
  extractSvgViewBoxRatio = core.extractSvgViewBoxRatio;
} catch (e) {
  parseRichContent = null;
  parseStreamContent = null;
  chunkAST = null;
  toRemFontSize = null;
  hasForeignObject = null;
  splitSvgForeignObject = null;
  extractSvgViewBoxRatio = null;
}

function enrichNodesForWechat(nodes) {
  if (!nodes || !nodes.length) return nodes;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.name === 'svg' && hasForeignObject && hasForeignObject(node)) {
      node.extra = node.extra || {};
      const { bgSvgXml, foreignObjectNodes } = splitSvgForeignObject(node);
      node.extra.hasForeignObject = true;
      node.extra.bgSvgDataUri = bgSvgXml ? 'data:image/svg+xml;utf8,' + encodeURIComponent(bgSvgXml) : '';
      node.extra.foreignObjectNodes = foreignObjectNodes;
      node.extra.aspectRatio = extractSvgViewBoxRatio ? extractSvgViewBoxRatio(node) : undefined;
    }
    if (node.name === 'pre' && node.extra && node.extra.isSvgCodeBlock && node.extra.rawSvgCode) {
      node.extra.svgCodeDataUri = 'data:image/svg+xml;utf8,' + encodeURIComponent(node.extra.rawSvgCode);
    }
    if (node.children && node.children.length) {
      enrichNodesForWechat(node.children);
    }
  }
  return nodes;
}

Component({
  properties: {
    /** Raw HTML string */
    content: { type: String, value: '', observer: '_onContentChange' },

    /** Pre-parsed AST nodes array */
    nodes: {
      type: Array,
      value: [],
      observer(newVal) {
        if (newVal && newVal.length) {
          this._setNodes(enrichNodesForWechat(newVal));
        }
      }
    },

    /** Content format: 'html' | 'markdown' */
    format: { type: String, value: 'html' },

    /** Enable AI streaming mode with incremental tail syntax healing */
    streaming: { type: Boolean, value: false },

    /** Whether to show typewriter blinking cursor at tail */
    showCursor: { type: Boolean, value: true },

    /** Cursor character */
    cursorChar: { type: String, value: '▍' },

    /** Rendering mode: 'wechat' | 'default' */
    mode: { type: String, value: 'wechat' },

    /** Whether to extract and apply inline <style> tag rules found in HTML */
    extractStyles: { type: Boolean, value: true },

    /** Semantic color theme overrides */
    theme: { type: Object, value: {} },

    /** Extra CSS class(es) */
    className: { type: String, value: '' },

    /** Enable progressive chunked rendering */
    chunked: { type: Boolean, value: true },

    /** Nodes per chunk */
    chunkSize: { type: Number, value: 15 },

    /** Array of tab-bar page paths */
    tabBarList: { type: Array, value: [] },

    /** Path to webview page */
    webviewPath: { type: String, value: '' },

    /** Base font size for container text */
    fontSize: {
      type: null,
      value: null,
      observer: '_updateContainerStyle'
    },

    /** Root font size in px used for rem calculation */
    rootFontSize: {
      type: Number,
      value: 18.75,
      observer: '_updateContainerStyle'
    },

    /** Rem scaling factor */
    remScale: { type: Number, value: 0.5 },

    /** Font size scaling factor */
    fontScale: { type: Number, value: 1 },

    /** Target base font size in px */
    baseFontSize: {
      type: Number,
      value: 15,
      observer: '_updateContainerStyle'
    },

    /** Source content base font size in px */
    contentBaseFontSize: { type: Number, value: 22 },

    /** Custom font size resolver function */
    fontSizeResolver: { type: null, value: null },

    /** Action when tapping an image with a link: 'link' | 'preview' | 'both' */
    imageLinkAction: { type: String, value: 'link' },

    /** Whether to display broken image placeholder */
    showImageError: { type: Boolean, value: false },

    /** Max height threshold for visual container clamping with expand/collapse */
    clampMaxHeight: {
      type: null,
      value: null,
      observer: '_checkClampHeight'
    },

    /** Text for expand button */
    expandText: { type: String, value: '展开全文' },

    /** Text for collapse button */
    collapseText: { type: String, value: '收起' },

    /** Whether to show collapse button after expanding */
    showCollapse: { type: Boolean, value: true },

    /** Safe AST truncation options */
    truncate: {
      type: Object,
      value: null,
      observer: '_onTruncateChange'
    },

    /** Quick alias for truncate.maxLength */
    truncateLength: {
      type: Number,
      value: 0,
      observer: '_onTruncateChange'
    },

    /** Global image crop mode: 'widthFix' | 'aspectFill' | 'aspectFit' | 'auto' */
    imageCropMode: { type: String, value: '' },

    /** Global image crop aspect ratio */
    imageCropRatio: { type: Number, value: 0 },

    /** Custom tags whitelist */
    customTags: { type: Array, value: [] }
  },

  data: {
    displayNodes: [],
    galleryList: [],
    themeBgColor: '',
    containerStyle: 'box-sizing:border-box;width:100%;max-width:100%;word-break:break-word;font-size:0.8rem;',
    isExpanded: false,
    canClamp: false,
    isClamped: false,
    fadeGradient: '',
    clampedWrapperStyle: 'position:relative;',
    contentInnerId: 'omni_inner_' + Math.random().toString(36).substring(2, 8)
  },

  lifetimes: {
    attached() {
      this._updateContainerStyle();
      if (this.data.content) {
        this._parseAndRender(this.data.content);
      } else if (this.data.nodes && this.data.nodes.length) {
        this._setNodes(enrichNodesForWechat(this.data.nodes));
      }
    }
  },

  methods: {
    _updateContainerStyle() {
      const fs = this.data.fontSize;
      const rfs = this.data.rootFontSize || 18.75;
      const defaultPx = this.data.baseFontSize || 15;
      let fsVal;
      if (toRemFontSize) {
        fsVal = toRemFontSize(fs, rfs, this.data.remScale ?? 0.5, defaultPx);
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

    _onContentChange(newVal) {
      if (newVal) this._parseAndRender(newVal);
    },

    _onTruncateChange() {
      if (this.data.content) this._parseAndRender(this.data.content);
    },

    _parseAndRender(content) {
      if (!parseRichContent) {
        console.warn(
          '[omni-rich-text/wechat] core is not available. ' +
          'Build miniprogram_npm in WeChat DevTools, or use the `nodes` property ' +
          'and call parseRichContent yourself in the page JS.'
        );
        return;
      }

      const effectiveTruncate = this.data.truncate || (this.data.truncateLength ? { maxLength: this.data.truncateLength } : undefined);

      let parseFn = (this.data.streaming && parseStreamContent) ? parseStreamContent : parseRichContent;
      const { ast, galleryList, themeBgColor } = parseFn(content, {
        format: this.data.format || 'html',
        mode: this.data.mode,
        extractStyles: this.data.extractStyles,
        customTags: this.data.customTags,
        truncate: effectiveTruncate,
        remScale: this.data.remScale ?? 0.5,
        fontScale: this.data.fontScale ?? 1,
        rootFontSize: this.data.rootFontSize ?? 18.75,
        baseFontSize: this.data.baseFontSize ?? 15,
        contentBaseFontSize: this.data.contentBaseFontSize ?? 22,
        fontSize: this.data.fontSize,
        fontSizeResolver: this.data.fontSizeResolver,
        showCursor: this.data.showCursor,
        cursorChar: this.data.cursorChar
      });

      const enrichedAst = enrichNodesForWechat(ast);
      const updateData = { galleryList, themeBgColor: themeBgColor || '' };
      this.setData(updateData);
      this._setNodes(enrichedAst);

      setTimeout(() => {
        this._checkClampHeight();
      }, 120);
    },

    _setNodes(ast) {
      if (this.data.streaming || !this.data.chunked || !chunkAST) {
        this.setData({ displayNodes: ast });
        setTimeout(() => this._checkClampHeight(), 100);
        return;
      }

      const chunked = chunkAST(ast, { chunkSize: this.data.chunkSize });
      this.setData({ displayNodes: chunked.initial });

      if (chunked.remaining.length > 0) {
        this._streamChunks(chunked.remaining);
      } else {
        setTimeout(() => this._checkClampHeight(), 100);
      }
    },

    _streamChunks(remaining) {
      let idx = 0;
      const streamNext = () => {
        if (idx >= remaining.length) {
          setTimeout(() => this._checkClampHeight(), 100);
          return;
        }
        const batch = remaining[idx++];
        this.setData({
          displayNodes: this.data.displayNodes.concat(batch)
        });
        setTimeout(streamNext, 80);
      };
      setTimeout(streamNext, 60);
    },

    _checkClampHeight() {
      if (!this.data.clampMaxHeight) {
        this.setData({ canClamp: false, isClamped: false, clampedWrapperStyle: 'position:relative;' });
        return;
      }
      const maxH = parseFloat(this.data.clampMaxHeight);
      if (isNaN(maxH) || maxH <= 0) return;

      const query = this.createSelectorQuery();
      query.select('#' + this.data.contentInnerId).boundingClientRect((rect) => {
        if (rect && rect.height) {
          const canClamp = rect.height > maxH;
          const isClamped = canClamp && !this.data.isExpanded;
          const bg = this.data.themeBgColor || '#ffffff';
          this.setData({
            canClamp,
            isClamped,
            fadeGradient: `linear-gradient(to bottom, rgba(255,255,255,0) 0%, ${bg} 85%)`,
            clampedWrapperStyle: isClamped ? `max-height:${maxH}px;overflow:hidden;position:relative;` : 'position:relative;'
          });
        }
      }).exec();
    },

    onToggleExpand() {
      const next = !this.data.isExpanded;
      const maxH = parseFloat(this.data.clampMaxHeight);
      const isClamped = this.data.canClamp && !next;
      this.setData({
        isExpanded: next,
        isClamped,
        clampedWrapperStyle: isClamped ? `max-height:${maxH}px;overflow:hidden;position:relative;` : 'position:relative;'
      });
      this.triggerEvent('expandChange', { expanded: next });
    },

    onLinkTap(e) {
      const { href, node } = e.detail;
      this.triggerEvent('linkTap', { href, node });

      if (!href) return;
      if (href.startsWith('#')) return;

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

    onLongPressText(e) {
      this.triggerEvent('longPressText', e.detail);
    }
  }
});

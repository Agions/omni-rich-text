// omni-node: Universal Rich Text Node — Native WeChat Mini Program
// Handles a single AST node and recursively renders its children.
// Events bubble upward via triggerEvent so omni-rich-text can intercept them.

Component({
  options: {
    virtualHost: true
  },
  properties: {
    /** The AST node object produced by @universal-rt/core parseRichContent */
    node: {
      type: Object,
      value: {},
      observer(newVal) {
        if (newVal && newVal.name === 'img') {
          this._computeImage(newVal, this.data.imageCropMode, this.data.imageCropRatio);
        }
      }
    },
    /** Semantic color theme overrides */
    theme: { type: Object, value: {} },
    /** Index of this item within a parent list (ul/ol) */
    indexInList: { type: Number, value: 0 },
    /** Parent tag name */
    parentTag: { type: String, value: '' },
    /** Inherited link href from parent <a> tag */
    parentLinkHref: { type: String, value: '' },
    /** Action when tapping an image that has a link: 'link' | 'preview' | 'both' */
    imageLinkAction: { type: String, value: 'link' },
    /** Whether direct parent is a flexbox container */
    parentIsFlex: { type: Boolean, value: false },
    /** Whether to display broken image placeholder */
    showImageError: { type: Boolean, value: false },
    /** Global image crop mode: 'widthFix' | 'aspectFill' | 'aspectFit' | 'auto' */
    imageCropMode: {
      type: String,
      value: '',
      observer(newVal) {
        this._computeImage(this.data.node, newVal, this.data.imageCropRatio);
      }
    },
    /** Global image crop aspect ratio */
    imageCropRatio: {
      type: Number,
      value: 0,
      observer(newVal) {
        this._computeImage(this.data.node, this.data.imageCropMode, newVal);
      }
    }
  },

  data: {
    hasError: false,
    showSvgPreview: false,
    effectiveImgMode: 'widthFix',
    effectiveImgHeight: '',
    effectiveImgWidth: '100%',
    isFullWidth: true
  },

  lifetimes: {
    attached() {
      if (this.data.node && this.data.node.name === 'img') {
        this._computeImage(this.data.node, this.data.imageCropMode, this.data.imageCropRatio);
      }
    }
  },

  methods: {
    _computeImage(node, cropMode, cropRatio) {
      if (!node || node.name !== 'img') return;
      const rawHeight = node.styleObj?.height || (node.attrs?.height ? (isNaN(Number(node.attrs.height)) ? node.attrs.height : `${node.attrs.height}px`) : undefined);
      const hasExplicitHeight = !!rawHeight;
      const attrWidth = node.attrs?.width ? (isNaN(Number(node.attrs.width)) ? node.attrs.width : `${node.attrs.width}px`) : undefined;
      const hasExplicitWidth = (!!node.styleObj?.width && node.styleObj.width !== '100%' && node.styleObj.width !== 'auto') || !!attrWidth;
      const rawWidth = (node.styleObj?.width && node.styleObj.width !== 'auto') ? node.styleObj.width : attrWidth;
      const isFullWidth = (rawWidth === '100%' || String(rawWidth).startsWith('100%')) || (!hasExplicitWidth && !hasExplicitHeight);

      const effectiveImgMode =
        (node.attrs?.mode) ||
        (cropMode && cropMode !== 'auto' ? cropMode : null) ||
        (cropRatio ? 'aspectFill' : null) ||
        (hasExplicitWidth && hasExplicitHeight ? 'aspectFill' : null) ||
        (hasExplicitHeight && !hasExplicitWidth ? 'heightFix' : 'widthFix');

      const effectiveImgHeight = cropRatio
        ? '100%'
        : effectiveImgMode === 'widthFix'
        ? ''
        : (rawHeight || '');

      const effectiveImgWidth = effectiveImgMode === 'heightFix'
        ? 'auto'
        : isFullWidth
        ? '100%'
        : (rawWidth || 'auto');

      this.setData({
        effectiveImgMode,
        effectiveImgHeight,
        effectiveImgWidth,
        isFullWidth
      });
    },

    onToggleSvgPreview() {
      this.setData({ showSvgPreview: !this.data.showSvgPreview });
    },

    onCopyCode() {
      const code = this.data.node.extra?.rawSvgCode || this._extractText(this.data.node);
      if (code) {
        wx.setClipboardData({
          data: code,
          success: () => wx.showToast({ title: '代码已复制', icon: 'none' })
        });
      }
    },

    _extractText(node) {
      if (!node) return '';
      if (node.type === 'text') return node.text || '';
      if (!node.children || !node.children.length) return '';
      return node.children.map(c => this._extractText(c)).join('');
    },

    onSlideTap(e) {
      const { src, href } = e.currentTarget.dataset;
      if (href) {
        this.triggerEvent('linkTap', { href, node: this.data.node });
      }
      this.triggerEvent('imageTap', { src, index: 0, node: this.data.node });
    },

    onImageError(e) {
      this.setData({ hasError: true });
    },

    onLinkTap(e) {
      const href = e.currentTarget.dataset.href || '';
      this.triggerEvent('linkTap', { href, node: this.data.node });
    },

    onImageTap(e) {
      const src = e.currentTarget.dataset.src || '';
      const galleryIndex = e.currentTarget.dataset.galleryIndex || 0;
      const effectiveHref = this.data.node.attrs?.href || this.data.parentLinkHref || '';
      const action = this.data.imageLinkAction || 'link';

      if (effectiveHref) {
        if (action === 'preview') {
          this.triggerEvent('imageTap', { src, index: galleryIndex, node: this.data.node });
        } else if (action === 'both') {
          this.triggerEvent('linkTap', { href: effectiveHref, node: this.data.node });
          this.triggerEvent('imageTap', { src, index: galleryIndex, node: this.data.node });
        } else {
          this.triggerEvent('linkTap', { href: effectiveHref, node: this.data.node });
        }
        return;
      }

      this.triggerEvent('imageTap', { src, index: galleryIndex, node: this.data.node });
    },

    onNodeTap(e) {
      this.triggerEvent('nodeTap', { node: this.data.node, rawEvent: e });
    },

    onTextLongPress(e) {
      const text = this.data.node.text || '';
      this.triggerEvent('longPressText', { text, node: this.data.node });
    },

    onChildLinkTap(e) {
      this.triggerEvent('linkTap', e.detail);
    },

    onChildImageTap(e) {
      this.triggerEvent('imageTap', e.detail);
    },

    onChildLongPressText(e) {
      this.triggerEvent('longPressText', e.detail);
    }
  }
});

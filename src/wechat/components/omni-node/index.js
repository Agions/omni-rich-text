// urt-node: Universal Rich Text Node — Native WeChat Mini Program
// Handles a single AST node and recursively renders its children.
// Events bubble upward via triggerEvent so urt-rich-text can intercept them.

Component({
  properties: {
    /** The AST node object produced by @universal-rt/core parseRichContent */
    node: { type: Object, value: {} },
    /** Semantic color theme overrides (see ThemeConfig in README) */
    theme: { type: Object, value: {} },
    /** Index of this item within a parent list (ul/ol) — used for ordered bullets */
    indexInList: { type: Number, value: 0 },
    /** Parent tag name — passed down so <li> can distinguish ul vs ol context */
    parentTag: { type: String, value: '' }
  },

  methods: {
    /**
     * Fired when an <a> element is tapped.
     * Propagates { href, node } up the component tree.
     */
    onLinkTap(e) {
      const href = e.currentTarget.dataset.href || '';
      this.triggerEvent('linkTap', { href, node: this.data.node });
    },

    /**
     * Fired when an <img> element is tapped.
     * Propagates { src, index, node } up the component tree.
     */
    onImageTap(e) {
      const src = e.currentTarget.dataset.src || '';
      const galleryIndex = e.currentTarget.dataset.galleryIndex || 0;
      this.triggerEvent('imageTap', { src, index: galleryIndex, node: this.data.node });
    },

    /**
     * Fired when any generic block node is tapped.
     * Propagates { node, rawEvent } up the component tree.
     */
    onNodeTap(e) {
      this.triggerEvent('nodeTap', { node: this.data.node, rawEvent: e });
    },

    /**
     * Fired when a text node is long-pressed.
     * Propagates { text, node } up the tree without auto-copying to clipboard.
     */
    onTextLongPress(e) {
      const text = this.data.node.text || '';
      this.triggerEvent('longPressText', { text, node: this.data.node });
    },

    // ── Child event bubble-up handlers ─────────────────────────────────────
    // These are bound on every recursive <urt-node> call so events propagate
    // all the way up to the top-level <urt-rich-text> container.

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

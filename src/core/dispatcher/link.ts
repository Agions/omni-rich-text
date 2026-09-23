/**
 * Smart Link Dispatcher
 * Intelligently routes internal pages, tab bars, external URLs, and anchor links.
 */

import { ASTNode, LinkTapContext } from '../types/ast';
import { PlatformBridge } from '../bridge/platform';

export interface SmartLinkOptions {
  /** Optional webview page path in mini program, e.g. '/pages/webview/index' */
  webviewPath?: string;
  /** Declared TabBar page routes */
  tabBarList?: string[];
  /** Custom link click interceptor callback */
  onLinkTap?: (ctx: LinkTapContext) => boolean | void | Promise<boolean | void>;
}

export class SmartLinkDispatcher {
  constructor(
    private bridge: PlatformBridge,
    private options: SmartLinkOptions = {}
  ) {}

  public async dispatch(ctx: LinkTapContext): Promise<void> {
    const { href } = ctx;
    if (!href) return;

    // 1. User custom hook interceptor
    if (this.options.onLinkTap) {
      const result = await this.options.onLinkTap(ctx);
      if (result === false) {
        return; // Explicitly cancelled
      }
    }

    // 2. Anchor navigation (#section-1)
    if (href.startsWith('#')) {
      const anchorId = href.slice(1);
      if (typeof document !== 'undefined') {
        const el = document.getElementById(anchorId);
        if (el?.scrollIntoView) {
          el.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      }
      return;
    }

    // 3. Mini-program internal routes (/pages/xxx, pages/xxx, ./xxx, ../xxx)
    const isInternalRoute =
      href.startsWith('/') ||
      href.startsWith('./') ||
      href.startsWith('../') ||
      href.startsWith('pages/');

    if (isInternalRoute && !href.startsWith('//')) {
      const normalizedPath = href.startsWith('/') ? href : `/${href}`;
      const isTabBar = this.options.tabBarList?.some((tab) => {
        const normalizedTab = tab.startsWith('/') ? tab : `/${tab}`;
        return normalizedPath.split('?')[0] === normalizedTab.split('?')[0];
      });

      if (isTabBar) {
        await this.bridge.switchTab({ url: normalizedPath });
      } else {
        await this.bridge.navigateTo({ url: normalizedPath });
      }
      return;
    }

    // 4. External HTTP/HTTPS Links
    if (/^https?:\/\//i.test(href)) {
      // In Web / H5 environment
      if (typeof window !== 'undefined' && window.open) {
        window.open(href, '_blank');
        return;
      }

      // In Mini Program environment
      if (this.options.webviewPath) {
        const encodedUrl = encodeURIComponent(href);
        const webviewRoute = this.options.webviewPath.includes('?')
          ? `${this.options.webviewPath}&url=${encodedUrl}`
          : `${this.options.webviewPath}?url=${encodedUrl}`;
        await this.bridge.navigateTo({ url: webviewRoute });
      } else {
        // Standard mini program clipboard fallback modal
        const confirmed = await this.bridge.showModal({
          title: '外部链接提示',
          content: `小程序不支持直接打开外部网页，是否复制链接到剪贴板？\n\n${href}`,
          confirmText: '复制链接'
        });
        if (confirmed) {
          await this.bridge.setClipboardData(href);
          this.bridge.showToast('链接已复制到剪贴板');
        }
      }
    }
  }
}

/**
 * Cross-Platform Bridge API Abstraction
 * Normalizes differences between WeChat Mini Program, Alipay Mini Program, H5, and Node SSR.
 */

declare const wx: any;
declare const my: any;
declare const tt: any;
declare const swan: any;

export interface PreviewImageOptions {
  current: string;
  urls: string[];
  index?: number;
}

export interface PlatformBridge {
  previewImage(options: PreviewImageOptions): Promise<void>;
  navigateTo(options: { url: string }): Promise<void>;
  switchTab(options: { url: string }): Promise<void>;
  setClipboardData(text: string): Promise<void>;
  showToast(title: string): void;
  showModal(options: { title: string; content: string; confirmText?: string }): Promise<boolean>;
}

export type PlatformTarget = 'taro' | 'uni' | 'web';

/**
 * Creates an environment-adaptive bridge instance
 */
export function createPlatformBridge(framework: PlatformTarget = 'web', customRuntime?: any): PlatformBridge {
  // 1. Taro runtime
  if (framework === 'taro') {
    const getTaroRuntime = () => {
      return (
        customRuntime ||
        (globalThis as any).Taro ||
        (typeof window !== 'undefined' && (window as any).Taro) ||
        (globalThis as any).wx ||
        (typeof wx !== 'undefined' ? wx : undefined) ||
        (globalThis as any).my ||
        (typeof my !== 'undefined' ? my : undefined) ||
        (globalThis as any).tt ||
        (typeof tt !== 'undefined' ? tt : undefined) ||
        (globalThis as any).swan ||
        (typeof swan !== 'undefined' ? swan : undefined)
      );
    };

    return {
      async previewImage({ current, urls, index }) {
        try {
          const runtime = getTaroRuntime();
          const previewUrls = urls && urls.length > 0 ? urls : (current ? [current] : []);
          const currentUrl = current || previewUrls[0] || '';

          if (!previewUrls.length) return;

          if (runtime?.previewImage) {
            const isAlipay =
              (runtime.getEnv && runtime.getEnv() === 'ALIPAY') ||
              typeof (globalThis as any).my !== 'undefined';

            if (isAlipay) {
              const numIndex =
                typeof index === 'number' ? index : Math.max(0, previewUrls.indexOf(currentUrl));
              return runtime.previewImage({ current: numIndex, urls: previewUrls, enablesavephoto: true });
            }
            return runtime.previewImage({ current: currentUrl, urls: previewUrls, showmenu: true });
          }

          if (typeof window !== 'undefined') {
            window.open(currentUrl, '_blank');
          }
        } catch (e) {
          console.warn('[UniversalRT] Taro previewImage fallback:', e);
        }
      },
      async navigateTo({ url }) {
        const runtime = getTaroRuntime();
        if (runtime?.navigateTo) {
          return runtime.navigateTo({ url });
        }
        if (typeof window !== 'undefined') window.location.href = url;
      },
      async switchTab({ url }) {
        const runtime = getTaroRuntime();
        if (runtime?.switchTab) {
          return runtime.switchTab({ url });
        }
        if (typeof window !== 'undefined') window.location.href = url;
      },
      async setClipboardData(text) {
        const runtime = getTaroRuntime();
        if (runtime?.setClipboardData) {
          return runtime.setClipboardData({ data: text });
        }
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          return navigator.clipboard.writeText(text);
        }
      },
      showToast(title) {
        const runtime = getTaroRuntime();
        if (runtime?.showToast) {
          runtime.showToast({ title, icon: 'none' });
        } else if (typeof alert !== 'undefined') {
          alert(title);
        }
      },
      async showModal({ title, content, confirmText = '确定' }) {
        const runtime = getTaroRuntime();
        if (runtime?.showModal) {
          const res = await runtime.showModal({ title, content, confirmText });
          return res.confirm;
        }
        if (typeof confirm !== 'undefined') {
          return confirm(`${title}\n${content}`);
        }
        return true;
      }
    };
  }

  // 2. UniApp runtime
  if (framework === 'uni') {
    return {
      async previewImage({ current, urls, index }) {
        const uniObj = (globalThis as any).uni;
        if (!uniObj?.previewImage) return;

        // Check if Alipay mini-program
        const isAlipay = typeof (globalThis as any).my !== 'undefined';
        if (isAlipay) {
          const numIndex = typeof index === 'number' ? index : Math.max(0, urls.indexOf(current));
          return uniObj.previewImage({ current: numIndex, urls });
        }
        return uniObj.previewImage({ current, urls });
      },
      async navigateTo({ url }) {
        const uniObj = (globalThis as any).uni;
        if (uniObj?.navigateTo) return uniObj.navigateTo({ url });
        if (typeof window !== 'undefined') window.location.href = url;
      },
      async switchTab({ url }) {
        const uniObj = (globalThis as any).uni;
        if (uniObj?.switchTab) return uniObj.switchTab({ url });
        if (typeof window !== 'undefined') window.location.href = url;
      },
      async setClipboardData(text) {
        const uniObj = (globalThis as any).uni;
        if (uniObj?.setClipboardData) return uniObj.setClipboardData({ data: text });
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          return navigator.clipboard.writeText(text);
        }
      },
      showToast(title) {
        const uniObj = (globalThis as any).uni;
        if (uniObj?.showToast) {
          uniObj.showToast({ title, icon: 'none' });
        } else if (typeof alert !== 'undefined') {
          alert(title);
        }
      },
      async showModal({ title, content, confirmText = '确定' }) {
        const uniObj = (globalThis as any).uni;
        if (uniObj?.showModal) {
          return new Promise<boolean>((resolve) => {
            uniObj.showModal({
              title,
              content,
              confirmText,
              success: (res: any) => resolve(!!res.confirm),
              fail: () => resolve(false)
            });
          });
        }
        if (typeof confirm !== 'undefined') {
          return confirm(`${title}\n${content}`);
        }
        return true;
      }
    };
  }

  // 3. Web / H5 Default runtime
  return {
    async previewImage({ current }) {
      if (typeof window !== 'undefined') {
        window.open(current, '_blank');
      }
    },
    async navigateTo({ url }) {
      if (typeof window !== 'undefined') {
        window.location.href = url;
      }
    },
    async switchTab({ url }) {
      if (typeof window !== 'undefined') {
        window.location.href = url;
      }
    },
    async setClipboardData(text) {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
    },
    showToast(title) {
      if (typeof alert !== 'undefined') {
        alert(title);
      }
    },
    async showModal({ title, content }) {
      if (typeof confirm !== 'undefined') {
        return confirm(`${title}\n${content}`);
      }
      return true;
    }
  };
}

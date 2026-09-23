/**
 * Mock implementation of @tarojs/taro APIs for web playground preview
 */

export const ENV_TYPE = {
  WEAPP: 'WEAPP',
  WEB: 'WEB',
  RN: 'RN',
  SWAN: 'SWAN',
  ALIPAY: 'ALIPAY',
  TT: 'TT',
  QQ: 'QQ',
  JD: 'JD',
  QUICKAPP: 'QUICKAPP'
};

export const Taro = {
  ENV_TYPE,
  getEnv: () => ENV_TYPE.WEB,

  previewImage: async ({ current, urls }: { current?: string; urls: string[]; index?: number }) => {
    console.log('[Taro.previewImage]', { current, urls });
    // Trigger custom event so playground App.tsx can show image preview
    window.dispatchEvent(
      new CustomEvent('taro:previewImage', {
        detail: { current, urls }
      })
    );
    return { errMsg: 'previewImage:ok' };
  },

  navigateTo: async ({ url }: { url: string }) => {
    console.log('[Taro.navigateTo]', url);
    window.dispatchEvent(
      new CustomEvent('taro:route', {
        detail: { type: 'navigateTo', url }
      })
    );
    return { errMsg: 'navigateTo:ok' };
  },

  switchTab: async ({ url }: { url: string }) => {
    console.log('[Taro.switchTab]', url);
    window.dispatchEvent(
      new CustomEvent('taro:route', {
        detail: { type: 'switchTab', url }
      })
    );
    return { errMsg: 'switchTab:ok' };
  },

  setClipboardData: async ({ data }: { data: string }) => {
    console.log('[Taro.setClipboardData]', data);
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(data);
      }
    } catch (e) {
      // ignore clipboard error in un-focused frames
    }
    window.dispatchEvent(
      new CustomEvent('taro:toast', {
        detail: { title: '已复制到剪贴板' }
      })
    );
    return { errMsg: 'setClipboardData:ok' };
  },

  showToast: ({ title }: { title: string }) => {
    console.log('[Taro.showToast]', title);
    window.dispatchEvent(
      new CustomEvent('taro:toast', {
        detail: { title }
      })
    );
  },

  showModal: async ({ title, content }: { title: string; content: string }) => {
    console.log('[Taro.showModal]', { title, content });
    return new Promise<{ confirm: boolean; cancel: boolean }>((resolve) => {
      window.dispatchEvent(
        new CustomEvent('taro:modal', {
          detail: { title, content, resolve }
        })
      );
    });
  }
};

export default Taro;

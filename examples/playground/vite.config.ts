import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@tarojs/components': path.resolve(__dirname, 'src/taro-mock.tsx'),
      '@tarojs/taro': path.resolve(__dirname, 'src/taro-api-mock.ts'),
      'omni-rich-text/core': path.resolve(__dirname, '../../src/core/index.ts'),
      'omni-rich-text/taro': path.resolve(__dirname, '../../src/taro/index.ts'),
      'omni-rich-text': path.resolve(__dirname, '../../src/core/index.ts'),
      '@universal-rt/core': path.resolve(__dirname, '../../src/core/index.ts'),
      '@universal-rt/taro': path.resolve(__dirname, '../../src/taro/index.ts')
    }
  },
  server: {
    port: 3200,
    open: false
  }
});

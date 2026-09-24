import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/core/index.ts',
    core: 'src/core/index.ts',
    taro: 'src/taro/index.ts',
    'react-native': 'src/react-native/index.ts'
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    'react',
    'react-dom',
    '@tarojs/components',
    '@tarojs/taro',
    'react-native',
    'vue'
  ]
});

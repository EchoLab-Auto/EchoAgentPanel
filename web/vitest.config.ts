import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';
import { extensionEntries, panelExtensions, webRoot } from './extension-build';

export default defineConfig({
  plugins: [vue(), panelExtensions()],
  server: {
    fs: { allow: [webRoot, ...extensionEntries().map((extension) => path.dirname(extension.entry))] },
  },
  test: {
    environment: 'happy-dom',
    include: [
      'src/**/*.test.ts',
      ...extensionEntries().map((extension) => `${path.dirname(extension.entry)}/**/*.test.ts`),
    ],
    // ui-frame 是本地 lib（ESM + CSS side-effect），必须内联给 Vite 转换，
    // 否则 Node 直载 .css 报 "Unknown file extension"。
    server: {
      deps: {
        inline: [/@echolab-auto/],
      },
    },
  },
});

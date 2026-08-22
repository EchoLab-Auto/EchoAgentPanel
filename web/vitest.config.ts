import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
    // ui-frame 是本地 lib（ESM + CSS side-effect），必须内联给 Vite 转换，
    // 否则 Node 直载 .css 报 "Unknown file extension"。
    server: {
      deps: {
        inline: [/@echolab-auto/],
      },
    },
  },
});

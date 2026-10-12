import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // 拆分大依赖（2026-10 加载审计更新）：ui-frame 已改子路径按需导入
        // （不再有 barrel 入口），由 Rollup 按 import/动态 import 边界自然
        // 分包——首屏只含实际使用的组件。此处仅保留 vue 运行时独立 chunk
        // （体积大且版本稳定，单独缓存收益明确）；不再显式分组 ui-frame /
        // markdown：强制分组会把「仅设置页用的组件」拖进首屏 chunk。
        manualChunks: {
          vue: ['vue'],
        },
      },
    },
  },
  server: {
    // Dev: proxy the management WS and REST API to the Rust backend.
    proxy: {
      '/ws': { target: 'ws://127.0.0.1:8080', ws: true },
      '/api': { target: 'http://127.0.0.1:8080', changeOrigin: true },
      // 媒体库（Core 落盘的入站图片；dev 下与生产一致走同源 /media/<id>）
      '/media': { target: 'http://127.0.0.1:8080', changeOrigin: true },
    },
  },
});

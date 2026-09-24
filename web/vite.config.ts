import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // 拆分大依赖：ui-frame（组件库）/ markdown 渲染 / vue 运行时，
        // 避免单 chunk 超 500KB，提升首屏缓存命中率。
        manualChunks: {
          'ui-frame': ['@echolab-auto/ui-frame'],
          'markdown': ['marked', 'dompurify'],
          'vue': ['vue'],
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

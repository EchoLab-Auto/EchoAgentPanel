import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { panelExtensions } from './extension-build';

export default defineConfig({
  plugins: [vue(), panelExtensions()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/ws': { target: 'ws://127.0.0.1:8080', ws: true },
      '/api': { target: 'http://127.0.0.1:8080', changeOrigin: true },
      '/media': { target: 'http://127.0.0.1:8080', changeOrigin: true },
    },
  },
});

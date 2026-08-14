import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true },
  server: {
    // Dev: proxy the management WS to the Rust backend.
    proxy: {
      '/ws': { target: 'ws://127.0.0.1:8080', ws: true },
    },
  },
});

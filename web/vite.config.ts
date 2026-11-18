import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import { panelExtensions } from './extension-build';

/** 本配置文件所在目录（ESM 下没有 `__dirname`）。 */
const webRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * 应用基址。默认 `/`（独立部署在 host 根，行为与历史一致）。
 *
 * 挂到反向代理的子路径下时用环境变量覆盖：
 *
 * ```bash
 * PANEL_BASE=/agent-panel/ npm run build
 * ```
 *
 * 它同时喂给三处，三者必须一致，否则就是「页面加载了但 JS/WS 全 404」：
 *   ① vite 的 `base`（重写 HTML/CSS/动态 import）
 *   ② `import.meta.env.BASE_URL`（`src/base.ts` 里手写路径的前缀来源）
 *   ③ `dist/manifest.webmanifest`（PWA 的 start_url/scope/icons，见下方插件）
 */
const base = normalizeBase(process.env.PANEL_BASE);

/** `agent-panel`、`/agent-panel`、`/agent-panel/` 都归一成 `/agent-panel/`。 */
function normalizeBase(raw: string | undefined): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed || trimmed === '/') return '/';
  return `/${trimmed.replace(/^\/+/, '').replace(/\/+$/, '')}/`;
}

/**
 * 把 `public/manifest.webmanifest` 里的绝对路径改写成带基址的形态。
 *
 * 为什么不能只靠 vite：public 目录是**原样拷贝**，其中的文件不参与 HTML/CSS
 * 的路径重写。不改的话，子路径部署后一旦被「安装到桌面」，`start_url: "/"`
 * 会把应用指回站点根 —— 打开就是别人的页面。
 *
 * 放在 `closeBundle` 而不是 `writeBundle`：public 拷贝发生在写入阶段，必须等
 * 它落盘之后再覆盖。
 */
function rewriteManifest(): Plugin {
  return {
    name: 'echo-panel-manifest-base',
    apply: 'build',
    closeBundle() {
      const file = path.resolve(webRoot, 'dist/manifest.webmanifest');
      let raw: string;
      try {
        raw = readFileSync(file, 'utf8');
      } catch {
        return; // 没有 manifest 的构建直接跳过
      }
      const manifest = JSON.parse(raw) as {
        start_url?: string;
        scope?: string;
        icons?: Array<{ src?: string }>;
      };
      const prefix = (value: string) =>
        value.startsWith('/') ? `${base}${value.slice(1)}` : value;
      if (typeof manifest.start_url === 'string') manifest.start_url = prefix(manifest.start_url);
      if (typeof manifest.scope === 'string') manifest.scope = prefix(manifest.scope);
      for (const icon of manifest.icons ?? []) {
        if (typeof icon.src === 'string') icon.src = prefix(icon.src);
      }
      writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
    },
  };
}

export default defineConfig({
  base,
  plugins: [vue(), panelExtensions(), rewriteManifest()],
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
    // dev server 也跑在 base 之下，所以代理键要带前缀（`/agent-panel/ws`）。
    proxy: {
      [`${base}ws`]: { target: 'ws://127.0.0.1:8080', ws: true },
      [`${base}api`]: { target: 'http://127.0.0.1:8080', changeOrigin: true },
      [`${base}media`]: { target: 'http://127.0.0.1:8080', changeOrigin: true },
    },
  },
});

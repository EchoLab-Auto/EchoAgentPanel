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
 * 它同时喂给三处，三者必须一致，否则就是「页面加载了但 JS/WS 全 404」：
 *   ① vite 的 `base`（重写 HTML/CSS/动态 import）
 *   ② `import.meta.env.BASE_URL`（`src/base.ts` 里手写路径的前缀来源）
 *   ③ `dist/manifest.webmanifest`（PWA 的 start_url/scope/icons，见下方插件）
 *
 * # 取值顺序（2026-11-19 修）
 *
 * 1. `PANEL_BASE` 环境变量（显式覆盖，CI/交叉构建用）；
 * 2. `[server] base_path` —— 从 `PANEL_CONFIG` 或默认的
 *    `~/.config/echo-agent-panel/panel.toml` 读；
 * 3. `/`。
 *
 * **为什么必须回退到配置文件**：构建基址是「构建时」的事，而子路径是
 * 「这台机器的部署形态」。此前只有环境变量一条路，于是 `scripts/update.sh`
 * 里的裸 `npm run build` 会把它构建回 `/` —— 自更新一次，带上
 * `[server] base_path = "/agent-panel"` 的部署就坏一次：HTML 里的资源引用
 * 变回 `/assets/…`，落到站点根被别人的应用接走（或 401），前端一个字节都
 * 加载不出来，页面永远停在 index.html 的启动骨架「网络较慢，仍在努力加载…」。
 *
 * 这个 bug 只在「自更新之后」出现、看起来又像网络问题，极难从表象反推。
 * 让构建自己读配置，任何调用方（手工 / update.sh / install.sh）都自动一致。
 */
const base = normalizeBase(process.env.PANEL_BASE ?? baseFromConfig());

/**
 * 从 panel 配置里读 `[server] base_path`。
 *
 * 手写行解析而不是引 TOML 库：vite 配置跑在构建期的最前面，多一个依赖就多
 * 一份安装失败的可能，而这里只需要一个字符串。读不到（文件不存在、没这个
 * 键、格式不认识）一律当作根部署。
 */
function baseFromConfig(): string | undefined {
  const configPath =
    process.env.PANEL_CONFIG ??
    path.join(process.env.HOME ?? '', '.config/echo-agent-panel/panel.toml');
  let raw: string;
  try {
    raw = readFileSync(configPath, 'utf8');
  } catch {
    return undefined;
  }
  let inServer = false;
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('[')) {
      inServer = trimmed === '[server]';
      continue;
    }
    if (!inServer) continue;
    const match = /^base_path\s*=\s*"([^"]*)"/.exec(trimmed);
    if (match) return match[1];
  }
  return undefined;
}

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

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import sharedEntriesJson from './panel-shared.entries.json';
import {
  assertSharedEntries,
  detailSdkScriptsPlugin,
  importMapPlugin,
} from './panel-shared-build';

/**
 * 面板与 UI 扩展共享的模块（单一真值：`panel-shared.entries.json`）。
 *
 * 每一项都是一个**独立入口**，产物文件名固定（不带 hash）——运行期加载的
 * 扩展用裸标识符 import 它们，靠 index.html 里的 import map 解析到这些 URL。
 * 名字带 hash 会让扩展每次面板重建后都失效。
 */
const sharedEntries: Array<{ id: string; file: string; output: string }> =
  sharedEntriesJson.entries;

/** 本配置文件所在目录（ESM 下没有 `__dirname`）。 */
const webRoot = path.dirname(fileURLToPath(import.meta.url));

/** 共享入口的 chunk 名：`output` 里的 `/` 不能出现在 chunk 名里，改用序号。 */
function sharedChunkName(index: number): string {
  return `panel-shared-${index}`;
}

/** chunk 名 → 固定产物路径（非共享入口返回 `null`，走默认 hash 命名）。 */
function fixedOutputName(chunkName: string): string | null {
  const match = /^panel-shared-(\d+)$/.exec(chunkName);
  if (!match) return null;
  return sharedEntriesJson.entries[Number(match[1])]?.output ?? null;
}

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
  plugins: [
    // 构建期快速失败：清单自身不一致时宁可构建失败，也不要产出一个"扩展永远
    // 加载不了"的面板（那比构建失败难查得多）。
    {
      name: 'echo-panel-shared-check',
      configResolved() {
        assertSharedEntries(sharedEntries);
      },
    },
    vue(),
    importMapPlugin({
      base,
      entries: sharedEntries,
      sdkVersion: sharedEntriesJson.sdkVersion,
    }),
    detailSdkScriptsPlugin({
      base,
      entries: sharedEntries,
      sdkVersion: sharedEntriesJson.sdkVersion,
    }),
    rewriteManifest(),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    /**
     * **单一 CSS 文件**（2026-11，运行期加载扩展的前提）。
     *
     * 默认的分包模式会把组件的 `<style>` 抽成独立 CSS，并在 JS chunk 里留下
     * `import "./x.css"`——浏览器原生 ES 模块**不支持 import CSS**。壳自己
     * 构建时无所谓（vite 把 CSS 提进 `<link>` 并删掉那些语句），但运行期
     * `import()` 一个独立产物时，那些语句会直接抛错、扩展整块加载失败。
     *
     * 关掉分包后所有 CSS 进一个文件、由 index.html 的 `<link>` 引入，任何 JS
     * 产物都不再含 CSS import。代价是首屏多下载各弹层的样式（未压缩约
     * 800 KB，gzip 后约 70 KB，局域网部署无感），换运行期加载的确定性。
     */
    cssCodeSplit: false,
    rollupOptions: {
      /**
       * **多入口 + 保留入口签名**。
       *
       * 为什么不用 `manualChunks`：那种方式下共享 chunk 的导出由"壳有没有
       * 用到"决定。`registerPanelExtension` 在壳里没有调用方（扩展改为运行期
       * 加载后壳不再自己注册任何扩展），于是它会被 tree-shake 掉——扩展
       * `import { registerPanelExtension }` 拿到 `undefined`，一加载就崩，
       * 而构建成功、产物看起来正常。
       *
       * 入口 + `preserveEntrySignatures: 'strict'` 保证每个共享模块的**全部**
       * 导出都在，这正是 import map 需要的东西。代价是 vite 会把每个 JS 入口
       * 也注入成页面 script——那些标签由 `detailSdkScripts` 插件从 HTML 里摘掉
       * （chunk 本身仍生成，由壳的产物 import）。
       */
      preserveEntrySignatures: 'strict',
      input: {
        index: path.resolve(webRoot, 'index.html'),
        ...Object.fromEntries(
          sharedEntries.map((entry, index) => [
            sharedChunkName(index),
            path.resolve(webRoot, entry.file),
          ]),
        ),
      },
      output: {
        /**
         * **不要缩短内部导出名**（运行期加载扩展的必要条件）。
         *
         * rollup 默认会把 chunk 之间的导出名压成 `a` / `b` / `c`
         * （`minifyInternalExports`），import 方用短名对上——那是"两边同时
         * 构建"才成立的约定。运行期加载的扩展是**独立构建**的，它写的是
         * `import { ref } from 'vue'`，而 `panel-vue.js` 只有 `a`、`b`；
         * 每个具名导入都会是 `undefined`，扩展在顶层就崩。
         */
        minifyInternalExports: false,
        /**
         * 共享模块产物**固定文件名**（`assets/panel-sdk.js` 等）。
         *
         * 扩展构建时把 `@echo-agent/panel` 等 externalize 掉、运行时靠 import
         * map 解析——名字一变，所有已构建的扩展立刻失联。其余 chunk 保留
         * hash：它们只被面板自己的产物引用，重建后自然更新。
         */
        entryFileNames: (chunk) => {
          const fixed = fixedOutputName(chunk.name);
          return fixed ? `assets/${fixed}` : 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
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

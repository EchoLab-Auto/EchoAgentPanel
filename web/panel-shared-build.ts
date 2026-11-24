//! 把 import map 注入 index.html（运行期加载 UI 扩展的前提）。
//!
//! ## 为什么需要 import map
//!
//! 扩展产物是**标准 ES 模块**，里面写的是裸标识符：
//!
//! ```js
//! import { ref } from 'vue';
//! import { registerPanelExtension } from '@echo-agent/panel';
//! import NeumorphismButton from '@echolab-auto/ui-frame/components/NeumorphismButton';
//! ```
//!
//! 浏览器不认识裸标识符，只有 `<script type="importmap">` 能告诉它去哪找。
//! 目标必须是**固定文件名**（`assets/panel-sdk.js` 而非 `panel-sdk-abc123.js`），
//! 否则面板每次重建，所有已构建的扩展就全失联。
//!
//! ## 为什么单个共享实例这么重要
//!
//! 每一项都映射到**壳自己那份**产物：`vue` 指向 `panel-vue.js`，
//! `@echo-agent/panel` 指向 `panel-sdk.js`（壳的 `extension-api` 入口）。
//! 于是扩展 `import { state }` 拿到的是壳的那个响应式单例，不是自己的一份副本
//! ——两份 vue 或两份 store 的表现是"界面渲染了但永远不更新"，极难反推。
//!
//! ## 版本握手
//!
//! 注入 `<meta name="panel-ui-sdk" content="N">`：运行期加载器在 import 任何
//! 扩展前先读它，与扩展产物里写死的版本比对。不一致就拒绝整批加载并给出可读
//! 原因——UI 扩展在运行期加载，API 用错不会在构建期报错，只会在用户浏览器里
//! 崩。

import path from 'node:path';
import type { Plugin } from 'vite';

export interface SharedEntry {
  /** 裸标识符（扩展源码里写的那个）。 */
  id: string;
  /** 源码文件（相对 web 根）。 */
  file: string;
  /** 固定产物路径（相对 `assets/`）。 */
  output: string;
}

export interface ImportMapOptions {
  /** 应用基址（`/` 或 `/agent-panel/`，已规范化带尾斜杠）。 */
  base: string;
  entries: SharedEntry[];
  /** SDK 契约版本（与 `panel-shared.entries.json` 的 `sdkVersion` 一致）。 */
  sdkVersion?: string;
}

/**
 * 生成 import map 的 `imports` 表。
 *
 * 抽成导出函数是为了让测试能直接比对"标识符 → URL"的映射，而不是解析 HTML
 * 字符串（那种断言在格式化变化时会假失败）。
 */
export function importMapImports(base: string, entries: SharedEntry[]): Record<string, string> {
  const imports: Record<string, string> = {};
  for (const entry of entries) {
    // 基址已规范化带尾斜杠（见 vite.config.ts 的 normalizeBase）。
    imports[entry.id] = `${base}assets/${entry.output}`;
  }
  return imports;
}

export function importMapPlugin(options: ImportMapOptions): Plugin {
  const imports = importMapImports(options.base, options.entries);
  const sdkVersion = options.sdkVersion ?? '1';
  return {
    name: 'echo-panel-import-map',
    // `pre`：import map 必须在任何 `<script type="module">` **之前**出现。
    // vite 默认把注入的 script 放在 head 末尾，而 HTML 入口的 module script
    // 也在 head——顺序由这个钩子的执行序决定，`pre` 保证我们排在前面。
    enforce: 'pre',
    transformIndexHtml(html) {
      const map = JSON.stringify({ imports }, null, 2);
      const tag = `  <script type="importmap">\n${map}\n  </script>\n  <meta name="panel-ui-sdk" content="${sdkVersion}">\n`;
      // 注入到 `<head>` 之后：vite 的 module script 也在 head 里，但 HTML 解析
      // 顺序保证先出现的 import map 生效。没有 head 标签时退化为插到文件开头。
      if (html.includes('<head>')) {
        return html.replace('<head>', `<head>\n${tag}`);
      }
      return `${tag}${html}`;
    },
  };
}

/**
 * 校验共享入口清单自身的一致性（构建期快速失败）。
 *
 * 三个已知坏形态：
 * 1. 同一个裸标识符映射到两个文件 → import map 后者覆盖前者，静默丢一个；
 * 2. 产物路径带 hash 或落在 `assets/` 之外 → 运行期 URL 与 import map 不符；
 * 3. 缺 `vue` 或 `@echo-agent/panel` 两项 → 任何扩展都加载不起来。
 *
 * 由 vite 插件在 `configResolved` 里调用：宁可构建失败，也不要产出一个
 * "扩展永远加载不了"的面板。
 */
export function assertSharedEntries(entries: SharedEntry[]): void {
  const ids = new Set<string>();
  const outputs = new Set<string>();
  for (const entry of entries) {
    if (!entry.id || !entry.file || !entry.output) {
      throw new Error(`panel-shared 入口缺字段: ${JSON.stringify(entry)}`);
    }
    if (ids.has(entry.id)) throw new Error(`panel-shared 重复的裸标识符: ${entry.id}`);
    ids.add(entry.id);
    if (outputs.has(entry.output)) throw new Error(`panel-shared 重复的产物路径: ${entry.output}`);
    outputs.add(entry.output);
    if (!entry.output.endsWith('.js') || entry.output.includes('hash')) {
      throw new Error(`panel-shared 产物必须是固定 .js 路径（不能带 hash 占位）: ${entry.output}`);
    }
    if (path.isAbsolute(entry.output) || entry.output.split('/').includes('..')) {
      throw new Error(`panel-shared 产物路径必须相对且不能越界: ${entry.output}`);
    }
  }
  for (const required of ['vue', '@echo-agent/panel']) {
    if (!ids.has(required)) {
      throw new Error(`panel-shared 缺必需项 ${required}（任何扩展都加载不起来）`);
    }
  }
}

/**
 * 从 index.html 里摘掉**共享模块入口**的 `<script>` / modulepreload 标签。
 *
 * ## 为什么要摘
 *
 * 共享模块必须做成 rollup **入口**（否则导出会被 tree-shake，见
 * `vite.config.ts` 的 `preserveEntrySignatures`）。而 vite 的多入口语义是
 * "多页应用"——它会把每个 JS 入口都注入成页面 `<script type="module">`。
 *
 * 那些 `<script>` 在语义上是错的：共享 chunk 不是页面入口，它们由壳自己的
 * 产物 import（`import "./panel-sdk.js"`）。留着不会出错（同一 URL 只求值
 * 一次），但会让 HTML 里堆 10 个 script 标签、并在首屏多发 10 个请求。
 *
 * ## 为什么按产物路径而不是按 chunk 名匹配
 *
 * HTML 里只有**产物 URL**，没有 chunk 名。按 URL 匹配也顺带保证：将来共享
 * 清单增删条目时这里不需要改（同源于 `entries`）。
 */
export function detailSdkScriptsPlugin(options: ImportMapOptions): Plugin {
  const suffixes = options.entries.map((entry) => `assets/${entry.output}`);
  return {
    name: 'echo-panel-detail-sdk-scripts',
    /**
     * `enforce: 'post'`：必须排在 `vite:build-html` **之后**——HTML 的
     * `<script>` 注入是它做的（它的 order 也是 post），先跑的用户插件看到的是
     * 还没有 script 标签的 HTML，删了个寂寞（实测两次）。
     */
    enforce: 'post',
    /**
     * 用 `generateBundle` 而不是 `transformIndexHtml`：vite 的
     * `vite:build-html` 在**它的** `transformIndexHtml`（order: post）里注入
     * 入口 script，比任何用户插件都晚。`transformIndexHtml` 里删等于没删
     * （下次注入又把它们加回来），实测确认。
     */
    generateBundle(_options, bundle) {
      for (const asset of Object.values(bundle)) {
        if (asset.type !== 'asset' || !asset.fileName.endsWith('.html')) continue;
        // 按**行**过滤而不是正则：vite 注入的标签一行一个，而正则要同时照顾
        // 属性顺序、`crossorigin`、换行——实测正则漏掉了一半（`panel-components`
        // 与 `ui-frame` 那些）。行过滤只需判断"这行引用了共享产物且是
        // script/modulepreload"。
        const kept = String(asset.source)
          .split('\n')
          .filter((line) => {
            const trimmed = line.trim();
            const isScript = trimmed.startsWith('<script') || trimmed.startsWith('<link');
            if (!isScript) return true;
            return !suffixes.some((suffix) => line.includes(suffix));
          });
        asset.source = kept.join('\n');
      }
    },
  };
}

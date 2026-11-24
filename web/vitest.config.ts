import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * 测试配置（2026-11 起**只跑面板自己的测试**）。
 *
 * 此前这里还要把外部 UI 扩展的源码目录挂进 `include`（为 `panelExtensions()`
 * 那个虚拟模块服务）。扩展改成运行期加载以后，面板不再编译扩展源码，因此
 * 那部分全部去掉——扩展的测试归各自的模块仓（`panel-ui/` 自己的 npm test）。
 *
 * 这也顺带修掉一个隐患：以前 `PANEL_UI_EXTENSIONS` 没配时 `include` 只剩
 * 面板自己的测试，配了才多出几组——同一个 `npm test` 在不同机器上跑的东西
 * 不一样。
 */
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

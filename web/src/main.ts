import { createApp } from 'vue';
import NeumorphismUI from '@echolab-auto/ui-frame';
import App from './App.vue';
import { hydrateTrunkCache, installTrunkCacheAutosave } from './trunk-cache';
import './styles.css';

// 挂载前还原上次的时间线快照（2026-09 刷新加速）：首屏直接渲染缓存，
// 网络请求只补缺口（引导请求带 since_seq，见 connection.ts）。
hydrateTrunkCache();
installTrunkCacheAutosave();

createApp(App)
  .use(NeumorphismUI, {
    // zh-CN 本就是内建默认 locale（DEFAULT_LOCALE = zhCN），此处仅作显式文档。
    locale: 'zh-CN',
    chat: { markdown: true, autoScroll: true, scrollThreshold: 120 },
    toast: { position: 'top-right', maxCount: 8 },
  })
  .mount('#app');

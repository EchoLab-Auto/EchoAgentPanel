import { computed, createApp } from 'vue';
// ui-frame 基础样式（设计令牌 --nm-* + 通用 keyframes��——必须先于组件
// 样式与 styles.css 加载。注意这是子路径直引（非 barrel）：barrel 的
// `app.use(NeumorphismUI)` 会全局注册 58 个组件、把整库 JS/CSS 拖进首包
// （2026-10 加载审计：ui-frame chunk 282→118KB、CSS 254→按需 的根因）。
import '@echolab-auto/ui-frame/dist/ui-frame.css';
import {
  ConfigKey,
  type NeumorphismGlobalConfig,
} from '@echolab-auto/ui-frame/composables/useConfig';
import App from './App.vue';
import { hydrateTrunkCache, installTrunkCacheAutosave } from './trunk-cache';
import { startUpstreamsPolling } from './upstreams';
import './styles.css';

// 挂载前还原上次的时间线快照（2026-09 刷新加速）：首屏直接渲染缓存，
// 网络请求只补缺口（引导请求带 since_seq，见 connection.ts）。
hydrateTrunkCache();
installTrunkCacheAutosave();
// 上游 Core 连接状态（连接状态卡 / 设置页共用）：启动即轮询。
startUpstreamsPolling();

const app = createApp(App);

// 全局配置：等价于原 `app.use(NeumorphismUI, {...})` 的 provide 部分
// （install 的另一半是组件全局注册，已由「子路径按需导入」取代——所有
// 组件均显式导入，不再依赖全局注册）。config 是注入型依赖，不经 provide
// 则组件读不到（useConfig 默认空对象）。
const globalConfig = {
  // zh-CN 本就是内建默认 locale（DEFAULT_LOCALE = zhCN），此处仅作显式文档。
  locale: 'zh-CN',
  // `chat` 为 ui-frame chat 组合的历史配置位（类型未声明、运行时消费）；
  // Panel 自组消息渲染不依赖它，保留以维持与原 app.use 传参等价。
  chat: { markdown: true, autoScroll: true, scrollThreshold: 120 },
  toast: { position: 'top-right' as const, maxCount: 8 },
};
app.provide(ConfigKey, computed(() => globalConfig as NeumorphismGlobalConfig));

app.mount('#app');

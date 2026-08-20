import { createApp } from 'vue';
import NeumorphismUI from '@echolab-auto/ui-frame';
import App from './App.vue';
import './styles.css';

createApp(App)
  .use(NeumorphismUI, {
    // zh-CN 本就是内建默认 locale（DEFAULT_LOCALE = zhCN），此处仅作显式文档。
    locale: 'zh-CN',
    chat: { markdown: true, autoScroll: true, scrollThreshold: 120 },
    toast: { position: 'top-right', maxCount: 8 },
  })
  .mount('#app');

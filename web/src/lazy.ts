//! 统一懒加载助手 + chunk 加载失败兜底（2026-10 弹层空白故障）。
//!
//! 背景：标签页在某次部署**之前**加载（旧 bundle 在内存中），之后点开任何
//! `defineAsyncComponent` 入口都会请求**旧哈希 chunk**——新部署里已不存在。
//! 旧后端把缺失文件回成 index.html（MIME 错误），新后端回 404；两种情况下
//! 动态 import 都会失败，而裸 `defineAsyncComponent` 失败后组件永不挂载
//! （弹层空白、面板卡住，Vue 只打 warn）。
//!
//! 策略：
//! - 识别 chunk 加载失败 → 自动 `location.reload()` 一次拿新 index.html；
//! - 防循环：sessionStorage 记最近一次自动重载时间，10s 内只允许一次；
//!   超出（或非 chunk 类错误）→ 渲染内联错误组件（「刷新」+「重试」）。
//! - `installChunkErrorGuard()` 在 window 上兜住非异步组件路径
//!   （入口预加载失败、`vite:preloadError`、未处理的 import rejection）。

import {
  defineAsyncComponent,
  defineComponent,
  getCurrentInstance,
  h,
  ref,
  shallowRef,
  type AsyncComponentLoader,
  type Component,
} from 'vue';

/** sessionStorage 键：最近一次因 chunk 失败自动重载的时间戳（ms）。 */
export const RELOAD_STAMP_KEY = 'echo-panel-chunk-reload-at';
/** 自动重载防循环窗口：窗口内只自动重载一次。 */
export const RELOAD_WINDOW_MS = 10_000;

const CHUNK_ERROR_PATTERNS = [
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'error loading dynamically imported module',
  'MIME type of "text/html"',
  'Unable to preload CSS',
];

/** 是否为「chunk/模块脚本加载失败」类错误（各浏览器文案不同）。 */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const message =
    typeof error === 'string'
      ? error
      : String((error as { message?: unknown }).message ?? error);
  return CHUNK_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

// ── 可注入依赖（单测替换 reload / 时钟） ──
type Deps = { reload: () => void; now: () => number };
const defaultDeps: Deps = {
  reload: () => window.location.reload(),
  now: () => Date.now(),
};
let deps: Deps = { ...defaultDeps };

/** 测试钩子：替换 reload / now；传空对象恢复默认。 */
export function __setLazyDeps(overrides: Partial<Deps>): void {
  deps = { ...defaultDeps, ...overrides };
}

function readStamp(): number {
  try {
    return Number(sessionStorage.getItem(RELOAD_STAMP_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

/**
 * 尝试一次性自动重载：窗口内未重载过 → 记时间戳并 reload，返回 true；
 * 否则返回 false（调用方应改为展示错误提示）。sessionStorage 不可用时
 * 不自动重载（无法防循环）。
 */
export function tryAutoReload(): boolean {
  const now = deps.now();
  const last = readStamp();
  if (last && now - last < RELOAD_WINDOW_MS) return false;
  try {
    sessionStorage.setItem(RELOAD_STAMP_KEY, String(now));
  } catch {
    return false;
  }
  deps.reload();
  return true;
}

/**
 * 内联错误组件：提示 +「刷新」+「重试」。「重试」直接重跑 loader，成功后
 * 就地渲染加载到的组件（父组件持有的 async 组件引用不变）。
 */
function makeErrorComponent<T extends Component>(
  loader: AsyncComponentLoader<T>,
  name: string | undefined,
): Component {
  return defineComponent({
    name: name ? `LazyError${name}` : 'LazyError',
    props: { error: { type: null, default: null } },
    setup(props) {
      // Vue 只给 errorComponent 传 `{ error }`；重试成功后需要按 async
      // wrapper 收到的原始 props/slots 渲染（与 Vue 内部 createInnerComp 一致）。
      const wrapper = getCurrentInstance()?.parent ?? null;
      const loaded = shallowRef<Component | null>(null);
      const retrying = ref(false);
      const retry = () => {
        if (retrying.value) return;
        retrying.value = true;
        Promise.resolve()
          .then(() => loader())
          .then((mod) => {
            loaded.value =
              (mod as { default?: Component }).default ?? (mod as unknown as Component);
          })
          .catch((error) => {
            console.warn(`[lazy] retry failed${name ? ` (${name})` : ''}`, error);
          })
          .finally(() => {
            retrying.value = false;
          });
      };
      return () => {
        if (loaded.value) {
          const vnode = wrapper?.vnode;
          return h(loaded.value, vnode?.props ?? null, (vnode?.children as never) ?? undefined);
        }
        const chunk = isChunkLoadError(props.error);
        return h('div', { class: 'lazy-load-error', role: 'alert' }, [
          h(
            'span',
            { class: 'lazy-load-error__text' },
            chunk ? '界面资源已更新，请刷新页面' : '组件加载失败，请刷新页面',
          ),
          h(
            'button',
            { type: 'button', class: 'lazy-load-error__btn', onClick: () => deps.reload() },
            '刷新',
          ),
          h(
            'button',
            {
              type: 'button',
              class: 'lazy-load-error__btn',
              disabled: retrying.value,
              onClick: retry,
            },
            retrying.value ? '重试中…' : '重试',
          ),
        ]);
      };
    },
  });
}

/**
 * `defineAsyncComponent` 的替代：chunk 加载失败时一次性自动重载，
 * 其余失败（或窗口内二次失败）渲染内联错误组件。
 */
export function lazy<T extends Component = Component>(
  loader: AsyncComponentLoader<T>,
  name?: string,
): T {
  return defineAsyncComponent({
    loader,
    errorComponent: makeErrorComponent(loader, name),
    onError(error, _retry, fail) {
      if (isChunkLoadError(error) && tryAutoReload()) {
        // 已触发整页重载：保持挂起（页面即将卸载），不闪错误态。
        return;
      }
      console.warn(`[lazy] failed to load component${name ? ` ${name}` : ''}`, error);
      fail();
    },
  });
}

/**
 * 预热一个懒加载组件的 chunk（不挂载）。
 *
 * 为什么需要：覆盖面板是 `v-if="open"`，组件要到**点开那一刻**才开始下载
 * ——实测 3G 下点开工作区有 871ms、弱网 800ms RTT 下有 2104ms 的纯空白期
 * （连标题栏都没有，因为标题也在那个 chunk 里）。这段时间与"卡死"无法区分。
 *
 * 做法：在**空闲**或**指针移到入口按钮上**时提前把 chunk 拉下来；真正点开
 * 时组件已在模块缓存里，`defineAsyncComponent` 同步解析、零等待。
 *
 * 幂等：模块缓存由浏览器/打包器负责，重复调用只会在首次真正发请求。
 * 失败**吞掉**——预热是尽力而为，真正的错误提示由挂载时的 `lazy` 错误组件
 * 负责（提前报错反而会打断用户正在做的事）。
 */
export function preloadLazy(loader: AsyncComponentLoader): void {
  try {
    const pending = loader();
    if (pending && typeof (pending as Promise<unknown>).then === 'function') {
      (pending as Promise<unknown>).catch(() => {
        /* 交给挂载时的错误组件处理 */
      });
    }
  } catch {
    /* 同上 */
  }
}

let guardInstalled = false;

/**
 * 全局兜底：非异步组件路径的 chunk 失败（入口预加载、`vite:preloadError`、
 * 未处理的动态 import rejection、module script 加载 error 事件）同样走
 * 一次性自动重载。幂等。
 */
export function installChunkErrorGuard(): void {
  if (guardInstalled || typeof window === 'undefined') return;
  guardInstalled = true;
  // Vite 内建：预加载依赖失败时派发（可 preventDefault 阻止抛出）。
  window.addEventListener('vite:preloadError', (event) => {
    const payload = (event as Event & { payload?: unknown }).payload;
    if (tryAutoReload()) event.preventDefault();
    else console.warn('[lazy] preload error (auto-reload suppressed)', payload);
  });
  window.addEventListener('unhandledrejection', (event) => {
    if (isChunkLoadError(event.reason)) tryAutoReload();
  });
  window.addEventListener(
    'error',
    (event) => {
      if (isChunkLoadError((event as ErrorEvent).error ?? (event as ErrorEvent).message)) {
        tryAutoReload();
      }
    },
    true,
  );
}

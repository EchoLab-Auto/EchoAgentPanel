//! 运行期加载面板 UI 扩展。
//!
//! ## 它替掉的路径
//!
//! 2026-11 之前，模块 UI 靠 `PANEL_UI_EXTENSIONS` 在**构建期**编进 Panel：改一行
//! 就要重建整个面板，忘了配环境变量就静默变成纯壳（模块在 Core 里挂着、界面上
//! 一个入口都没有）。现在反过来——模块自己 `npm run build` 出一个 ES bundle，
//! `mount` 时向 Core 登记 URL，面板启动后按需 `import()`。
//!
//! ## 三步，每步都可能失败且各有可读原因
//!
//! 1. **拉清单**：面板服务 `echo-agent.panel-ui.list`（走 `InvokeService` 通道）。
//! 2. **版本握手**：清单顶层的 `sdk_version` 与本地常量比对。不一致直接放弃
//!    整批——继续加载只会得到 N 个互不相干的崩溃。
//! 3. **逐条 import**：每条各自校验版本再加载；**单条失败不拖累其它**
//!    （一个模块的构建产物坏了，不该让别的模块 UI 一起消失）。
//!
//! ## 为什么失败不抛给调用方
//!
//! 加载发生在启动路径上。抛出去会打断 `App.vue` 的 setup，整个面板白屏——
//! 而"某个模块的 UI 没加载"只该失去那个模块的入口。所以这里把失败收进
//! [`setPanelUiStatus`]（设置页可见），`console.error` 留原始错误。

import { watch } from 'vue';
import { invokeService } from './panel-services';
import { state } from './store';
import {
  panelUiStatus,
  setPanelUiStatus,
  type PanelUiContribution,
  type PanelUiStatus,
} from './panel-ui-status';

/** 清单服务名（与 Core 的 `core::panel_ui::SERVICE_NAME` 一致）。 */
export const PANEL_UI_SERVICE = 'echo-agent.panel-ui';

/**
 * 本地 SDK 契约版本。
 *
 * 从构建期注入的 `<meta name="panel-ui-sdk">` 读——它由 vite 插件按
 * `panel-shared.entries.json` 的 `sdkVersion` 写进 index.html。读不到时回落
 * `'1'`：正常构建不会发生，回落值只为让 dev server（不经插件注入时）能跑。
 */
function localSdkVersion(): string {
  const meta = document.querySelector('meta[name="panel-ui-sdk"]');
  const value = meta?.getAttribute('content')?.trim();
  return value && value.length > 0 ? value : '1';
}

/** 清单回执的形状（与 Core 侧 `CorePanelUiService::invoke` 一致）。 */
interface PanelUiListData {
  sdk_version?: string;
  extensions?: PanelUiContribution[];
}

/**
 * 动态 import 一个 URL 的默认实现。
 *
 * 抽成可替换的一层（`loadPanelExtensions({ load })`）而不是在实现里写死：
 * 单测没法让浏览器/Node 真的去拉一个不存在的 URL，而"某条失败不影响其它"
 * 正是这条路径最难人工验证的部分——真出问题只会在用户浏览器里表现成
 * "某个模块的入口没了"。
 */
export type BundleLoader = (url: string) => Promise<unknown>;

const defaultLoader: BundleLoader = (url) => import(/* @vite-ignore */ url);

export interface LoadPanelExtensionsOptions {
  /** 替换动态 import（测试注入；生产走 [`defaultLoader`]）。 */
  load?: BundleLoader;
}

/**
 * 拉清单并加载全部扩展。
 *
 * 幂等：重复调用只会加载**新增**的条目（服务回包可能因重连重复到达）。
 * 返回本次新加载的数量。
 */
export async function loadPanelExtensions(
  options: LoadPanelExtensionsOptions = {},
): Promise<number> {
  const load = options.load ?? defaultLoader;
  // 「已加载」的唯一真值是 `panelUiStatus.loaded`（设置页显示的就是它）。
  // 不另存一份模块级 Set：两份状态迟早不同步，表现是"设置页说加载了、
  // 实际又 import 了一次"，而重复 import 会让扩展的 `registerPanelExtension`
  // 抛 duplicate（整块 UI 消失）。
  const loaded = new Set(panelUiStatus.value.loaded);
  const sdk = localSdkVersion();
  let data: PanelUiListData | null;
  try {
    data = (await invokeService(PANEL_UI_SERVICE, 'list')) as PanelUiListData | null;
  } catch (error) {
    // 服务不可用（老 Core / 嵌入式部署 / 连接未就绪）：不是错误路径，只是
    // "这个部署没有运行期 UI 扩展"。phase = unavailable，设置页据此不报警。
    setPanelUiStatus({
      phase: 'unavailable',
      sdk,
      loaded: [...loaded],
      failed: [],
      reason: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
  const remoteSdk = (data?.sdk_version ?? '').trim();
  if (remoteSdk && remoteSdk !== sdk) {
    // 整批拒绝：版本不符时继续加载只会得到 N 个互不相干的崩溃，而每个崩溃的
    // 位置都与真实原因（版本）无关。
    const reason =
      `面板 UI SDK 版本不匹配：面板 ${sdk}，Core ${remoteSdk}。` +
      '通常是面板与本机模块产物不同步，重新构建面板与模块即可。';
    console.error('[panel-ui]', reason);
    setPanelUiStatus({ phase: 'version-mismatch', sdk, loaded: [...loaded], failed: [], reason });
    return 0;
  }
  const contributions = data?.extensions ?? [];
  let count = 0;
  const failed: PanelUiStatus['failed'] = [];
  for (const contribution of contributions) {
    if (loaded.has(contribution.id)) continue;
    const error = await loadOne(contribution, sdk, load);
    if (error) failed.push({ id: contribution.id, reason: error });
    else {
      loaded.add(contribution.id);
      count += 1;
    }
  }
  setPanelUiStatus({
    // 用 `loaded.size` 而不是本次的 `count` 判 partial：增量加载时（上一次
    // 已成功 N 条）本次只失败一条，`count` 会是 0，但"有成功的"才是用户的
    // 真实处境。
    phase: failed.length ? (loaded.size ? 'partial' : 'failed') : 'ready',
    sdk,
    loaded: [...loaded],
    failed,
    reason: failed.length ? `${failed.length} 个扩展加载失败` : '',
  });
  return count;
}

/**
 * 加载单条贡献；返回失败原因（`null` = 成功）。
 *
 * 版本先比再 import：一个用旧 SDK 构建的 bundle 可能在被 import 的瞬间就抛
 * （顶层调用了已删除的导出），那时错误信息会指向 bundle 内部某行，与真实
 * 原因（版本）毫无关系。
 */
async function loadOne(
  contribution: PanelUiContribution,
  sdk: string,
  load: BundleLoader,
): Promise<string | null> {
  const own = (contribution.sdk_version ?? '').trim();
  if (own !== sdk) {
    return (
      `该模块的 UI 用 SDK ${own || '(空)'} 构建，面板是 ${sdk}；` +
      '需要重新构建该模块（npm run build）'
    );
  }
  const url = bundleUrl(contribution.bundle);
  try {
    await load(url);
    return null;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[panel-ui] 加载 ${contribution.id} 失败（${url}）`, error);
    return `${reason}（${url}）`;
  }
}

/**
 * bundle 的**站点相对路径** → 可 import 的 URL。
 *
 * Core 只接受相对路径（`panel-extensions/<id>/index.js`），拼上应用基址即可。
 * 子路径部署（`/agent-panel/`）下必须带前缀，否则请求落到站点根上别人的应用。
 */
export function bundleUrl(bundle: string): string {
  const base = import.meta.env.BASE_URL; // 恒以 `/` 结尾
  return `${base}${bundle.replace(/^\/+/, '')}`;
}

/**
 * 首连未拿到清单时的重试节奏。
 *
 * 为什么要按时间重试而不是「等下次重连」：Core 重启后浏览器往往**一次就连上**
 * （WebSocket 监听比模块装配早几百毫秒），此后 `connected` 长期为 true——只挂
 * 在重连上等于永不重试。而模块服务表没就绪时 `InvokeService` 必然失败，正是
 * 这个窗口内的常态。
 */
const RETRY_DELAYS_MS = [400, 1200, 3000] as const;

/**
 * 启动加载（拿到清单为止）。
 *
 * 为什么要等连接：`InvokeService` 需要 WS 就绪。握手期 `sendCommand` 虽然会
 * 排队，但清单是"一次基线"，排在首帧之后更稳（也避免和 `RequestState` 抢带宽）。
 *
 * ## 为什么不能"首连试一次就收工"（2026-11「工作区 UI 整块消失」）
 *
 * 此前的写法是首连触发一次 `loadPanelExtensions()` 后立刻 `stop()` 掉 watcher。
 * 于是 Core 刚重启的那一小段（模块服务表尚未就绪）首连的页面会拿到
 * `phase = 'unavailable'`，然后**再也不会重试**——所有运行期 UI 扩展（工作区
 * 的文件浏览器卡 / Git 卡 / 工作区会话管理入口）整块消失，用户只能靠手动刷新
 * 页面自救。`loadPanelExtensions` 本身明确是幂等的（只加载新增条目），一次
 * 性守卫没有存在的理由。
 *
 * 现在的收敛条件：拿到清单（`ready` / `partial` / `failed` /
 * `version-mismatch`）就收工；只有 `unavailable`（服务不可用）才按
 * {@link RETRY_DELAYS_MS} 重试，用尽后挂回 watcher 等下一次重连。
 */
export function startPanelUiLoading(): void {
  /** 收工标志：拿到清单后置位，此后不再打服务端。 */
  let done = false;
  /** watcher 的停止函数；先占位再替换，避开 `immediate` 首轮回调的 TDZ。 */
  let stopWatch: () => void = () => {};
  let attempts = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function finish() {
    done = true;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    stopWatch();
  }

  function attempt() {
    if (done) return;
    timer = null;
    void loadPanelExtensions().then(() => {
      if (done) return;
      const phase = panelUiStatus.value.phase;
      // unavailable = 服务还没就绪；其余状态都表示「清单已拿到」——重试只会
      // 重复同一个失败（坏 bundle / 版本不符），没有意义。
      if (phase !== 'unavailable') {
        finish();
        return;
      }
      if (attempts < RETRY_DELAYS_MS.length) {
        timer = setTimeout(attempt, RETRY_DELAYS_MS[attempts]);
        attempts += 1;
        return;
      }
      // 用尽：把 watcher 留着，等断线重连时再来一轮（首连时就断过的部署）。
      attempts = 0;
    });
  }

  stopWatch = watch(
    () => state.connected,
    (connected) => {
      if (!connected || done) return;
      attempt();
    },
    { immediate: true },
  );
  // 首轮就命中（页面加载时已连上）：watcher 的回调已经跑过，这里不必再停——
  // `finish()` 会在拿到清单时停。
}

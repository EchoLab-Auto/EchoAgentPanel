//! 运行期 UI 扩展加载（`extension-loader.ts` + `panel-ui-status.ts`）的契约。
//!
//! ## 为什么这些测试值得写
//!
//! 这条路径的失败**全是静默的**：manifest 拉不到 → 面板看上去只是"没有模块
//! 入口"；版本不符 → 同上；`import()` 抛错 → 只有浏览器控制台。2026-11 那次
//! 就是这样查了半天（模块在 Core 里挂着、界面上什么都没有、构建与启动都不报错）。
//!
//! 所以这里逐条钉住"哪种情况归到哪个 phase"，以及"失败不拖累别的扩展"。

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** `invokeService` 的替身：由每个用例设置返回值 / 抛错。 */
let serviceResult: unknown = null;
let serviceError: Error | null = null;
const calls: Array<{ service: string; method: string }> = [];

vi.mock('../panel-services', () => ({
  invokeService: (service: string, method: string) => {
    calls.push({ service, method });
    if (serviceError) return Promise.reject(serviceError);
    return Promise.resolve(serviceResult);
  },
}));

/** 被"加载"的 URL（走注入的 loader，不碰真实文件系统）。 */
const importedUrls: string[] = [];
/** 哪些 URL 应该加载失败（模拟产物损坏 / 路径 404）。 */
const failingUrls = new Set<string>();

/** 测试用的 loader：记录 URL，按 `failingUrls` 决定成败。 */
const loader = (url: string): Promise<unknown> => {
  importedUrls.push(url);
  if (failingUrls.has(url)) return Promise.reject(new Error(`404 ${url}`));
  return Promise.resolve({ ok: true });
};

import {
  PANEL_UI_SERVICE,
  bundleUrl,
  loadPanelExtensions,
} from '../extension-loader';
import { panelUiStatus, panelUiSummary, setPanelUiStatus } from '../panel-ui-status';

/** 把本地 SDK 版本注入成期望值（`loadPanelExtensions` 从 meta 标签读）。 */
function setLocalSdk(version: string): void {
  document.head.innerHTML = `<meta name="panel-ui-sdk" content="${version}">`;
}

function contribution(id: string, sdk = '1', bundle?: string) {
  return {
    id,
    name: id,
    bundle: bundle ?? `panel-extensions/${id}/index.js`,
    sdk_version: sdk,
  };
}

describe('extension-loader：清单与版本', () => {
  beforeEach(() => {
    calls.length = 0;
    importedUrls.length = 0;
    failingUrls.clear();
    serviceResult = null;
    serviceError = null;
    setLocalSdk('1');
    setPanelUiStatus({ phase: 'idle', sdk: '1', loaded: [], failed: [], reason: '' });
    vi.resetModules();
  });
  afterEach(() => {
    document.head.innerHTML = '';
  });

  it('走面板服务 echo-agent.panel-ui.list 拉清单', async () => {
    serviceResult = { sdk_version: '1', extensions: [] };
    await loadPanelExtensions({ load: loader });
    expect(calls).toEqual([{ service: PANEL_UI_SERVICE, method: 'list' }]);
    expect(PANEL_UI_SERVICE).toBe('echo-agent.panel-ui');
  });

  /**
   * 服务不可用 = 这个部署没有运行期扩展（老 Core / 嵌入式），**不是错误**：
   * 归到 `unavailable`，设置页不报警。
   */
  it('服务不可用归到 unavailable，不抛给调用方', async () => {
    serviceError = new Error('面板服务 echo-agent.panel-ui 不存在');
    const count = await loadPanelExtensions({ load: loader });
    expect(count).toBe(0);
    expect(panelUiStatus.value.phase).toBe('unavailable');
    expect(panelUiStatus.value.reason).toContain('不存在');
    // 文案要给出"本部署没有"的判断，而不是让用户以为坏了。
    expect(panelUiSummary()).toContain('未提供');
  });

  /**
   * 版本不符**整批拒绝**：继续加载只会得到 N 个互不相干的崩溃，而每个崩溃的
   * 位置都与真实原因（版本）无关。
   */
  it('SDK 版本不符时整批拒绝，且一条都不 import', async () => {
    serviceResult = { sdk_version: '2', extensions: [contribution('a'), contribution('b')] };
    const count = await loadPanelExtensions({ load: loader });
    expect(count).toBe(0);
    expect(panelUiStatus.value.phase).toBe('version-mismatch');
    expect(panelUiStatus.value.reason).toContain('面板 1');
    expect(panelUiStatus.value.reason).toContain('Core 2');
    expect(importedUrls).toEqual([]);
  });

  /**
   * 单条版本不符只废那一条：一个模块的产物旧了，不该让别的模块 UI 一起消失。
   * 注意此时清单顶层版本是对的（Core 与面板一致），只是这个 bundle 旧了。
   */
  it('单条 bundle 版本不符只影响它自己', async () => {
    // 逐条校验用的是同一次 import；这里用两条都"合法"的清单，
    // 通过让第二条的 sdk_version 不同来验证分流。
    serviceResult = {
      sdk_version: '1',
      extensions: [contribution('good'), contribution('stale', '0')],
    };
    const count = await loadPanelExtensions({ load: loader });
    // `stale` 在版本检查阶段就被拒（不进 import），`good` 尝试导入。
    expect(count).toBe(1);
    expect(panelUiStatus.value.phase).toBe('partial');
    const failed = panelUiStatus.value.failed;
    expect(failed).toHaveLength(1);
    expect(failed[0].id).toBe('stale');
    expect(failed[0].reason).toContain('重新构建');
  });

  it('bundle 路径拼上应用基址（子路径部署）', () => {
    // `import.meta.env.BASE_URL` 在测试里是 `/`。
    expect(bundleUrl('panel-extensions/x/index.js')).toBe('/panel-extensions/x/index.js');
    expect(bundleUrl('/panel-extensions/x/index.js')).toBe('/panel-extensions/x/index.js');
  });

  /**
   * 幂等：服务回包可能因重连重复到达，同一 id 不该 import 第二次
   * （第二次会让扩展的 `registerPanelExtension` 抛 duplicate）。
   */
  it('重复调用不会重复加载已成功的扩展', async () => {
    serviceResult = { sdk_version: '1', extensions: [contribution('a')] };
    const first = await loadPanelExtensions({ load: loader });
    const second = await loadPanelExtensions({ load: loader });
    expect(first).toBe(1);
    expect(second).toBe(0);
    expect(panelUiStatus.value.loaded).toEqual(['a']);
  });

  /**
   * 单条 `import()` 失败**不拖累其它**：一个模块的产物坏了（404 / 语法错 /
   * 顶层抛异常），只该失去它自己的界面入口。
   *
   * 这条是注入 `load` 的主要理由——真实环境里没法让浏览器去拉一个坏 URL，
   * 而这条语义恰恰是最需要守住的（坏一个不该全灭）。
   */
  it('单条加载失败不拖累其它扩展', async () => {
    serviceResult = {
      sdk_version: '1',
      extensions: [contribution('good'), contribution('broken')],
    };
    failingUrls.add('/panel-extensions/broken/index.js');
    const count = await loadPanelExtensions({ load: loader });
    expect(count).toBe(1);
    expect(panelUiStatus.value.phase).toBe('partial');
    expect(panelUiStatus.value.loaded).toEqual(['good']);
    expect(panelUiStatus.value.failed.map((f) => f.id)).toEqual(['broken']);
    // 原因里要带 URL：否则"加载失败"这句话没有下一步动作可言。
    expect(panelUiStatus.value.failed[0].reason).toContain('/panel-extensions/broken/index.js');
  });

  it('空清单 = ready（这个部署一个扩展都没装，不是故障）', async () => {
    serviceResult = { sdk_version: '1', extensions: [] };
    await loadPanelExtensions({ load: loader });
    expect(panelUiStatus.value.phase).toBe('ready');
    expect(panelUiSummary()).toBe('');
  });
});

describe('panel-ui-status：文案', () => {
  beforeEach(() => {
    setPanelUiStatus({ phase: 'idle', sdk: '1', loaded: [], failed: [], reason: '' });
  });

  it('idle 说明在等连接', () => {
    expect(panelUiSummary()).toContain('等待');
  });

  it('partial 同时给出成功与失败数量', () => {
    setPanelUiStatus({
      phase: 'partial',
      sdk: '1',
      loaded: ['a', 'b'],
      failed: [{ id: 'c', reason: 'x' }],
      reason: '',
    });
    expect(panelUiSummary()).toBe('2 个已加载，1 个失败（见下）');
  });

  it('failed 说清全部失败', () => {
    setPanelUiStatus({
      phase: 'failed',
      sdk: '1',
      loaded: [],
      failed: [
        { id: 'a', reason: 'x' },
        { id: 'b', reason: 'y' },
      ],
      reason: '',
    });
    expect(panelUiSummary()).toBe('全部 2 个扩展加载失败（见下）');
  });

  it('version-mismatch 原样给出原因（那是唯一有动作指引的文案）', () => {
    const reason = '面板 UI SDK 版本不匹配：面板 1，Core 2。';
    setPanelUiStatus({ phase: 'version-mismatch', sdk: '1', loaded: [], failed: [], reason });
    expect(panelUiSummary()).toBe(reason);
  });
});

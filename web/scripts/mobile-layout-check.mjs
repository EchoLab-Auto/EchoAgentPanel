#!/usr/bin/env node
//! 移动端布局断言（2026-10）：用无头 Chrome + CDP 在真视口下量几何，替代「肉眼看模拟器」。
//!
//! 为什么需要：`env(safe-area-inset-*)` 在普通桌面浏览器与大多数「手机模式」里恒为 0，
//! 刘海/Home 指示条相关的错位（顶栏被状态栏压住、入口行压进输入区、键盘遮住最新消息）
//! 在本机永远复现不出来。CDP 的 `Emulation.setSafeAreaInsetsOverride` 能注入真实安全区。
//!
//! 用法：
//!   npm run layout:mobile                      # 默认 375×812 + 320×640
//!   BASE=http://127.0.0.1:8080 npm run layout:mobile
//!   CHROME=/path/to/chrome npm run layout:mobile
//!
//! 依赖：Node ≥ 21（用内置 WebSocket 直连 CDP，不引 playwright）；本机需有 Chrome/Chromium。
//! 找不到浏览器时**跳过并退出 0**（CI 无浏览器不该红），加 --strict 则视为失败。

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const BASE = process.env.BASE || 'http://127.0.0.1:8080';
const STRICT = process.argv.includes('--strict');
const PORT = Number(process.env.CDP_PORT || 9411);

/** 依次尝试常见 Chrome 位置（Playwright 的缓存目录也认，便于本机复用）。 */
function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const home = process.env.HOME || '';
  const cands = [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    `${home}/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`,
    `${home}/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome`,
  ];
  return cands.find((p) => p && existsSync(p)) || null;
}

/**
 * 每个视口自带三项设备参数：DPR、安全区、**屏幕圆角跨度**。
 *
 * 为什么必须 per-viewport：屏幕圆角`--panel-display-radius` 在 styles.css 里
 * 是按逻辑视口宽度分档的（393 / 402 / 420 / 430 / 440 / 兜底），这里如果还用
 * 一个常量，量出来的「贴合度」是拿 A 机型的屏幕去对 B 机型的输入框 —— 波动
 * 会凭空变大，看起来像回归。两边同源才是可测的。
 *
 * 取值（跨度口径，实测自 Apple 官方 bezel PNG，见 styles.css 同名注释）：
 *   375/320 宽 → 兜底 55；402 宽（16 Pro/17/17 Pro）→ 74.5；440 宽 → 74.5。
 * 安全区：灵动岛机型顶部 62 / Home 指示条 34（iPhone 14 Pro 起）；刘海机型 47。
 */
const VIEWPORTS = [
  {
    name: '375×812 (iPhone 主参考)',
    width: 375, height: 812, dpr: 2,
    safe: { top: 47, bottom: 34, left: 0, right: 0 },
    displayRadius: 55,
  },
  {
    name: '320×640 (最小)',
    width: 320, height: 640, dpr: 2,
    safe: { top: 47, bottom: 34, left: 0, right: 0 },
    displayRadius: 55,
  },
  {
    // 用户实机（2026-10）：iPhone 17 与 17 Pro 同为 402×874 @3x
    name: '402×874 (iPhone 17 / 17 Pro)',
    width: 402, height: 874, dpr: 3,
    safe: { top: 62, bottom: 34, left: 0, right: 0 },
    displayRadius: 74.5,
  },
  {
    name: '440×956 (iPhone 17 Pro Max)',
    width: 440, height: 956, dpr: 3,
    safe: { top: 62, bottom: 34, left: 0, right: 0 },
    displayRadius: 74.5,
  },
  {
    /**
     * iPhone 开「显示缩放」后的形态（2026-10 新增）：逻辑视口变窄、
     * DPR 变大（物理像素不变 → 同一根屏角分到更少的 CSS 像素里，
     * 跨度反而从 74.5 涨到约 70）。这是**唯一会切进内容的危险方向**：
     * 若这里退回兜底 55，输入框的角会伸到物理死弯之外被屏幕裁掉。
     * styles.css 的「兜底 B」把 3x 未知宽度定在 70，这一档就是它的回归守卫。
     */
    name: '375×812 @3.2 (Display Zoom)',
    width: 375, height: 812, dpr: 3.216,
    safe: { top: 62, bottom: 34, left: 0, right: 0 },
    displayRadius: 70,
  },
];
/**
 * 超椭圆指数：必须与 ChatView.vue 传给 `composerOutline` 的 exponent 一致，
 * 否则「贴合度」量的是两条不同曲线（会读出一个假的波动）。
 * 实测 Apple bezel 屏幕角 n = 2.42~2.54，取 2.5。
 */
const EXPONENT = 2.5;

async function connect(chrome) {
  const proc = spawn(
    chrome,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--hide-scrollbars',
      `--user-data-dir=/tmp/panel-layout-check-${Date.now()}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  for (let i = 0; i < 160; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = list.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    const slot = msg.id && pending.get(msg.id);
    if (!slot) return;
    pending.delete(msg.id);
    msg.error ? slot.rej(new Error(JSON.stringify(msg.error))) : slot.res(msg.result);
  };
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const mid = ++id;
      pending.set(mid, { res, rej });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
  return { send, stop: () => { ws.close(); proc.kill('SIGKILL'); } };
}

/** 页面内采集：只读几何，不改状态。 */
const PROBE = `(() => {
  const rect = (sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect();
    return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), height: +b.height.toFixed(1), right: +b.right.toFixed(1) }; };
  const header = document.querySelector('.nm-layout__header');
  const hcs = header ? getComputedStyle(header) : null;
  const composer = rect('.chat-composer-float');
  const composerEl = document.querySelector('.chat-composer-float');
  const composerCS = composerEl ? getComputedStyle(composerEl) : null;
  const taEl = document.querySelector('.chat-composer-float .nm-textarea');
  const taField = document.querySelector('.chat-composer-float .nm-textarea__field');
  const sendBtn = document.querySelector('.chat-view__send');
  const attachBtn = document.querySelector('.chat-view__attach-btn');
  const list = document.querySelector('.chat-view__list');
  const entry = rect('.entry-row');
  const card = document.querySelector('.agent-card');
  const region = card ? card.querySelector('.agent-card__region') : null;
  const comp = document.querySelector('.chat-composer-float');
  const compCS = comp ? getComputedStyle(comp) : null;
  const compRadius = compCS ? parseFloat(compCS.borderTopLeftRadius) : null;
  const compPad = compCS ? parseFloat(compCS.paddingTop) : null;
  // clip-path 模式下外框没有 border-radius，等效半径取 --composer-corner-r
  // （= 屏角 − 留白，由 JS 写入）；桌面/直角屏仍是 border-radius 本身。
  const cornerR = compCS
    ? (parseFloat(compCS.getPropertyValue('--composer-corner-r')) || compRadius)
    : compRadius;
  /**
   * 2026-10：外框 + 玻璃换成 ui-frame NeumorphismCard（glass 档）。
   * 结构变成「卡片（材质/圆角/裁剪）> __body（padding + 内容）」两层：
   * 卡片自带 1px 内高光边（不是独立描边层），所以内外半径之差 = body padding。
   */
  const bodyEl = document.querySelector('.chat-composer-float__body');
  const bodyCS = bodyEl ? getComputedStyle(bodyEl) : null;
  const insetTotal = bodyCS ? parseFloat(bodyCS.paddingTop) : 0;
  /** 内框/按钮的圆角（同心检查用）。 */
  const radiusOf = (sel) => {
    const e = document.querySelector(sel);
    return e ? parseFloat(getComputedStyle(e).borderTopLeftRadius) : null;
  };
  /**
   * 底角弧线是否被屏幕圆角裁到：把输入区左下角的 1/4 圆弧按 5° 采样，
   * 取每个采样点到「屏幕左下圆角圆心」的最大距离，必须 ≤ 屏幕圆角半径。
   * 超过即输入区的角会伸到物理圆角外、被屏幕裁出一个缺口。
   */
  // 有 clip-path 的那一层才是"看得见/点得到"的形状（外层只剩定位作用）
  const clipEl = document.querySelector('.chat-composer-float__card');
  const clipPath = clipEl ? getComputedStyle(clipEl).clipPath : null;
  /**
   * 输入区下角与屏幕角的贴合度 —— 用命中测试取出**真实渲染轮廓**，逐点量到
   * 屏幕角超椭圆的距离。
   *
   * 这是"贴合"唯一的可量化判据：偏移量本身不重要，**波动**才对应肉眼看得到
   * 的"不平行"。border-radius 时代最好的半径也有 2.3px 波动；换成 clip-path
   * 精确轮廓后应 < 1px。
   *
   * 2026-10 补三处（kimi 复核指出的盲区）：
   *   ① **左右都量**。此前只量左下角；镜像算错（w - (p[0]-inset)）或上角
   *      不对称时，右侧坏了也不会红。现在两个角各出一份，断言取较差者。
   *   ② **参考曲线补两端直边延长线**。只拿 0~90° 的弧去取最近点，落在角区
   *      之外的采样点会把"沿边方向"的距离算进来 → 假波动（实测可为 5.6px）。
   *      这里把弧延长成「左边直边 → 弧 → 底边直边」的折线。
   *   ③ **min 单独上报**。间隙变小 = 切进物理死弯（内容被裁），是唯一危险的
   *      方向；变大只是不贴。只看 spread 抓不到"整体向里陷"。
   */
  const outlineGap = (() => {
    const el = clipEl;
    const R = DISPLAY_RADIUS;
    if (!el || !R) return null;
    const b = el.getBoundingClientRect();
    const inset = b.left;
    const touch = R - inset;
    if (!(touch > 4)) return null;
    const inside = (x, y) => {
      const t = document.elementFromPoint(x, y);
      return !!(t && (t === el || el.contains(t)));
    };
    // 屏幕角超椭圆（指数与 ChatView.vue 一致，由 PROBE 模板注入）：
    // 角在原点、y 向上；左侧直边 + 弧 + 底边直边，各延长 12px 兜住端点。
    const s = 2 / EXPONENT;
    const EXT = 12;
    const arc = [];
    for (let i = 0; i <= 600; i += 1) arc.push([R, -EXT + (i / 600) * EXT]); // 左边直边（向上延长）
    for (let i = 0; i <= 3000; i += 1) {
      const t = (i / 3000) * Math.PI / 2;
      arc.push([R - R * Math.cos(t) ** s, R - R * Math.sin(t) ** s]);
    }
    for (let i = 0; i <= 600; i += 1) arc.push([R + (i / 600) * EXT, R]);   // 底边直边（向右延长）

    /** 量一侧：side = 'left' | 'right'（屏幕系 x 从该侧屏幕边缘算起） */
    const measure = (side) => {
      const vw = innerWidth;
      let min = Infinity;
      let max = -Infinity;
      let n = 0;
      for (let yy = b.bottom - touch; yy <= b.bottom - 0.5; yy += 1) {
        // 该侧最外命中 x：先粗扫再二分细化
        let edge = null;
        if (side === 'left') {
          for (let x = 0; x <= b.left + touch + 6; x += 0.5) {
            if (inside(x, yy)) { edge = x; break; }
          }
        } else {
          for (let x = vw - 0.5; x >= b.right - touch - 6; x -= 0.5) {
            if (inside(x, yy)) { edge = x; break; }
          }
        }
        if (edge === null) continue;
        let a;
        let hi;
        if (side === 'left') { a = Math.max(0, edge - 0.5); hi = edge; }
        else { a = Math.min(vw, edge + 0.5); hi = edge; }
        for (let k = 0; k < 6; k += 1) {
          const mid = (a + hi) / 2;
          if (inside(mid, yy)) hi = mid; else a = mid;
        }
        const px = side === 'left' ? hi : vw - hi;   // 屏幕系 x（从该侧边缘算起）
        const py = innerHeight - yy;                 // 屏幕系 y 向上
        let best = Infinity;
        for (const [ax, ay] of arc) {
          const d = Math.hypot(px - ax, py - ay);
          if (d < best) best = d;
        }
        min = Math.min(min, best);
        max = Math.max(max, best);
        n += 1;
      }
      return n > 4
        ? { min: +min.toFixed(2), max: +max.toFixed(2), spread: +(max - min).toFixed(2), samples: n }
        : null;
    };

    const left = measure('left');
    const right = measure('right');
    if (!left && !right) return null;
    // 汇总取较差者：任一侧退化都要能被看见
    const pick = (k) => Math[k](left?.[k] ?? Infinity, right?.[k] ?? Infinity);
    return {
      min: pick('min'),
      max: Math.max(left?.max ?? -Infinity, right?.max ?? -Infinity),
      spread: Math.max(left?.spread ?? 0, right?.spread ?? 0),
      samples: (left?.samples ?? 0) + (right?.samples ?? 0),
      left,
      right,
    };
  })();

  /**
   * 圆角是否真的「切」出来了（命中测试层面）：浏览器对 border-radius 做
   * 点击穿透，圆角外的空白点不应命中输入区。这条能抓住「圆角声明了但没生效」
   * （选择器没压过库、计算值非法等）——只看 getComputedStyle 是抓不到的。
   */
  const cornerHitTest = (() => {
    const el0 = clipEl || comp;
    if (!el0) return null;
    const b = el0.getBoundingClientRect();
    const hit = (x, y) => {
      const el = document.elementFromPoint(x, y);
      return !!(el && (el === el0 || el0.contains(el)));
    };
    return {
      tipOutside: hit(b.left + 2, b.bottom - 2), // 外接矩形的角尖：圆角内必不命中
      bottomEdgeInside: hit(b.left + b.width / 2, b.bottom - 2), // 底边中点：必命中
    };
  })();

  const fsBtn = document.querySelector('.fullscreen-toggle');
  const cardsBtn = document.querySelector('.mobile-cards-btn');
  const fsRect = fsBtn ? fsBtn.getBoundingClientRect() : null;
  const cardsRect = cardsBtn ? cardsBtn.getBoundingClientRect() : null;
  const buttons = [...document.querySelectorAll('.nm-layout__header button')]
    .filter((b) => getComputedStyle(b).display !== 'none')
    .map((b) => b.getBoundingClientRect());
  return {
    vw: innerWidth, vh: innerHeight,
    overflowX: document.documentElement.scrollWidth - innerWidth,
    pageScrolls: document.documentElement.scrollHeight > innerHeight + 1,
    header: header ? { ...rect('.nm-layout__header'), padTop: hcs.paddingTop } : null,
    headerButtonsInside: buttons.length ? (Math.min(...buttons.map((b) => b.top)) >= SAFE_TOP && Math.max(...buttons.map((b) => b.bottom)) <= (header?.getBoundingClientRect().bottom ?? 0)) : null,
    maxButtonRight: buttons.length ? +Math.max(...buttons.map((b) => b.right)).toFixed(1) : null,
    composer, entry,
    entryGap: (composer && entry) ? +(composer.top - entry.bottom).toFixed(1) : null,
    listPadBottom: list ? parseFloat(getComputedStyle(list).paddingBottom) : null,
    composerOccupancy: composer ? +(innerHeight - composer.top).toFixed(1) : null,
    // 圆角同心 / 控件等高（iOS 视觉核心）：外层圆角 - padding 应等于内框圆角，
    // 取消/附件/发送与「初始 1 行输入框内框」等高
    fieldFont: composerCS ? composerCS.getPropertyValue('--chat-field-font').trim() : null,
    controlH: composerCS ? composerCS.getPropertyValue('--chat-control-h').trim() : null,
    composerRadius: composerCS ? parseFloat(composerCS.borderTopLeftRadius) : null,
    composerPad: composerCS ? parseFloat(composerCS.paddingTop) : null,
    textareaRadius: taEl ? parseFloat(getComputedStyle(taEl).borderTopLeftRadius) : null,
    textareaHeight: taField ? +taField.getBoundingClientRect().height.toFixed(1) : null,
    sendHeight: sendBtn ? +sendBtn.getBoundingClientRect().height.toFixed(1) : null,
    attachHeight: attachBtn ? +attachBtn.getBoundingClientRect().height.toFixed(1) : null,
    sendRadius: sendBtn ? parseFloat(getComputedStyle(sendBtn).borderTopLeftRadius) : null,
    attachRadius: attachBtn ? parseFloat(getComputedStyle(attachBtn).borderTopLeftRadius) : null,
    // 同心判据（几何定义，而非"看起来像"）：角部圆心重合 ⟺
    //   内半径 = 外半径 − padding − border（border 也在圆弧半径之外！）
    // 这里直接比较「角心坐标差」，Δ=0 才叫同心。
    composerBorder: composerCS ? parseFloat(composerCS.borderTopWidth) : null,
    concentric: (() => {
      const el = document.querySelector('.chat-composer-float');
      if (!el) return null;
      const b = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const R = parseFloat(cs.getPropertyValue('--composer-corner-r')) || parseFloat(cs.borderTopLeftRadius);
      const out = { expected: +(R - insetTotal).toFixed(2) };
      // 每个内层元素只对「它真正贴住的那个角」计较：textarea 贴内容盒左上，
      // send 贴右下，attach 贴下边（横向位置无关）。角心重合 ⟺ Δ=0。
      const probeCorner = (sel, key, corner) => {
        const e = document.querySelector(sel);
        if (!e) return;
        const bb = e.getBoundingClientRect();
        const rr = parseFloat(getComputedStyle(e).borderTopLeftRadius);
        // 外框/R 与内层/r 在同侧角上的角心
        const ox = corner.includes('L') ? b.left + R : b.right - R;
        const oy = corner.includes('T') ? b.top + R : b.bottom - R;
        const ix = corner.includes('L') ? bb.left + rr : bb.right - rr;
        const iy = corner.includes('T') ? bb.top + rr : bb.bottom - rr;
        out[key] = { radius: rr, corner, dX: +(ox - ix).toFixed(2), dY: +(oy - iy).toFixed(2) };
      };
      probeCorner('.chat-composer-float .nm-textarea', 'textarea', 'TL');
      probeCorner('.chat-view__send', 'send', 'BR');
      probeCorner('.chat-view__attach-btn', 'attach', 'BR');
      return out;
    })(),
    fullscreen: fsBtn ? {
      display: getComputedStyle(fsBtn).display,
      width: +(fsRect?.width ?? 0).toFixed(1),
      height: +(fsRect?.height ?? 0).toFixed(1),
      right: +(fsRect?.right ?? 0).toFixed(1),
      iconOnly: (fsBtn.textContent ?? '').trim() === '' && !!fsBtn.querySelector('svg'),
      aria: fsBtn.getAttribute('aria-label'),
    } : null,
    cardsBtn: cardsBtn ? { left: +(cardsRect?.left ?? 0).toFixed(1) } : null,
    composer: comp ? {
      radius: compRadius,
      padding: compPad,
      height: +comp.getBoundingClientRect().height.toFixed(1),
      // 等间隙的两个前提量：到左右屏边 / 到底边的留白
      leftInset: +comp.getBoundingClientRect().left.toFixed(1),
      bottomInset: +(innerHeight - comp.getBoundingClientRect().bottom).toFixed(1),
      // 同心期望值：R − padding − border（border 也在圆弧半径之外，必须减）
      innerRadiusExpected: +(cornerR - insetTotal).toFixed(2),
      cornerRadius: +cornerR.toFixed(2),
      border: comp ? parseFloat(getComputedStyle(comp).borderTopWidth) : null,
      fieldRadius: radiusOf('.nm-textarea.nm-textarea'),
      attachRadius: radiusOf('.chat-view__attach-btn'),
      sendRadius: radiusOf('.chat-view__send'),
      clipPath: clipPath || null,
      /**
       * 三处等距（2026-10 用户要求）：
       *   ① 输入框上边框 → 外壳上边框
       *   ② 输入框下边框 → API 徽标
       *   ③ API 徽标     → 外壳下边框
       * 三者必须都等于外壳内边距 P（--composer-padding）。
       * 只有徽标盒高 = 状态行行高时 ③ 才等于 P —— 靠 --chat-status-h
       * 单一来源保证（min-height 与 line-height 取同一个变量）。
       */
      statusGaps: (() => {
        const card = document.querySelector('.chat-composer-float__card');
        const body = document.querySelector('.chat-composer-float__body');
        const ta = document.querySelector('.chat-composer-float .nm-textarea');
        const api = document.querySelector('.chat-status__api');
        if (!card || !body || !ta || !api) return null;
        const r = (el) => el.getBoundingClientRect();
        return {
          p: +parseFloat(getComputedStyle(body).paddingTop).toFixed(2),
          g1: +(r(ta).top - r(card).top).toFixed(2),
          g2: +(r(api).top - r(ta).bottom).toFixed(2),
          g3: +(r(card).bottom - r(api).bottom).toFixed(2),
        };
      })(),
      /**
       * 上角纵向半径（轮廓首点的 y）。轮廓从左上角起点开始，所以首点 y 就是
       * 上角吃掉的纵向高度。多行输入把面板撑高时它**不该变** —— 变了就是
       * "每打一行两端形变一次"。
       */
      topRy: (() => {
        const nums = clipPath ? (clipPath.match(/-?\\d+\\.?\\d*/g) || []).map(Number) : [];
        return nums.length >= 2 ? +nums[1].toFixed(2) : null;
      })(),
      outlineGap,
      cornerHitTest,
    } : null,
    agentCard: card ? {
      width: +card.getBoundingClientRect().width.toFixed(1),
      disabled: card.disabled,
      regionVisible: !!region && getComputedStyle(region).display !== 'none',
    } : null,
  };
})()`;

/**
 * Agent 菜单：点开卡片，验证弹层**真的**可见可点。
 *
 * 为什么必须断言这一条：菜单曾是入口行内的 `position: absolute` 上弹层，而入口行
 * 在窄屏是 `overflow-x: auto` 的横滚容器 —— CSS 规定此时 `overflow-y` 由 visible
 * 计算为 auto，于是整个菜单落在裁剪区外。菜单 DOM 在、`getBoundingClientRect()`
 * 也正常（实测 y=466..632，容器 top=640），截图里却什么都没有；唯一可靠的判据是
 * `elementFromPoint` 命中测试。2026-10 用户报障（移动端入口行 Agent 按钮点不动）即此。
 */
/**
 * 灌 3 行文本，把输入区撑高（单行 68px → 约 119px）。
 *
 * 为什么这一条必须断言：上角纵向半径取的是「剩余高度」，面板一长高它就跟着长
 * ——2026-10 实测 iPhone 17 视口下 1 行 9.75 → 2 行 34.75 → 3 行 58.25px，
 * 视觉上每打一行两端就从尖椭圆变成四分之一圆。用 `topRyMax` 锁住后应当纹丝不动，
 * 且多出来的高度变成竖直直边（下角贴合度不受影响）。
 */
const GROW = `(() => {
  const ta = document.querySelector('.chat-composer-float textarea');
  if (!ta) return false;
  ta.value = ['第一行', '第二行', '第三行'].join(String.fromCharCode(10));
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`;

const OPEN_MENU = `(() => {
  const card = document.querySelector('.agent-card');
  if (!card || card.disabled) return { skipped: true };
  card.click();
  return { skipped: false };
})()`;

const MENU_PROBE = `(() => {
  const menu = document.querySelector('.agent-menu');
  const pop = document.querySelector('.panel-popover');
  if (!menu || !pop) return { open: false };
  const r = menu.getBoundingClientRect();
  const pr = pop.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  /**
   * 用 elementsFromPoint（复数）而不是 elementFromPoint（单数）。
   *
   * 单数版把「被临时浮层盖住」与「被祖先裁掉 / 根本没渲染」判成同一件事：
   * 2026-10 这个断言间歇红，实测命中 .nm-toast__message —— 加载时 4 条
   * 「core / ai_station / A100-40g / cloud-server-2 已恢复在线」的 info toast
   * 叠在 top-center（z-index 500、320 宽下容器高到 y=535），恰好盖住菜单中心
   * (160, 384.5)。而 elementsFromPoint 的栈里**菜单一直在**（menuInStack=true），
   * 说明它既没被裁、也没消失，只是上面压了一条会自动消失的提示。
   *
   * 判据改为「菜单出现在栈里的任意一层」：真正的历史 bug（菜单挂在入口行
   * overflow-x 容器里被整体裁掉）在栈里根本不会出现，仍然会被抓住。
   * coveredBy 只作诊断信息输出，不参与判定。
   */
  const stack = document.elementsFromPoint(cx, cy);
  const inStack = stack.some((e) => e === menu || menu.contains(e));
  const top = stack[0] ?? null;
  const coveredBy = top && top !== menu && !menu.contains(top)
    ? String(top.className || top.tagName).slice(0, 48)
    : null;
  const items = [...menu.querySelectorAll('.agent-menu__item')];
  return {
    open: true,
    items: items.length,
    itemHeight: items[0] ? +items[0].getBoundingClientRect().height.toFixed(1) : null,
    inBody: pop.parentElement === document.body,
    inViewport: pr.left >= -0.5 && pr.right <= innerWidth + 0.5 && pr.top >= -0.5 && pr.bottom <= innerHeight + 0.5,
    hitInsideMenu: inStack,
    coveredBy,
    popRect: { left: +pr.left.toFixed(1), top: +pr.top.toFixed(1), width: +pr.width.toFixed(1) },
  };
})()`;

const CLOSE_MENU = `(() => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  return true;
})()`;

const checks = [];
const check = (name, ok, detail) => checks.push({ name, ok, detail });

const chrome = findChrome();
if (!chrome) {
  console.log('⚠️  未找到 Chrome/Chromium，跳过移动端布局断言（设 CHROME=<path> 或加 --strict 使其失败）');
  process.exit(STRICT ? 1 : 0);
}
if (typeof WebSocket === 'undefined') {
  console.log('⚠️  当前 Node 无内置 WebSocket（需 ≥ 21），跳过移动端布局断言');
  process.exit(STRICT ? 1 : 0);
}

const { send, stop } = await connect(chrome);
const evaluate = async (expression) => {
  const out = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (out.exceptionDetails) throw new Error('采集失败：' + out.exceptionDetails.text);
  return out.result.value;
};
try {
  await send('Page.enable');
  await send('Runtime.enable');
  for (const vp of VIEWPORTS) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: vp.width, height: vp.height, deviceScaleFactor: vp.dpr, mobile: true,
    });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await send('Emulation.setSafeAreaInsetsOverride', { insets: vp.safe }).catch(() => {});
    await send('Page.navigate', { url: BASE + '/' });
    await new Promise((r) => setTimeout(r, 3500));
    const probe = PROBE
      .replace('SAFE_TOP', String(vp.safe.top))
      .replace(/EXPONENT/g, String(EXPONENT))
      .replace(/DISPLAY_RADIUS/g, String(vp.displayRadius));
    const m = await evaluate(probe);
    const tag = `[${vp.name}]`;

    check(`${tag} 无横向溢出`, m.overflowX === 0, `scrollWidth - innerWidth = ${m.overflowX}`);
    check(`${tag} 不整页滚动（固定视口）`, !m.pageScrolls, `scrollHeight = ${m.vh}? ${!m.pageScrolls}`);
    check(
      `${tag} 顶栏让开刘海`,
      !!m.header && m.header.padTop === `${vp.safe.top}px` && m.header.height >= 56 + vp.safe.top,
      `padTop=${m.header?.padTop} height=${m.header?.height}（期望 ${vp.safe.top}px / ≥${56 + vp.safe.top}）`,
    );
    check(`${tag} 顶栏按钮不被状态栏压住`, m.headerButtonsInside === true, `inside=${m.headerButtonsInside}`);
    check(`${tag} 顶栏最右按钮可达`, (m.maxButtonRight ?? 0) < vp.width, `right=${m.maxButtonRight} < ${vp.width}`);
    check(
      `${tag} 消息区留白 ≥ 输入区占位`,
      (m.listPadBottom ?? 0) >= (m.composerOccupancy ?? Infinity) + 8,
      `padding-bottom=${m.listPadBottom} vs 输入区占位=${m.composerOccupancy}`,
    );
    // iOS 圆角/等高回归（2026-10 二次）：同心用几何定义断言——
    //   内半径 = 外半径 − padding − border（border 也占半径，漏减就是 1px 偏差）
    //   且内外角心坐标差 = 0
    // 取消/附件/发送与「初始 1 行输入框内框」等高。
    check(
      `${tag} 内框圆角 = 外框 − padding − border（几何同心）`,
      m.concentric?.textarea != null &&
        Math.abs(m.concentric.textarea.radius - m.concentric.expected) <= 0.6,
      `期望 ${m.concentric?.expected} vs 实际 ${m.concentric?.textarea?.radius}（Δ=${((m.concentric?.textarea?.radius ?? 0) - (m.concentric?.expected ?? 0)).toFixed(2)}）` +
        `  border=${m.composerBorder}；fieldFont=${m.fieldFont} controlH=${m.controlH}`,
    );
    check(
      `${tag} 内层控件圆角彼此一致（同一派生量）`,
      m.concentric != null &&
        ['textarea', 'send', 'attach'].every((k) => {
          const v = m.concentric?.[k];
          return !v || Math.abs(v.radius - (m.concentric?.textarea?.radius ?? v.radius)) <= 0.6;
        }),
      ['textarea', 'send', 'attach']
        .map((k) => `${k}: r=${m.concentric?.[k]?.radius}`)
        .join('；'),
    );
    check(
      `${tag} 发送/附件与输入框内框同高`,
      m.textareaHeight != null &&
        m.sendHeight != null &&
        m.attachHeight != null &&
        Math.abs(m.sendHeight - m.textareaHeight) <= 0.6 &&
        Math.abs(m.attachHeight - m.textareaHeight) <= 0.6,
      `textarea=${m.textareaHeight} send=${m.sendHeight} attach=${m.attachHeight}`,
    );
    check(
      `${tag} 发送/附件按钮圆角与内框一致`,
      m.textareaRadius != null &&
        m.sendRadius != null &&
        m.attachRadius != null &&
        Math.abs(m.sendRadius - m.textareaRadius) <= 0.6 &&
        Math.abs(m.attachRadius - m.textareaRadius) <= 0.6,
      `textarea=${m.textareaRadius} send=${m.sendRadius} attach=${m.attachRadius}`,
    );
    check(
      `${tag} 输入区到左右屏边的留白 = 到底边的留白（等间隙前提）`,
      !!m.composer
        && Math.abs(m.composer.leftInset - m.composer.bottomInset) <= 1.5,
      `left=${m.composer?.leftInset} bottom=${m.composer?.bottomInset}（不等则任何半径都无法让角部间隙恒定）`,
    );
    check(
      `${tag} 输入区外轮廓由 clip-path 提供（圆弧贴不住超椭圆）`,
      typeof m.composer?.clipPath === 'string' && m.composer.clipPath.startsWith('path('),
      `clip-path=${String(m.composer?.clipPath).slice(0, 28)}…（移动端应为 path(...)，桌面为 none）`,
    );
    check(
      `${tag} 内层圆角不超过外框贴角半径（超椭圆口径下由派生量给出）`,
      m.textareaRadius != null &&
        m.composer != null &&
        m.textareaRadius <= m.composer.cornerRadius + 0.6,
      `radius=${m.textareaRadius} ≤ 贴角半径 ${m.composer?.cornerRadius}` +
        `（声明值 30 超过输入框半高 ${(m.textareaHeight ?? 0) / 2} 时由浏览器按规范等比削减为胶囊）`,
    );
    check(
      `${tag} 下角贴合屏幕角（间隙波动 < 1px）`,
      !!m.composer?.outlineGap && m.composer.outlineGap.spread < 1,
      m.composer?.outlineGap
        ? `间隙 ${m.composer.outlineGap.min}~${m.composer.outlineGap.max}px，波动 ${m.composer.outlineGap.spread}px（${m.composer.outlineGap.samples} 行采样；左 ${JSON.stringify(m.composer.outlineGap.left)} 右 ${JSON.stringify(m.composer.outlineGap.right)}；圆弧时代最好 2.3px，最初 34px）`
        : '采样失败',
    );
    /**
     * 三处等距（2026-10 用户要求，写进文档并有此断言守着）：
     *   输入框上边框↔外壳上边框 = 输入框下边框↔API 徽标 = API 徽标↔外壳下边框
     * 容差 0.6px：桌面档 P=12 时文本域高度是小数（45.598），
     * 起点会带 0.4px 的亚像素偏移。
     */
    if (m.composer?.statusGaps) {
      const g = m.composer.statusGaps;
      const dev = Math.max(
        Math.abs(g.g1 - g.p),
        Math.abs(g.g2 - g.p),
        Math.abs(g.g3 - g.p),
      );
      check(
        `${tag} 三处间距都等于外壳内边距（输入框上/下、API 徽标）`,
        dev <= 0.6,
        `P=${g.p}  g1(输入框上)=${g.g1}  g2(输入框下→徽标)=${g.g2}  g3(徽标→外壳下)=${g.g3}  最大偏差 ${dev}px`,
      );
    }
    /**
     * 危险方向守卫（2026-10）：间隙**变小**意味着输入框的角切进了屏幕的
     * 物理死弯——内容会被屏幕圆角裁掉，是唯一不可接受的失效。变大只是"不贴"。
     * 只看 spread 抓不到这个：整体向里陷时 spread 可能仍然很小。
     * 容差 1px：光栅化 + 亚像素插值的量级。
     */
    check(
      `${tag} 间隙不小于声明留白（不切进物理死弯）`,
      !!m.composer?.outlineGap
        && m.composer.outlineGap.min >= (m.composer.leftInset ?? 0) - 1,
      m.composer?.outlineGap
        ? `min ${m.composer.outlineGap.min} ≥ 留白 ${m.composer.leftInset} − 1`
        : '采样失败',
    );
    /**
     * 左右对称：镜像计算（composerOutline 里的 w - (p0 - inset)）错了、
     * 或上角 topRy 两侧不一致时，只有一侧会坏。分别断言两边波动。
     */
    check(
      `${tag} 左右下角都贴合（两侧波动各 < 1px）`,
      !!m.composer?.outlineGap?.left
        && !!m.composer?.outlineGap?.right
        && m.composer.outlineGap.left.spread < 1
        && m.composer.outlineGap.right.spread < 1,
      m.composer?.outlineGap
        ? `左 ${m.composer.outlineGap.left?.spread}px / 右 ${m.composer.outlineGap.right?.spread}px`
        : '采样失败',
    );
    // 多行输入：形状不许跳变（上角半径锁定 + 下角仍贴合）
    if (await evaluate(GROW)) {
      await new Promise((r) => setTimeout(r, 400));
      const grown = await evaluate(probe);
      const before = m.composer?.topRy;
      const after = grown.composer?.topRy;
      check(
        `${tag} 多行输入不改变上角半径（形状不跳变）`,
        before != null && after != null && Math.abs(after - before) < 0.6,
        `1 行 ${before}px → 3 行 ${after}px（条高 ${m.composer?.height} → ${grown.composer?.height}）`,
      );
      check(
        `${tag} 多行输入后下角仍贴合`,
        !!grown.composer?.outlineGap && grown.composer.outlineGap.spread < 1,
        grown.composer?.outlineGap
          ? `间隙 ${grown.composer.outlineGap.min}~${grown.composer.outlineGap.max}px，波动 ${grown.composer.outlineGap.spread}px`
          : '采样失败',
      );
      // 复位，别影响后续检查
      await evaluate(`(() => {
        const ta = document.querySelector('.chat-composer-float textarea');
        if (!ta) return false;
        ta.value = '';
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      })()`);
      await new Promise((r) => setTimeout(r, 300));
    }
    check(
      `${tag} 圆角真的切出来了（角尖点击穿透 / 底边命中）`,
      m.composer?.cornerHitTest?.tipOutside === false
        && m.composer?.cornerHitTest?.bottomEdgeInside === true,
      `角尖命中=${m.composer?.cornerHitTest?.tipOutside}（应为 false）底边命中=${m.composer?.cornerHitTest?.bottomEdgeInside}（应为 true）`,
    );
    check(
      `${tag} 内框/按钮圆角与外框同心（R − padding − border）`,
      !!m.composer
        && [m.composer.fieldRadius, m.composer.attachRadius, m.composer.sendRadius]
          .every((r) => r !== null && Math.abs(r - Math.max(0, m.composer.innerRadiusExpected)) <= 0.5),
      `field=${m.composer?.fieldRadius} attach=${m.composer?.attachRadius} send=${m.composer?.sendRadius}（期望 ${Math.max(0, m.composer?.innerRadiusExpected ?? 0)} = R−padding−border）`,
    );
    check(
      `${tag} 全屏按钮在移动端可用（图标态）`,
      !!m.fullscreen && m.fullscreen.display !== 'none' && m.fullscreen.iconOnly === true,
      `display=${m.fullscreen?.display} iconOnly=${m.fullscreen?.iconOnly}（此前 styles.css 整段 display:none）`,
    );
    check(
      `${tag} 全屏按钮在「卡片」左侧`,
      !m.cardsBtn || (!!m.fullscreen && m.fullscreen.right <= m.cardsBtn.left),
      `fullscreen.right=${m.fullscreen?.right} ≤ cards.left=${m.cardsBtn?.left}`,
    );
    check(
      `${tag} 全屏按钮触控目标`,
      (m.fullscreen?.width ?? 0) >= 32 && (m.fullscreen?.height ?? 0) >= 44 && (m.fullscreen?.width ?? 0) <= 48,
      `size=${m.fullscreen?.width}×${m.fullscreen?.height}（期望宽 32..48、高 ≥44）`,
    );
    check(
      `${tag} Agent 卡片不吃掉入口行`,
      !!m.agentCard && m.agentCard.width <= 140,
      `card width=${m.agentCard?.width}px（期望 ≤140，修复前 213.9）`,
    );
    check(
      `${tag} Agent 卡片窄屏隐藏区域徽标`,
      !!m.agentCard && m.agentCard.regionVisible === false,
      `regionVisible=${m.agentCard?.regionVisible}`,
    );

    const opened = await evaluate(OPEN_MENU);
    if (opened?.skipped) {
      check(`${tag} Agent 菜单`, true, '跳过：当前实例无 Agent（卡片 disabled）');
    } else {
      await new Promise((r) => setTimeout(r, 400));
      const mn = await evaluate(MENU_PROBE);
      check(
        `${tag} Agent 菜单没被入口行裁掉（点了看得见）`,
        mn?.open === true && mn.hitInsideMenu === true,
        `open=${mn?.open} hitInsideMenu=${mn?.hitInsideMenu} items=${mn?.items}` +
          `（被裁时菜单不在命中栈里；被临时浮层盖住时 coveredBy=${mn?.coveredBy ?? '—'}，不算失败）`,
      );
      check(
        `${tag} Agent 菜单在视口内且已 teleport`,
        mn?.open === true && mn.inBody === true && mn.inViewport === true,
        `inBody=${mn?.inBody} inViewport=${mn?.inViewport} rect=${JSON.stringify(mn?.popRect)}`,
      );
      check(
        `${tag} Agent 菜单项满足触控目标`,
        (mn?.itemHeight ?? 0) >= 36,
        `item height=${mn?.itemHeight}px（期望 ≥36，实测 38）`,
      );
      await evaluate(CLOSE_MENU);
      await new Promise((r) => setTimeout(r, 250));
      const closed = await evaluate(`!document.querySelector('.agent-menu')`);
      check(`${tag} Agent 菜单可关闭（Escape）`, closed === true, `stillOpen=${!closed}`);
    }
  }
} finally {
  stop();
}

let failed = 0;
for (const c of checks) {
  // 贴合度是这套断言的**核心指标**（一个数字就能看出角是不是平行），
  // 通过时也把间隙区间/波动打出来 —— 否则回归只能靠"从 0.3 涨到 0.9
  // 但都 < 1px"这类不报错的方式溜过去。
  const showDetail = !c.ok || /贴合|多行|间隙不小于|左右下角|三处间距/.test(c.name);
  console.log(`${c.ok ? '✓' : '✗'} ${c.name}${showDetail ? `\n    → ${c.detail}` : ''}`);
  if (!c.ok) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} 通过${failed ? `，${failed} 项失败` : ''}`);
process.exit(failed ? 1 : 0);

//! 软键盘 / 视口诊断浮层（2026-11）
//!
//! 用途：手机上「键盘弹起后界面错位」类问题，靠猜浏览器行为是没用的 ——
//! iOS Safari、Android Chrome、各家 WebView 对键盘的处理互不相同
//! （有的压缩布局视口，有的只压视觉视口，有的顺手滚一下页面，还有的
//! 干脆不更新 `visualViewport` 也不派发事件）。
//!
//! 只在 URL 带 `?diag`（或 `#diag`）时激活：右下角固定一块深色浮层，
//! 每 400ms 刷新真实数值，异常项带 ⚠。出问题时带着参数刷新一次、弹出键盘、
//! 截图即可定位到具体是哪一层算错。
//!
//! 字段含义（判案顺序）：
//!   innerHeight / vv.height / vv.offsetTop
//!     —— 三个原始输入。键盘弹出后若 vv.height 完全没变，说明浏览器
//!        根本没告诉我们键盘存在，只能靠轮询或让浏览器自己滚。
//!   vv事件 r/s
//!     —— 事件计数。聚焦后仍是 0/0 → 事件路径整条是死的（轮询才是出路）。
//!   --app-h / view 高
//!     —— 容器实际高度。与 innerHeight 差很多 = 基准被写坏过。
//!   卡片 bottom / 目标 bottom / 偏差
//!     —— 闭环的唯一判据。目标 = vv.offsetTop + vv.height（可视区下沿，
//!        布局视口坐标），卡片 bottom 应与之相等，偏差 > 2 就是没对齐。
//!
//! 刻意做成「零依赖 + 独立文件」：不 import 任何 Vue / 组件，由 main.ts
//! 动态 import，生产包里是独立小 chunk，不带 `?diag` 就不下载。

interface Sample {
  label: string
  value: string
  /** 异常时高亮，正常不上色 */
  warn?: boolean
}

/** visualViewport 事件计数：区分「我们算错」与「我们压根没被通知」。 */
const vvEvents = { resize: 0, scroll: 0 }
function hookViewportEvents(): void {
  const vv = window.visualViewport
  if (!vv) return
  vv.addEventListener('resize', () => {
    vvEvents.resize += 1
  })
  vv.addEventListener('scroll', () => {
    vvEvents.scroll += 1
  })
}

function num(n: number | undefined | null, digits = 1): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—'
  return n.toFixed(digits)
}

/** 完整快照（发给后端 /api/diag 用，字段比浮层多得多）。 */
function snapshot(): Record<string, unknown> {
  const vv = window.visualViewport
  const root = document.querySelector<HTMLElement>('.chat-view')
  const composer = document.querySelector<HTMLElement>('.chat-composer-float')
  const field = document.querySelector<HTMLElement>('.nm-textarea__field')
  const rootRect = root?.getBoundingClientRect()
  const composerRect = composer?.getBoundingClientRect()
  const cs = composer ? getComputedStyle(composer) : null
  const rootCs = root ? getComputedStyle(root) : null

  return {
    // 视口三件套（判「键盘有没有被检测到」）
    innerHeight: window.innerHeight,
    vvHeight: vv?.height ?? null,
    vvOffsetTop: vv?.offsetTop ?? null,
    vvPageTop: vv?.pageTop ?? null,
    vvScale: vv?.scale ?? null,
    // 事件计数（判「事件路径是不是死的」）
    vvEvents: { ...vvEvents },
    // 容器：rect + 关键 computed（判「包含块是不是它」）
    rootRect: rootRect
      ? { top: rootRect.top, bottom: rootRect.bottom, height: rootRect.height }
      : null,
    rootPosition: rootCs?.position ?? null,
    rootPaddingBottom: rootCs?.paddingBottom ?? null,
    rootTransform: rootCs?.transform ?? null,
    rootOverflowY: rootCs?.overflowY ?? null,
    // 卡片：rect + **computed bottom**（这是判定「变量有没有生效」的铁证）
    composerRect: composerRect
      ? { top: composerRect.top, bottom: composerRect.bottom, height: composerRect.height }
      : null,
    composerBottom: cs?.bottom ?? null, // used value：468px 表示变量生效，11.7px 表示没生效
    composerPosition: cs?.position ?? null,
    composerInsetBlockEnd: cs?.getPropertyValue('inset-block-end')?.trim() ?? null,
    // 内联变量（JS 写入的绝对值）
    inlineBottomPx: composer?.style.getPropertyValue('--composer-bottom-px') ?? null,
    inlineClip: (composer?.style.getPropertyValue('--composer-clip') ?? '').slice(0, 24),
    // 作用域变量
    varBottomGap: cs?.getPropertyValue('--composer-bottom-gap')?.trim() ?? null,
    varControlH: cs?.getPropertyValue('--chat-control-h')?.trim() ?? null,
    varKeyboardClass: composer?.className.includes('--keyboard') ?? false,
    // 页级
    appH: getComputedStyle(document.documentElement).getPropertyValue('--app-h').trim(),
    scrollY: window.scrollY,
    docScrollTop: document.documentElement.scrollTop,
    bodyScrollTop: document.body.scrollTop,
    activeIsField: !!field && document.activeElement === field,
    dpr: window.devicePixelRatio,
    ua: navigator.userAgent,
  }
}

/**
 * 把快照 POST 给 Panel（`/api/diag`，豁免认证）。仅在 ?diag 模式下调用。
 *
 * 为什么需要：真机上没法开 DevTools，而这类问题至少要 20 个字段才能定位。
 * 让用户口述两三个数字，每缺一个就多跑一轮，代价太高。直接打上来，
 * 排查者在本机 tail 文件即可。失败静默（诊断不该影响主流程）。
 */
let postBudget = 60
function postSnapshot(): void {
  if (postBudget <= 0) return
  postBudget -= 1
  try {
    void fetch('/api/diag', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(snapshot()),
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* 忽略 */
  }
}

function collect(): Sample[] {
  const vv = window.visualViewport
  const root = document.querySelector<HTMLElement>('.chat-view')
  const composer = document.querySelector<HTMLElement>('.chat-composer-float')
  const rootRect = root?.getBoundingClientRect()
  const composerRect = composer?.getBoundingClientRect()

  const appH = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--app-h'),
  )
  const containerH = rootRect?.height ?? 0
  const containerShrunk = containerH > 0 && containerH < window.innerHeight - 80
  const target = vv ? vv.offsetTop + vv.height : Number.NaN
  const delta = composerRect ? composerRect.bottom - target : Number.NaN
  const kbOn = vv ? vv.height < window.innerHeight - 80 : false

  return [
    { label: 'innerHeight', value: num(window.innerHeight, 0) },
    { label: 'vv.height', value: num(vv?.height, 0) },
    { label: 'vv.offsetTop', value: num(vv?.offsetTop, 0) },
    {
      label: 'vv事件 r/s',
      value: `${vvEvents.resize}/${vvEvents.scroll}`,
      // 键盘没检测到、事件也是 0 → 事件路径整条是死的
      warn: !kbOn && vvEvents.resize === 0 && vvEvents.scroll === 0,
    },
    {
      label: '--app-h',
      value: Number.isNaN(appH) ? '—' : num(appH, 0),
      warn: !Number.isNaN(appH) && Math.abs(appH - window.innerHeight) > 80,
    },
    { label: 'view 高', value: num(containerH, 0), warn: containerShrunk },
    { label: '卡片 bottom', value: num(composerRect?.bottom, 0) },
    {
      // JS 写入的绝对值；空 = 没写
      label: 'bottom-px',
      value: composer?.style.getPropertyValue('--composer-bottom-px').trim() || '（未写）',
    },
    {
      // **实际生效的** bottom（used value）。与上一行不等 = 变量被覆盖/未解析；
      // 等于 11.7px(3vw) = 完全没走键盘口径。
      label: 'bottom(生效)',
      value: composer ? getComputedStyle(composer).bottom : '—',
      warn: !!composer && getComputedStyle(composer).bottom === 'auto',
    },
    { label: '目标 bottom', value: num(target, 0) },
    {
      // 只在键盘态才要求贴可视区下沿；无键盘时卡片本来就该离底 3vw，
      // 那 11.7px 是设计值，不该报警。
      label: '偏差(应0)',
      value: num(delta, 1),
      warn: kbOn && Math.abs(delta) > 2,
    },
    { label: '键盘态', value: kbOn ? '是' : '否' },
    {
      label: 'gap',
      value: composer
        ? getComputedStyle(composer).getPropertyValue('--composer-bottom-gap').trim() || '—'
        : '—',
    },
    { label: 'scrollY', value: num(window.scrollY, 0), warn: window.scrollY > 0 },
  ]
}

function mount(): void {
  hookViewportEvents()
  const box = document.createElement('div')
  box.id = 'kb-diagnose'
  box.setAttribute(
    'style',
    [
      'position:fixed',
      'left:6px',
      'bottom:6px',
      'z-index:2147483647',
      'max-width:min(94vw,360px)',
      'padding:7px 9px',
      'border-radius:8px',
      'background:rgba(0,0,0,.88)',
      'color:#f0f0f0',
      'font:600 12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace',
      'white-space:pre',
      // 不吃事件（不能挡住输入框与键盘），纯展示
      'pointer-events:none',
      'user-select:none',
      'letter-spacing:.01em',
    ].join(';'),
  )
  document.body.appendChild(box)

  const render = () => {
    box.textContent =
      'KEYBOARD DIAG\n' +
      collect()
        .map((r) => `${r.warn ? '⚠ ' : '  '}${r.label.padEnd(13, ' ')} ${r.value}`)
        .join('\n')
  }
  render()
  // 键盘动画几百毫秒，单次采样会漏中间态；固定节拍连采
  setInterval(render, 400)
  // 同时把完整快照打回后端（节流 500ms，总共 60 条上限）。
  // 排查者本机 `tail -f /tmp/panel-keyboard-diag.jsonl` 就能看到全过程，
  // 不需要用户口述任何数字。
  postSnapshot()
  setInterval(postSnapshot, 500)
  window.addEventListener('resize', render)
  window.addEventListener('orientationchange', render)
  window.visualViewport?.addEventListener('resize', render)
  window.visualViewport?.addEventListener('scroll', render)
}

export function initKeyboardDiagnose(): void {
  if (document.body) mount()
  else window.addEventListener('DOMContentLoaded', () => mount(), { once: true })
}

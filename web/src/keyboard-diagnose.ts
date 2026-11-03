//! 软键盘 / 视口诊断浮层（2026-11）
//!
//! 用途：手机上「键盘弹起后界面错位」类问题，靠猜浏览器行为是没用的 ——
//! iOS Safari、Android Chrome、各家 WebView 对键盘的处理互不相同
//! （有的压缩布局视口，有的只压视觉视口，有的顺手滚一下页面）。
//!
//! 这个模块只在 URL 带 `?diag`（或 `#diag`）时激活，右下角固定一块浮层，
//! 每 400ms 刷新真实数值。出问题时让用户带着参数刷新一次、弹出键盘、
//! 截图，就能直接定位是哪一层算错。
//!
//! 刻意做成「零依赖 + 独立文件」：
//!   - 不 import 任何 Vue / 组件，避免把调试代码拖进主 chunk 的逻辑；
//!   - 由 main.ts 动态 import（`if (needDiag()) import(...)`），
//!     生产包里它是个独立小 chunk，只有带参数时才会下载。
//!
//! 浮层本身：`pointer-events: none`（不挡输入）、`position: fixed`、
//! 半透明黑底白字、等宽字体、字号 10px —— 手机上要能一屏看全。

interface Sample {
  label: string
  value: string
  /** 异常时高亮（红底），正常不上色 */
  warn?: boolean
}

function num(n: number | undefined | null, digits = 1): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—'
  return n.toFixed(digits)
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '—'
}

function collect(): Sample[] {
  const vv = window.visualViewport
  const root = document.querySelector<HTMLElement>('.chat-view')
  const composer = document.querySelector<HTMLElement>('.chat-composer-float')
  const rootRect = root?.getBoundingClientRect()
  const composerRect = composer?.getBoundingClientRect()

  // 「键盘把我们压掉了多少」——两套口径都列出来，看它们是否一致。
  // 不一致正是错位的来源（一个按布局视口算、一个按容器实高算）。
  const hiddenByViewport = vv ? window.innerHeight - vv.height - vv.offsetTop : 0
  const containerH = rootRect?.height ?? 0
  const containerShrunk = containerH < window.innerHeight - 80

  // 卡片距容器底部的实际距离 = CSS bottom 的 used value
  const bottomUsed =
    rootRect && composerRect ? rootRect.bottom - composerRect.bottom : Number.NaN

  const appH = Number.parseFloat(cssVar('--app-h'))

  const rows: Sample[] = [
    { label: 'innerHeight', value: num(window.innerHeight, 0) },
    { label: 'vv.height', value: num(vv?.height, 0) },
    { label: 'vv.offsetTop', value: num(vv?.offsetTop, 0) },
    { label: '压掉(布局口径)', value: num(hiddenByViewport, 0), warn: hiddenByViewport > 80 },
    { label: '--app-h', value: Number.isNaN(appH) ? '—' : num(appH, 0) },
    {
      label: 'app-h 与 innerHeight 差',
      value: Number.isNaN(appH) ? '—' : num(appH - window.innerHeight, 0),
      warn: !Number.isNaN(appH) && Math.abs(appH - window.innerHeight) > 80,
    },
    { label: '.chat-view 高', value: num(containerH, 0) },
    {
      label: '容器已压缩?',
      value: containerShrunk ? '是' : '否',
      warn: containerShrunk,
    },
    { label: '卡片 top', value: num(composerRect?.top, 0) },
    { label: '卡片 bottom', value: num(composerRect?.bottom, 0) },
    { label: '卡片距容器底', value: num(bottomUsed, 0) },
    {
      label: '--composer-bottom-gap',
      value: composer
        ? getComputedStyle(composer).getPropertyValue('--composer-bottom-gap').trim() || '—'
        : '—',
    },
    {
      label: '--chat-field-font',
      value: composer
        ? getComputedStyle(composer).getPropertyValue('--chat-field-font').trim() || '—'
        : '—',
    },
    {
      label: '贴角轮廓',
      value: composer?.style.getPropertyValue('--composer-corner-r') || 'none',
    },
    { label: 'scrollY', value: num(window.scrollY, 0), warn: window.scrollY > 0 },
    { label: 'vv.pageTop', value: num(vv?.pageTop, 0) },
    { label: 'pointer:coarse', value: String(matchMedia('(pointer: coarse)').matches) },
  ]
  return rows
}

function mount(): void {
  const box = document.createElement('div')
  box.id = 'kb-diagnose'
  box.setAttribute(
    'style',
    [
      'position:fixed',
      'right:6px',
      'bottom:6px',
      'z-index:2147483647',
      'max-width:min(92vw,340px)',
      'padding:6px 8px',
      'border-radius:8px',
      'background:rgba(0,0,0,.82)',
      'color:#e8e8e8',
      'font:10px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace',
      'white-space:pre',
      'pointer-events:none',
      'user-select:none',
    ].join(';'),
  )
  document.body.appendChild(box)

  const render = () => {
    const rows = collect()
    box.textContent =
      'KEYBOARD DIAG\n' +
      rows
        .map((r) => `${r.warn ? '⚠ ' : '  '}${r.label.padEnd(20, ' ')} ${r.value}`)
        .join('\n')
  }
  render()
  // 键盘动画有几百毫秒，单次采样会漏掉中间态；用固定节拍连采
  setInterval(render, 400)
  window.addEventListener('resize', render)
  window.addEventListener('orientationchange', render)
  window.visualViewport?.addEventListener('resize', render)
  window.visualViewport?.addEventListener('scroll', render)
}

/** 是否需要诊断：`?diag`、`?diag=1`、`#diag` 都算。 */
export function needDiag(): boolean {
  try {
    const search = window.location.search
    const hash = window.location.hash
    return /[?&]diag\b/.test(search) || /(^|[#&])diag\b/.test(hash)
  } catch {
    return false
  }
}

export function initKeyboardDiagnose(): void {
  if (document.body) mount()
  else window.addEventListener('DOMContentLoaded', () => mount(), { once: true })
}

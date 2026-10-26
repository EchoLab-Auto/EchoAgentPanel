import { computed as T } from "vue";
import { ConfigKey as S } from "./composables/useConfig.js";
import { useConfig as Jr } from "./composables/useConfig.js";
import { useFocusStack as oe } from "./composables/useFocusStack.js";
import { Z_LAYERS as ee, Z_STRIDE as me, useZIndex as te } from "./composables/useZIndex.js";
import { useSwipe as ie } from "./composables/useSwipe.js";
import { createTheme as ae, getAntiFlickerScript as ne, provideTheme as ue, useTheme as fe } from "./composables/useTheme.js";
import { default as he } from "./composables/useFloatingPosition.js";
import { default as le } from "./composables/useScrollbar.js";
import { default as xe } from "./composables/useChartInteraction.js";
import { useSelect as ge } from "./composables/useSelect.js";
import { default as Te } from "./composables/usePixelLogoAnimation.js";
import { u as be } from "./chunks/useArtRenderer-CTcyDtd9.js";
import { prefersReducedMotion as b } from "./composables/useReducedMotion.js";
import { default as Pe } from "./composables/useReducedMotion.js";
import { default as Me } from "./composables/useProgress.js";
import { useTabs as ye } from "./composables/useTabs.js";
import { usePagination as Fe } from "./composables/usePagination.js";
import { useTree as Ee } from "./composables/useTree.js";
import { useTable as _e } from "./composables/useTable.js";
import { useCollapse as ke } from "./composables/useCollapse.js";
import { useModal as Be } from "./composables/useModal.js";
import { useToast as Ke } from "./composables/useToast.js";
import { useAlert as Ye } from "./composables/useAlert.js";
import { useTooltip as Xe } from "./composables/useTooltip.js";
import { useTouchDevice as Ue } from "./composables/useTouchDevice.js";
import { useCheckable as je } from "./composables/useCheckable.js";
import { useFormField as He } from "./composables/useFormField.js";
import { useSlider as Qe } from "./composables/useSlider.js";
import { useNumberInput as rm } from "./composables/useNumberInput.js";
import { usePopover as mm } from "./composables/usePopover.js";
import { useSteps as sm } from "./composables/useSteps.js";
import { useDrawer as pm } from "./composables/useDrawer.js";
import { useMenu as nm } from "./composables/useMenu.js";
import { useVirtualList as fm } from "./composables/useVirtualList.js";
import { useDatePicker as hm } from "./composables/useDatePicker.js";
import { useUpload as lm } from "./composables/useUpload.js";
import { useAutoComplete as xm } from "./composables/useAutoComplete.js";
import { useClipboard as gm } from "./composables/useClipboard.js";
import { useChatScroll as Tm } from "./composables/useChatScroll.js";
import { isImeComposing as bm, useChatInput as Lm } from "./composables/useChatInput.js";
import { useSegmented as Am } from "./composables/useSegmented.js";
import { validateFieldValue as wm } from "./composables/useFormValidation.js";
import { useChart as Rm } from "./composables/useChart.js";
import { useBarChart as Im } from "./composables/useBarChart.js";
import { useLineChart as Dm } from "./composables/useLineChart.js";
import { usePieChart as $m } from "./composables/usePieChart.js";
import { useCandlestickChart as Gm } from "./composables/useCandlestickChart.js";
import { createChartRenderer as Om } from "./composables/chartCanvasRenderer.js";
import { LocaleKey as Vm, getLocaleMessages as Ym, provideLocale as qm, useLocale as Xm } from "./composables/useLocale.js";
import { enUS as Um, zhCN as Zm } from "./locales/index.js";
import { debounce as Wm, generateId as Hm, isEmpty as Jm } from "./utils/index.js";
import { C as ot } from "./chunks/componentRegistry-B-lS5uh-.js";
import { u as et } from "./chunks/createComponent-jnXBYqCm.js";
import { FormKey as tt, RadioGroupKey as st, RowGutterKey as it } from "./composables/injectionKeys.js";
import { N as L } from "./chunks/NeumorphismIcon-CFyBR-Sk.js";
import { N as P } from "./chunks/NeumorphismSegmented-D0IA-Exa.js";
import { N as A } from "./chunks/NeumorphismStatusDot-NAkWEQHr.js";
import { N as M } from "./chunks/NeumorphismSpinner-CeTom7p_.js";
import { N as w } from "./chunks/NeumorphismChartCandlestick-CkCTva9p.js";
import { N as y } from "./chunks/NeumorphismChartPie-9GSJM5aN.js";
import { N as R } from "./chunks/NeumorphismChartLine-15phue5l.js";
import { N as F } from "./chunks/NeumorphismChartBar-DhKQR0v6.js";
import { N as I } from "./chunks/NeumorphismAutoComplete-DUdl0m1v.js";
import { N as E } from "./chunks/NeumorphismUpload-DRpv9ezy.js";
import { N as D } from "./chunks/NeumorphismList-CLsbP4vY.js";
import { N as _ } from "./chunks/NeumorphismDatePicker-BFlS8eDx.js";
import { N as $ } from "./chunks/NeumorphismVirtualList-CYJsckGD.js";
import { N as k } from "./chunks/NeumorphismSteps-CUABSjJs.js";
import { N as G } from "./chunks/NeumorphismNavMenu-B4zz7kIL.js";
import { N as B } from "./chunks/NeumorphismMenu-DMUXJc30.js";
import { N as O } from "./chunks/NeumorphismDrawer-BIJRdslS.js";
import { N as K } from "./chunks/NeumorphismInputNumber-C5VT9que.js";
import { N as V } from "./chunks/NeumorphismSlider-lF-Hgp8q.js";
import { N as Y } from "./chunks/NeumorphismFieldError-BxamHjhs.js";
import { N as q } from "./chunks/NeumorphismFieldLabel-C3S1Ax2f.js";
import { N as X } from "./chunks/NeumorphismGraphView-CW9Vk3Mi.js";
import { N as z } from "./chunks/NeumorphismPixelFont-gsT7d_OL.js";
import { N as U } from "./chunks/NeumorphismAsciiArt-BEiZakkh.js";
import { N as Z } from "./chunks/NeumorphismArt-LEPboG_a.js";
import { N as j } from "./chunks/NeumorphismLogo-Cr2dvjMH.js";
import { N as W } from "./chunks/NeumorphismCanvas-a4F1ouPw.js";
import { a as H, N as J } from "./chunks/NeumorphismTree-fQBHMCMo.js";
import { N as Q } from "./chunks/NeumorphismThemeToggle-D2_PXFjy.js";
import { N as oo } from "./chunks/NeumorphismLayout-BD9_QR5T.js";
import { N as ro, a as eo } from "./chunks/NeumorphismCol-BiaTAjWV.js";
import { N as mo } from "./chunks/NeumorphismContainer-CGr-px2A.js";
import { N as to } from "./chunks/NeumorphismCollapse-Bxkrt0x3.js";
import { N as so } from "./chunks/NeumorphismDivider-BzjZ5AP8.js";
import { N as io } from "./chunks/NeumorphismTable-D-0DYS_2.js";
import { N as po } from "./chunks/NeumorphismSkeleton-Bxt10H5L.js";
import { _ as ao } from "./chunks/NeumorphismScrollbar.vue_vue_type_script_setup_true_lang-PwK95onm.js";
import { N as no } from "./chunks/NeumorphismProgress-DgBEzBEP.js";
import { N as uo } from "./chunks/NeumorphismEmpty-CUOxO4ra.js";
import { N as fo } from "./chunks/NeumorphismDropdown-IdvKvRCI.js";
import { N as No } from "./chunks/NeumorphismPopover-m8EjDIRe.js";
import { N as ho } from "./chunks/NeumorphismAlert-hqCvzAcm.js";
import { N as co } from "./chunks/NeumorphismTag-C6c5RGls.js";
import { N as lo } from "./chunks/NeumorphismBadge-BLGlrhXp.js";
import { N as xo } from "./chunks/NeumorphismAvatar-DXF3SXCq.js";
import { N as Co } from "./chunks/NeumorphismPagination-C4Ku4eqt.js";
import { N as go } from "./chunks/NeumorphismBreadcrumb-C276Gz1t.js";
import { N as vo } from "./chunks/NeumorphismTabs-BKZNO3V6.js";
import { N as To } from "./chunks/NeumorphismTooltip-pagvhUIJ.js";
import { N as So } from "./chunks/NeumorphismToastProvider-BeGW7CfW.js";
import { N as bo } from "./chunks/NeumorphismModal-Q0vdBg1Z.js";
import { a as Lo, N as Po } from "./chunks/NeumorphismFormItem-C2SyjkSC.js";
import { N as Ao } from "./chunks/NeumorphismTextarea-DNgiNkhm.js";
import { N as Mo } from "./chunks/NeumorphismSelect-Z7lyo_uY.js";
import { a as wo, N as yo } from "./chunks/NeumorphismRadioGroup-DosxsBas.js";
import { N as Ro } from "./chunks/NeumorphismCheckbox-B5UkOay2.js";
import { T as Fo } from "./chunks/ThemeProvider-CCR_TjUs.js";
import { N as Io } from "./chunks/NeumorphismInput-Bk0rWMyD.js";
import { N as Eo } from "./chunks/NeumorphismCard-D5NmwYTE.js";
import { N as Do } from "./chunks/NeumorphismSwitch-Bg5yf_Pl.js";
import { N as _o } from "./chunks/NeumorphismButton-CJnORKTl.js";
import { G as at, g as nt, n as ut } from "./chunks/glass-BqY-XLAc.js";
import { p as Nt, a as ht, s as ct, b as lt, c as dt, d as xt, e as Ct } from "./chunks/squircle-D5heR-hJ.js";
import './ui-frame.css';const c = /* @__PURE__ */ new WeakMap();
function $o() {
  return typeof window < "u" && window.matchMedia("(pointer: coarse)").matches;
}
const Zr = {
  mounted(o, m) {
    if ($o() || b()) return;
    const e = m.value ?? {}, p = e.strength ?? 6, a = e.rotation ?? 3, u = o.style.transform || "";
    let t = null;
    function r(N) {
      t || (t = requestAnimationFrame(() => {
        t = null;
        const s = o.getBoundingClientRect(), i = s.left + s.width / 2, n = s.top + s.height / 2, h = (N.clientX - i) / (s.width / 2), l = (N.clientY - n) / (s.height / 2), x = h * p, C = l * p, g = -l * a, v = h * a;
        o.style.transform = `translate3d(${x}px, ${C}px, 0) rotateX(${g}deg) rotateY(${v}deg)`, o.style.transition = "transform 0.1s ease-out";
      }));
    }
    function f() {
      t && (cancelAnimationFrame(t), t = null), o.style.transform = u, o.style.transition = "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)";
    }
    o.addEventListener("mousemove", r, { passive: !0 }), o.addEventListener("mouseleave", f), c.set(o, { onMouseMove: r, onMouseLeave: f, rafId: t, originalTransform: u });
  },
  unmounted(o) {
    const m = c.get(o);
    m && (o.removeEventListener("mousemove", m.onMouseMove), o.removeEventListener("mouseleave", m.onMouseLeave), m.rafId && cancelAnimationFrame(m.rafId), c.delete(o));
  }
}, d = {
  NeumorphismButton: _o,
  NeumorphismSwitch: Do,
  NeumorphismCard: Eo,
  NeumorphismInput: Io,
  ThemeProvider: Fo,
  NeumorphismCheckbox: Ro,
  NeumorphismRadio: yo,
  NeumorphismRadioGroup: wo,
  NeumorphismSelect: Mo,
  NeumorphismTextarea: Ao,
  NeumorphismForm: Po,
  NeumorphismFormItem: Lo,
  NeumorphismModal: bo,
  NeumorphismToastProvider: So,
  NeumorphismTooltip: To,
  NeumorphismTabs: vo,
  NeumorphismBreadcrumb: go,
  NeumorphismPagination: Co,
  NeumorphismAvatar: xo,
  NeumorphismBadge: lo,
  NeumorphismTag: co,
  NeumorphismAlert: ho,
  NeumorphismPopover: No,
  NeumorphismDropdown: fo,
  NeumorphismEmpty: uo,
  NeumorphismProgress: no,
  NeumorphismScrollbar: ao,
  NeumorphismSkeleton: po,
  NeumorphismTable: io,
  NeumorphismDivider: so,
  NeumorphismCollapse: to,
  NeumorphismContainer: mo,
  NeumorphismRow: eo,
  NeumorphismCol: ro,
  NeumorphismLayout: oo,
  NeumorphismThemeToggle: Q,
  NeumorphismTree: J,
  NeumorphismTreeNode: H,
  NeumorphismCanvas: W,
  NeumorphismLogo: j,
  NeumorphismArt: Z,
  NeumorphismAsciiArt: U,
  NeumorphismPixelFont: z,
  NeumorphismGraphView: X,
  NeumorphismFieldLabel: q,
  NeumorphismFieldError: Y,
  NeumorphismSlider: V,
  NeumorphismInputNumber: K,
  NeumorphismDrawer: O,
  NeumorphismMenu: B,
  NeumorphismNavMenu: G,
  NeumorphismSteps: k,
  NeumorphismVirtualList: $,
  NeumorphismDatePicker: _,
  NeumorphismList: D,
  NeumorphismUpload: E,
  NeumorphismAutoComplete: I,
  NeumorphismChartBar: F,
  NeumorphismChartLine: R,
  NeumorphismChartPie: y,
  NeumorphismChartCandlestick: w,
  NeumorphismSpinner: M,
  NeumorphismStatusDot: A,
  NeumorphismSegmented: P,
  NeumorphismIcon: L
};
function ko(o, m) {
  var f, N, s;
  const e = m ?? {}, p = "config" in e || "components" in e || "prefix" in e || "hooks" in e, a = p ? e.config : m, u = p ? e.components ?? {} : {}, t = p ? e.prefix ?? "" : "", r = (p ? e.hooks : void 0) ?? {};
  a && (o.provide(
    S,
    T(() => a)
  ), (f = r.onConfigChange) == null || f.call(r, a), a.rtl && typeof document < "u" && document.documentElement.setAttribute("dir", "rtl"));
  for (const [i, n] of Object.entries(d)) {
    const h = u[i] ?? n;
    o.component(`${t}${i}`, h), (N = r.onComponentRegister) == null || N.call(r, i, h);
  }
  for (const [i, n] of Object.entries(u))
    i in d || (o.component(`${t}${i}`, n), (s = r.onComponentRegister) == null || s.call(r, i, n));
}
const jr = {
  install: ko,
  version: "1.3.2-dev.4"
};
export {
  ot as ComponentRegistry,
  S as ConfigKey,
  tt as FormKey,
  at as GLASS_VARIANTS,
  Vm as LocaleKey,
  ho as NeumorphismAlert,
  Z as NeumorphismArt,
  U as NeumorphismAsciiArt,
  I as NeumorphismAutoComplete,
  xo as NeumorphismAvatar,
  lo as NeumorphismBadge,
  go as NeumorphismBreadcrumb,
  _o as NeumorphismButton,
  W as NeumorphismCanvas,
  Eo as NeumorphismCard,
  F as NeumorphismChartBar,
  w as NeumorphismChartCandlestick,
  R as NeumorphismChartLine,
  y as NeumorphismChartPie,
  Ro as NeumorphismCheckbox,
  ro as NeumorphismCol,
  to as NeumorphismCollapse,
  mo as NeumorphismContainer,
  _ as NeumorphismDatePicker,
  so as NeumorphismDivider,
  O as NeumorphismDrawer,
  fo as NeumorphismDropdown,
  uo as NeumorphismEmpty,
  Y as NeumorphismFieldError,
  q as NeumorphismFieldLabel,
  Po as NeumorphismForm,
  Lo as NeumorphismFormItem,
  X as NeumorphismGraphView,
  L as NeumorphismIcon,
  Io as NeumorphismInput,
  K as NeumorphismInputNumber,
  oo as NeumorphismLayout,
  D as NeumorphismList,
  j as NeumorphismLogo,
  B as NeumorphismMenu,
  bo as NeumorphismModal,
  G as NeumorphismNavMenu,
  Co as NeumorphismPagination,
  z as NeumorphismPixelFont,
  No as NeumorphismPopover,
  no as NeumorphismProgress,
  yo as NeumorphismRadio,
  wo as NeumorphismRadioGroup,
  eo as NeumorphismRow,
  ao as NeumorphismScrollbar,
  P as NeumorphismSegmented,
  Mo as NeumorphismSelect,
  po as NeumorphismSkeleton,
  V as NeumorphismSlider,
  M as NeumorphismSpinner,
  A as NeumorphismStatusDot,
  k as NeumorphismSteps,
  Do as NeumorphismSwitch,
  io as NeumorphismTable,
  vo as NeumorphismTabs,
  co as NeumorphismTag,
  Ao as NeumorphismTextarea,
  Q as NeumorphismThemeToggle,
  So as NeumorphismToastProvider,
  To as NeumorphismTooltip,
  J as NeumorphismTree,
  H as NeumorphismTreeNode,
  E as NeumorphismUpload,
  $ as NeumorphismVirtualList,
  st as RadioGroupKey,
  it as RowGutterKey,
  Fo as ThemeProvider,
  ee as Z_LAYERS,
  me as Z_STRIDE,
  Om as createChartRenderer,
  ae as createTheme,
  Wm as debounce,
  jr as default,
  Um as enUS,
  Hm as generateId,
  ne as getAntiFlickerScript,
  Ym as getLocaleMessages,
  nt as glassClassNames,
  ko as install,
  Jm as isEmpty,
  bm as isImeComposing,
  ut as normalizeGlass,
  Nt as pointsToClipPath,
  ht as pointsToPathData,
  b as prefersReducedMotion,
  qm as provideLocale,
  ue as provideTheme,
  ct as sampleCornerOffset,
  lt as squircleClipPath,
  dt as squirclePoints,
  xt as squirclePower,
  Ct as superellipseCorner,
  Ye as useAlert,
  be as useArtRenderer,
  xm as useAutoComplete,
  Im as useBarChart,
  Gm as useCandlestickChart,
  Rm as useChart,
  xe as useChartInteraction,
  Lm as useChatInput,
  Tm as useChatScroll,
  je as useCheckable,
  gm as useClipboard,
  ke as useCollapse,
  Jr as useConfig,
  hm as useDatePicker,
  pm as useDrawer,
  he as useFloatingPosition,
  oe as useFocusStack,
  He as useFormField,
  Dm as useLineChart,
  Xm as useLocale,
  nm as useMenu,
  Be as useModal,
  et as useNeumorphismSetup,
  rm as useNumberInput,
  Fe as usePagination,
  $m as usePieChart,
  Te as usePixelLogoAnimation,
  mm as usePopover,
  Me as useProgress,
  Pe as useReducedMotion,
  le as useScrollbar,
  Am as useSegmented,
  ge as useSelect,
  Qe as useSlider,
  sm as useSteps,
  ie as useSwipe,
  _e as useTable,
  ye as useTabs,
  fe as useTheme,
  Ke as useToast,
  Xe as useTooltip,
  Ue as useTouchDevice,
  Ee as useTree,
  lm as useUpload,
  fm as useVirtualList,
  te as useZIndex,
  Zr as vMagnetic,
  wm as validateFieldValue,
  Zm as zhCN
};

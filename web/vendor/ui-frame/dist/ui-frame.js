import { computed as T } from "vue";
import { ConfigKey as S } from "./composables/useConfig.js";
import { useConfig as zr } from "./composables/useConfig.js";
import { useFocusStack as Wr } from "./composables/useFocusStack.js";
import { Z_LAYERS as Jr, Z_STRIDE as Qr, useZIndex as oe } from "./composables/useZIndex.js";
import { useSwipe as ee } from "./composables/useSwipe.js";
import { createTheme as te, getAntiFlickerScript as se, provideTheme as ie, useTheme as pe } from "./composables/useTheme.js";
import { default as ne } from "./composables/useFloatingPosition.js";
import { default as fe } from "./composables/useScrollbar.js";
import { default as he } from "./composables/useChartInteraction.js";
import { useSelect as de } from "./composables/useSelect.js";
import { default as xe } from "./composables/usePixelLogoAnimation.js";
import { useArtRenderer as Ce } from "./composables/useArtRenderer.js";
import { prefersReducedMotion as b } from "./composables/useReducedMotion.js";
import { default as Te } from "./composables/useReducedMotion.js";
import { default as be } from "./composables/useProgress.js";
import { useTabs as Me } from "./composables/useTabs.js";
import { usePagination as Ae } from "./composables/usePagination.js";
import { useTree as Pe } from "./composables/useTree.js";
import { useTable as Re } from "./composables/useTable.js";
import { useCollapse as Ee } from "./composables/useCollapse.js";
import { useModal as $e } from "./composables/useModal.js";
import { useToast as _e } from "./composables/useToast.js";
import { useAlert as Ke } from "./composables/useAlert.js";
import { useTooltip as Ye } from "./composables/useTooltip.js";
import { useTouchDevice as Ge } from "./composables/useTouchDevice.js";
import { useCheckable as Ve } from "./composables/useCheckable.js";
import { useFormField as je } from "./composables/useFormField.js";
import { useSlider as qe } from "./composables/useSlider.js";
import { useNumberInput as He } from "./composables/useNumberInput.js";
import { usePopover as Qe } from "./composables/usePopover.js";
import { useSteps as rm } from "./composables/useSteps.js";
import { useDrawer as mm } from "./composables/useDrawer.js";
import { useMenu as sm } from "./composables/useMenu.js";
import { useVirtualList as pm } from "./composables/useVirtualList.js";
import { useDatePicker as nm } from "./composables/useDatePicker.js";
import { useUpload as fm } from "./composables/useUpload.js";
import { useAutoComplete as hm } from "./composables/useAutoComplete.js";
import { useClipboard as dm } from "./composables/useClipboard.js";
import { useChatScroll as xm } from "./composables/useChatScroll.js";
import { isImeComposing as Cm, useChatInput as vm } from "./composables/useChatInput.js";
import { useSegmented as Sm } from "./composables/useSegmented.js";
import { validateFieldValue as Lm } from "./composables/useFormValidation.js";
import { useChart as ym } from "./composables/useChart.js";
import { useBarChart as wm } from "./composables/useBarChart.js";
import { useLineChart as Fm } from "./composables/useLineChart.js";
import { usePieChart as Im } from "./composables/usePieChart.js";
import { useCandlestickChart as Dm } from "./composables/useCandlestickChart.js";
import { createChartRenderer as km } from "./composables/chartCanvasRenderer.js";
import { LocaleKey as Bm, getLocaleMessages as Km, provideLocale as Om, useLocale as Ym } from "./composables/useLocale.js";
import { enUS as Gm, zhCN as Um } from "./locales/index.js";
import { debounce as Zm, generateId as jm, isEmpty as zm } from "./utils/index.js";
import { C as Wm } from "./chunks/componentRegistry-B-lS5uh-.js";
import { u as Jm } from "./chunks/createComponent-jnXBYqCm.js";
import { FormKey as ot, RadioGroupKey as rt, RowGutterKey as et } from "./composables/injectionKeys.js";
import { N as L } from "./chunks/NeumorphismSegmented-D9q1A1Xr.js";
import { N as M } from "./chunks/NeumorphismStatusDot-DVKfRlP8.js";
import { N as y } from "./chunks/NeumorphismSpinner-CecIG42-.js";
import { N as A } from "./chunks/NeumorphismChartCandlestick-CkCTva9p.js";
import { N as w } from "./chunks/NeumorphismChartPie-9GSJM5aN.js";
import { N as P } from "./chunks/NeumorphismChartLine-CpQfVJga.js";
import { N as F } from "./chunks/NeumorphismChartBar-DhKQR0v6.js";
import { N as R } from "./chunks/NeumorphismAutoComplete-IYF1k55N.js";
import { N as I } from "./chunks/NeumorphismUpload-lLXl0erH.js";
import { N as E } from "./chunks/NeumorphismList-xtxqOyjk.js";
import { N as D } from "./chunks/NeumorphismDatePicker-BfUMShI2.js";
import { N as $ } from "./chunks/NeumorphismVirtualList-CYJsckGD.js";
import { N as k } from "./chunks/NeumorphismSteps-BtUd-8p1.js";
import { N as _ } from "./chunks/NeumorphismNavMenu-DAG7c74I.js";
import { N as B } from "./chunks/NeumorphismMenu-DJrsWv9p.js";
import { N as K } from "./chunks/NeumorphismDrawer-CM9So2kx.js";
import { N as O } from "./chunks/NeumorphismInputNumber-HxsLULrQ.js";
import { N as Y } from "./chunks/NeumorphismSlider-Dz-659J6.js";
import { N as X } from "./chunks/NeumorphismFieldError-BxamHjhs.js";
import { N as G } from "./chunks/NeumorphismFieldLabel-C3S1Ax2f.js";
import { N as U } from "./chunks/NeumorphismPixelFont-gsT7d_OL.js";
import { N as V } from "./chunks/NeumorphismAsciiArt-BBIVoYBF.js";
import { N as Z } from "./chunks/NeumorphismArt-dTpvKClT.js";
import { N as j } from "./chunks/NeumorphismLogo-JYOrKIBD.js";
import { N as z } from "./chunks/NeumorphismCanvas-B8TpGQt6.js";
import { a as q, N as W } from "./chunks/NeumorphismTree-Dmru8CiZ.js";
import { N as H } from "./chunks/NeumorphismThemeToggle-DUyFtb7A.js";
import { N as J } from "./chunks/NeumorphismLayout-ortLGvgQ.js";
import { N as Q, a as oo } from "./chunks/NeumorphismCol-BiaTAjWV.js";
import { N as ro } from "./chunks/NeumorphismContainer-CGr-px2A.js";
import { N as eo } from "./chunks/NeumorphismCollapse-Bwqpy8Ts.js";
import { N as mo } from "./chunks/NeumorphismDivider-BzjZ5AP8.js";
import { N as to } from "./chunks/NeumorphismTable-BBmgPLHE.js";
import { N as so } from "./chunks/NeumorphismSkeleton-Bxt10H5L.js";
import { _ as io } from "./chunks/NeumorphismScrollbar.vue_vue_type_script_setup_true_lang-PwK95onm.js";
import { N as po } from "./chunks/NeumorphismProgress-D8vaRM9G.js";
import { N as ao } from "./chunks/NeumorphismEmpty--dig1NGG.js";
import { N as no } from "./chunks/NeumorphismDropdown-IdvKvRCI.js";
import { N as uo } from "./chunks/NeumorphismPopover-m8EjDIRe.js";
import { N as fo } from "./chunks/NeumorphismAlert-Ckl8dPqX.js";
import { N as No } from "./chunks/NeumorphismTag-D6Yz18Ws.js";
import { N as ho } from "./chunks/NeumorphismBadge-BLGlrhXp.js";
import { N as co } from "./chunks/NeumorphismAvatar-BBQ1Wrjq.js";
import { N as lo } from "./chunks/NeumorphismPagination-C7xprFdY.js";
import { N as xo } from "./chunks/NeumorphismBreadcrumb-CjxA6zQg.js";
import { N as go } from "./chunks/NeumorphismTabs-D5OwLAaC.js";
import { N as Co } from "./chunks/NeumorphismTooltip-pagvhUIJ.js";
import { N as vo } from "./chunks/NeumorphismToastProvider-BiNgckKj.js";
import { N as To } from "./chunks/NeumorphismModal-C28AbuwP.js";
import { a as So, N as bo } from "./chunks/NeumorphismFormItem-BySt7xa8.js";
import { N as Lo } from "./chunks/NeumorphismTextarea-D4alPN-q.js";
import { N as Mo } from "./chunks/NeumorphismSelect-CN_Bw-pj.js";
import { a as yo, N as Ao } from "./chunks/NeumorphismRadioGroup-CxVaAN76.js";
import { N as wo } from "./chunks/NeumorphismCheckbox-C1s5xpZU.js";
import { T as Po } from "./chunks/ThemeProvider-CCR_TjUs.js";
import { N as Fo } from "./chunks/NeumorphismInput-COGouhbp.js";
import { N as Ro } from "./chunks/NeumorphismCard-DGFr51dd.js";
import { N as Io } from "./chunks/NeumorphismSwitch-Bg5yf_Pl.js";
import { N as Eo } from "./chunks/NeumorphismButton-CTLPjGe-.js";
import './ui-frame.css';const c = /* @__PURE__ */ new WeakMap();
function Do() {
  return typeof window < "u" && window.matchMedia("(pointer: coarse)").matches;
}
const Ur = {
  mounted(o, m) {
    if (Do() || b()) return;
    const e = m.value ?? {}, p = e.strength ?? 6, a = e.rotation ?? 3, u = o.style.transform || "";
    let t = null;
    function r(N) {
      t || (t = requestAnimationFrame(() => {
        t = null;
        const s = o.getBoundingClientRect(), i = s.left + s.width / 2, n = s.top + s.height / 2, h = (N.clientX - i) / (s.width / 2), d = (N.clientY - n) / (s.height / 2), x = h * p, g = d * p, C = -d * a, v = h * a;
        o.style.transform = `translate3d(${x}px, ${g}px, 0) rotateX(${C}deg) rotateY(${v}deg)`, o.style.transition = "transform 0.1s ease-out";
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
}, l = {
  NeumorphismButton: Eo,
  NeumorphismSwitch: Io,
  NeumorphismCard: Ro,
  NeumorphismInput: Fo,
  ThemeProvider: Po,
  NeumorphismCheckbox: wo,
  NeumorphismRadio: Ao,
  NeumorphismRadioGroup: yo,
  NeumorphismSelect: Mo,
  NeumorphismTextarea: Lo,
  NeumorphismForm: bo,
  NeumorphismFormItem: So,
  NeumorphismModal: To,
  NeumorphismToastProvider: vo,
  NeumorphismTooltip: Co,
  NeumorphismTabs: go,
  NeumorphismBreadcrumb: xo,
  NeumorphismPagination: lo,
  NeumorphismAvatar: co,
  NeumorphismBadge: ho,
  NeumorphismTag: No,
  NeumorphismAlert: fo,
  NeumorphismPopover: uo,
  NeumorphismDropdown: no,
  NeumorphismEmpty: ao,
  NeumorphismProgress: po,
  NeumorphismScrollbar: io,
  NeumorphismSkeleton: so,
  NeumorphismTable: to,
  NeumorphismDivider: mo,
  NeumorphismCollapse: eo,
  NeumorphismContainer: ro,
  NeumorphismRow: oo,
  NeumorphismCol: Q,
  NeumorphismLayout: J,
  NeumorphismThemeToggle: H,
  NeumorphismTree: W,
  NeumorphismTreeNode: q,
  NeumorphismCanvas: z,
  NeumorphismLogo: j,
  NeumorphismArt: Z,
  NeumorphismAsciiArt: V,
  NeumorphismPixelFont: U,
  NeumorphismFieldLabel: G,
  NeumorphismFieldError: X,
  NeumorphismSlider: Y,
  NeumorphismInputNumber: O,
  NeumorphismDrawer: K,
  NeumorphismMenu: B,
  NeumorphismNavMenu: _,
  NeumorphismSteps: k,
  NeumorphismVirtualList: $,
  NeumorphismDatePicker: D,
  NeumorphismList: E,
  NeumorphismUpload: I,
  NeumorphismAutoComplete: R,
  NeumorphismChartBar: F,
  NeumorphismChartLine: P,
  NeumorphismChartPie: w,
  NeumorphismChartCandlestick: A,
  NeumorphismSpinner: y,
  NeumorphismStatusDot: M,
  NeumorphismSegmented: L
};
function $o(o, m) {
  var f, N, s;
  const e = m ?? {}, p = "config" in e || "components" in e || "prefix" in e || "hooks" in e, a = p ? e.config : m, u = p ? e.components ?? {} : {}, t = p ? e.prefix ?? "" : "", r = (p ? e.hooks : void 0) ?? {};
  a && (o.provide(
    S,
    T(() => a)
  ), (f = r.onConfigChange) == null || f.call(r, a), a.rtl && typeof document < "u" && document.documentElement.setAttribute("dir", "rtl"));
  for (const [i, n] of Object.entries(l)) {
    const h = u[i] ?? n;
    o.component(`${t}${i}`, h), (N = r.onComponentRegister) == null || N.call(r, i, h);
  }
  for (const [i, n] of Object.entries(u))
    i in l || (o.component(`${t}${i}`, n), (s = r.onComponentRegister) == null || s.call(r, i, n));
}
const Vr = {
  install: $o,
  version: "1.3.2-dev.4"
};
export {
  Wm as ComponentRegistry,
  S as ConfigKey,
  ot as FormKey,
  Bm as LocaleKey,
  fo as NeumorphismAlert,
  Z as NeumorphismArt,
  V as NeumorphismAsciiArt,
  R as NeumorphismAutoComplete,
  co as NeumorphismAvatar,
  ho as NeumorphismBadge,
  xo as NeumorphismBreadcrumb,
  Eo as NeumorphismButton,
  z as NeumorphismCanvas,
  Ro as NeumorphismCard,
  F as NeumorphismChartBar,
  A as NeumorphismChartCandlestick,
  P as NeumorphismChartLine,
  w as NeumorphismChartPie,
  wo as NeumorphismCheckbox,
  Q as NeumorphismCol,
  eo as NeumorphismCollapse,
  ro as NeumorphismContainer,
  D as NeumorphismDatePicker,
  mo as NeumorphismDivider,
  K as NeumorphismDrawer,
  no as NeumorphismDropdown,
  ao as NeumorphismEmpty,
  X as NeumorphismFieldError,
  G as NeumorphismFieldLabel,
  bo as NeumorphismForm,
  So as NeumorphismFormItem,
  Fo as NeumorphismInput,
  O as NeumorphismInputNumber,
  J as NeumorphismLayout,
  E as NeumorphismList,
  j as NeumorphismLogo,
  B as NeumorphismMenu,
  To as NeumorphismModal,
  _ as NeumorphismNavMenu,
  lo as NeumorphismPagination,
  U as NeumorphismPixelFont,
  uo as NeumorphismPopover,
  po as NeumorphismProgress,
  Ao as NeumorphismRadio,
  yo as NeumorphismRadioGroup,
  oo as NeumorphismRow,
  io as NeumorphismScrollbar,
  L as NeumorphismSegmented,
  Mo as NeumorphismSelect,
  so as NeumorphismSkeleton,
  Y as NeumorphismSlider,
  y as NeumorphismSpinner,
  M as NeumorphismStatusDot,
  k as NeumorphismSteps,
  Io as NeumorphismSwitch,
  to as NeumorphismTable,
  go as NeumorphismTabs,
  No as NeumorphismTag,
  Lo as NeumorphismTextarea,
  H as NeumorphismThemeToggle,
  vo as NeumorphismToastProvider,
  Co as NeumorphismTooltip,
  W as NeumorphismTree,
  q as NeumorphismTreeNode,
  I as NeumorphismUpload,
  $ as NeumorphismVirtualList,
  rt as RadioGroupKey,
  et as RowGutterKey,
  Po as ThemeProvider,
  Jr as Z_LAYERS,
  Qr as Z_STRIDE,
  km as createChartRenderer,
  te as createTheme,
  Zm as debounce,
  Vr as default,
  Gm as enUS,
  jm as generateId,
  se as getAntiFlickerScript,
  Km as getLocaleMessages,
  $o as install,
  zm as isEmpty,
  Cm as isImeComposing,
  b as prefersReducedMotion,
  Om as provideLocale,
  ie as provideTheme,
  Ke as useAlert,
  Ce as useArtRenderer,
  hm as useAutoComplete,
  wm as useBarChart,
  Dm as useCandlestickChart,
  ym as useChart,
  he as useChartInteraction,
  vm as useChatInput,
  xm as useChatScroll,
  Ve as useCheckable,
  dm as useClipboard,
  Ee as useCollapse,
  zr as useConfig,
  nm as useDatePicker,
  mm as useDrawer,
  ne as useFloatingPosition,
  Wr as useFocusStack,
  je as useFormField,
  Fm as useLineChart,
  Ym as useLocale,
  sm as useMenu,
  $e as useModal,
  Jm as useNeumorphismSetup,
  He as useNumberInput,
  Ae as usePagination,
  Im as usePieChart,
  xe as usePixelLogoAnimation,
  Qe as usePopover,
  be as useProgress,
  Te as useReducedMotion,
  fe as useScrollbar,
  Sm as useSegmented,
  de as useSelect,
  qe as useSlider,
  rm as useSteps,
  ee as useSwipe,
  Re as useTable,
  Me as useTabs,
  pe as useTheme,
  _e as useToast,
  Ye as useTooltip,
  Ge as useTouchDevice,
  Pe as useTree,
  fm as useUpload,
  pm as useVirtualList,
  oe as useZIndex,
  Ur as vMagnetic,
  Lm as validateFieldValue,
  Um as zhCN
};

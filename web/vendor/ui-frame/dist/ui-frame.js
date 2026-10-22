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
import { useSelect as Ce } from "./composables/useSelect.js";
import { default as Te } from "./composables/usePixelLogoAnimation.js";
import { useArtRenderer as Le } from "./composables/useArtRenderer.js";
import { prefersReducedMotion as L } from "./composables/useReducedMotion.js";
import { default as Ae } from "./composables/useReducedMotion.js";
import { default as ye } from "./composables/useProgress.js";
import { useTabs as Pe } from "./composables/useTabs.js";
import { usePagination as Fe } from "./composables/usePagination.js";
import { useTree as Ee } from "./composables/useTree.js";
import { useTable as _e } from "./composables/useTable.js";
import { useCollapse as ke } from "./composables/useCollapse.js";
import { useModal as Be } from "./composables/useModal.js";
import { useToast as Oe } from "./composables/useToast.js";
import { useAlert as Ye } from "./composables/useAlert.js";
import { useTooltip as ze } from "./composables/useTooltip.js";
import { useTouchDevice as Ze } from "./composables/useTouchDevice.js";
import { useCheckable as qe } from "./composables/useCheckable.js";
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
import { useClipboard as Cm } from "./composables/useClipboard.js";
import { useChatScroll as Tm } from "./composables/useChatScroll.js";
import { isImeComposing as Lm, useChatInput as bm } from "./composables/useChatInput.js";
import { useSegmented as Mm } from "./composables/useSegmented.js";
import { validateFieldValue as wm } from "./composables/useFormValidation.js";
import { useChart as Rm } from "./composables/useChart.js";
import { useBarChart as Im } from "./composables/useBarChart.js";
import { useLineChart as Dm } from "./composables/useLineChart.js";
import { usePieChart as $m } from "./composables/usePieChart.js";
import { useCandlestickChart as Gm } from "./composables/useCandlestickChart.js";
import { createChartRenderer as Km } from "./composables/chartCanvasRenderer.js";
import { LocaleKey as Vm, getLocaleMessages as Ym, provideLocale as Xm, useLocale as zm } from "./composables/useLocale.js";
import { enUS as Zm, zhCN as jm } from "./locales/index.js";
import { debounce as Wm, generateId as Hm, isEmpty as Jm } from "./utils/index.js";
import { C as ot } from "./chunks/componentRegistry-B-lS5uh-.js";
import { u as et } from "./chunks/createComponent-jnXBYqCm.js";
import { FormKey as tt, RadioGroupKey as st, RowGutterKey as it } from "./composables/injectionKeys.js";
import { N as b } from "./chunks/NeumorphismIcon-CFyBR-Sk.js";
import { N as A } from "./chunks/NeumorphismSegmented-DUFOQtRa.js";
import { N as M } from "./chunks/NeumorphismStatusDot-DVKfRlP8.js";
import { N as y } from "./chunks/NeumorphismSpinner-CecIG42-.js";
import { N as w } from "./chunks/NeumorphismChartCandlestick-CkCTva9p.js";
import { N as P } from "./chunks/NeumorphismChartPie-9GSJM5aN.js";
import { N as R } from "./chunks/NeumorphismChartLine-15phue5l.js";
import { N as F } from "./chunks/NeumorphismChartBar-DhKQR0v6.js";
import { N as I } from "./chunks/NeumorphismAutoComplete-1o1RCSnB.js";
import { N as E } from "./chunks/NeumorphismUpload-DiwjI4tx.js";
import { N as D } from "./chunks/NeumorphismList-xtxqOyjk.js";
import { N as _ } from "./chunks/NeumorphismDatePicker-CVd_I5qJ.js";
import { N as $ } from "./chunks/NeumorphismVirtualList-CYJsckGD.js";
import { N as k } from "./chunks/NeumorphismSteps-21xthHjN.js";
import { N as G } from "./chunks/NeumorphismNavMenu-I1ZtnoYf.js";
import { N as B } from "./chunks/NeumorphismMenu-Bh-uVq53.js";
import { N as K } from "./chunks/NeumorphismDrawer-BIJRdslS.js";
import { N as O } from "./chunks/NeumorphismInputNumber-DP6f---b.js";
import { N as V } from "./chunks/NeumorphismSlider-Dz-659J6.js";
import { N as Y } from "./chunks/NeumorphismFieldError-BxamHjhs.js";
import { N as X } from "./chunks/NeumorphismFieldLabel-C3S1Ax2f.js";
import { N as z } from "./chunks/NeumorphismGraphView-CW9Vk3Mi.js";
import { N as U } from "./chunks/NeumorphismPixelFont-gsT7d_OL.js";
import { N as Z } from "./chunks/NeumorphismAsciiArt-BAzPGKAw.js";
import { N as j } from "./chunks/NeumorphismArt-dTpvKClT.js";
import { N as q } from "./chunks/NeumorphismLogo-JYOrKIBD.js";
import { N as W } from "./chunks/NeumorphismCanvas-a4F1ouPw.js";
import { a as H, N as J } from "./chunks/NeumorphismTree-fQBHMCMo.js";
import { N as Q } from "./chunks/NeumorphismThemeToggle-DBfRRh5v.js";
import { N as oo } from "./chunks/NeumorphismLayout-BD9_QR5T.js";
import { N as ro, a as eo } from "./chunks/NeumorphismCol-BiaTAjWV.js";
import { N as mo } from "./chunks/NeumorphismContainer-CGr-px2A.js";
import { N as to } from "./chunks/NeumorphismCollapse-rovsFH46.js";
import { N as so } from "./chunks/NeumorphismDivider-BzjZ5AP8.js";
import { N as io } from "./chunks/NeumorphismTable-BdgPldgz.js";
import { N as po } from "./chunks/NeumorphismSkeleton-Bxt10H5L.js";
import { _ as ao } from "./chunks/NeumorphismScrollbar.vue_vue_type_script_setup_true_lang-PwK95onm.js";
import { N as no } from "./chunks/NeumorphismProgress-D8vaRM9G.js";
import { N as uo } from "./chunks/NeumorphismEmpty--dig1NGG.js";
import { N as fo } from "./chunks/NeumorphismDropdown-IdvKvRCI.js";
import { N as No } from "./chunks/NeumorphismPopover-m8EjDIRe.js";
import { N as ho } from "./chunks/NeumorphismAlert-CTsFWSs2.js";
import { N as co } from "./chunks/NeumorphismTag-C9hlXpsv.js";
import { N as lo } from "./chunks/NeumorphismBadge-BLGlrhXp.js";
import { N as xo } from "./chunks/NeumorphismAvatar-BBQ1Wrjq.js";
import { N as go } from "./chunks/NeumorphismPagination-4Z5JGufi.js";
import { N as Co } from "./chunks/NeumorphismBreadcrumb-CjxA6zQg.js";
import { N as vo } from "./chunks/NeumorphismTabs-D5OwLAaC.js";
import { N as To } from "./chunks/NeumorphismTooltip-pagvhUIJ.js";
import { N as So } from "./chunks/NeumorphismToastProvider-BeGW7CfW.js";
import { N as Lo } from "./chunks/NeumorphismModal-Brt1Bzz0.js";
import { a as bo, N as Ao } from "./chunks/NeumorphismFormItem-BySt7xa8.js";
import { N as Mo } from "./chunks/NeumorphismTextarea-BPesp-1r.js";
import { N as yo } from "./chunks/NeumorphismSelect-BykTSW-U.js";
import { a as wo, N as Po } from "./chunks/NeumorphismRadioGroup-CxVaAN76.js";
import { N as Ro } from "./chunks/NeumorphismCheckbox-CLyqAgEc.js";
import { T as Fo } from "./chunks/ThemeProvider-CCR_TjUs.js";
import { N as Io } from "./chunks/NeumorphismInput-CWarV170.js";
import { N as Eo } from "./chunks/NeumorphismCard-BgpR689L.js";
import { N as Do } from "./chunks/NeumorphismSwitch-Bg5yf_Pl.js";
import { N as _o } from "./chunks/NeumorphismButton-C7gkn79g.js";
import { G as at, g as nt, n as ut } from "./chunks/glass-BqY-XLAc.js";
import './ui-frame.css';const c = /* @__PURE__ */ new WeakMap();
function $o() {
  return typeof window < "u" && window.matchMedia("(pointer: coarse)").matches;
}
const jr = {
  mounted(o, m) {
    if ($o() || L()) return;
    const e = m.value ?? {}, p = e.strength ?? 6, a = e.rotation ?? 3, u = o.style.transform || "";
    let t = null;
    function r(N) {
      t || (t = requestAnimationFrame(() => {
        t = null;
        const s = o.getBoundingClientRect(), i = s.left + s.width / 2, n = s.top + s.height / 2, h = (N.clientX - i) / (s.width / 2), l = (N.clientY - n) / (s.height / 2), x = h * p, g = l * p, C = -l * a, v = h * a;
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
}, d = {
  NeumorphismButton: _o,
  NeumorphismSwitch: Do,
  NeumorphismCard: Eo,
  NeumorphismInput: Io,
  ThemeProvider: Fo,
  NeumorphismCheckbox: Ro,
  NeumorphismRadio: Po,
  NeumorphismRadioGroup: wo,
  NeumorphismSelect: yo,
  NeumorphismTextarea: Mo,
  NeumorphismForm: Ao,
  NeumorphismFormItem: bo,
  NeumorphismModal: Lo,
  NeumorphismToastProvider: So,
  NeumorphismTooltip: To,
  NeumorphismTabs: vo,
  NeumorphismBreadcrumb: Co,
  NeumorphismPagination: go,
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
  NeumorphismLogo: q,
  NeumorphismArt: j,
  NeumorphismAsciiArt: Z,
  NeumorphismPixelFont: U,
  NeumorphismGraphView: z,
  NeumorphismFieldLabel: X,
  NeumorphismFieldError: Y,
  NeumorphismSlider: V,
  NeumorphismInputNumber: O,
  NeumorphismDrawer: K,
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
  NeumorphismChartPie: P,
  NeumorphismChartCandlestick: w,
  NeumorphismSpinner: y,
  NeumorphismStatusDot: M,
  NeumorphismSegmented: A,
  NeumorphismIcon: b
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
const qr = {
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
  j as NeumorphismArt,
  Z as NeumorphismAsciiArt,
  I as NeumorphismAutoComplete,
  xo as NeumorphismAvatar,
  lo as NeumorphismBadge,
  Co as NeumorphismBreadcrumb,
  _o as NeumorphismButton,
  W as NeumorphismCanvas,
  Eo as NeumorphismCard,
  F as NeumorphismChartBar,
  w as NeumorphismChartCandlestick,
  R as NeumorphismChartLine,
  P as NeumorphismChartPie,
  Ro as NeumorphismCheckbox,
  ro as NeumorphismCol,
  to as NeumorphismCollapse,
  mo as NeumorphismContainer,
  _ as NeumorphismDatePicker,
  so as NeumorphismDivider,
  K as NeumorphismDrawer,
  fo as NeumorphismDropdown,
  uo as NeumorphismEmpty,
  Y as NeumorphismFieldError,
  X as NeumorphismFieldLabel,
  Ao as NeumorphismForm,
  bo as NeumorphismFormItem,
  z as NeumorphismGraphView,
  b as NeumorphismIcon,
  Io as NeumorphismInput,
  O as NeumorphismInputNumber,
  oo as NeumorphismLayout,
  D as NeumorphismList,
  q as NeumorphismLogo,
  B as NeumorphismMenu,
  Lo as NeumorphismModal,
  G as NeumorphismNavMenu,
  go as NeumorphismPagination,
  U as NeumorphismPixelFont,
  No as NeumorphismPopover,
  no as NeumorphismProgress,
  Po as NeumorphismRadio,
  wo as NeumorphismRadioGroup,
  eo as NeumorphismRow,
  ao as NeumorphismScrollbar,
  A as NeumorphismSegmented,
  yo as NeumorphismSelect,
  po as NeumorphismSkeleton,
  V as NeumorphismSlider,
  y as NeumorphismSpinner,
  M as NeumorphismStatusDot,
  k as NeumorphismSteps,
  Do as NeumorphismSwitch,
  io as NeumorphismTable,
  vo as NeumorphismTabs,
  co as NeumorphismTag,
  Mo as NeumorphismTextarea,
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
  Km as createChartRenderer,
  ae as createTheme,
  Wm as debounce,
  qr as default,
  Zm as enUS,
  Hm as generateId,
  ne as getAntiFlickerScript,
  Ym as getLocaleMessages,
  nt as glassClassNames,
  ko as install,
  Jm as isEmpty,
  Lm as isImeComposing,
  ut as normalizeGlass,
  L as prefersReducedMotion,
  Xm as provideLocale,
  ue as provideTheme,
  Ye as useAlert,
  Le as useArtRenderer,
  xm as useAutoComplete,
  Im as useBarChart,
  Gm as useCandlestickChart,
  Rm as useChart,
  xe as useChartInteraction,
  bm as useChatInput,
  Tm as useChatScroll,
  qe as useCheckable,
  Cm as useClipboard,
  ke as useCollapse,
  Jr as useConfig,
  hm as useDatePicker,
  pm as useDrawer,
  he as useFloatingPosition,
  oe as useFocusStack,
  He as useFormField,
  Dm as useLineChart,
  zm as useLocale,
  nm as useMenu,
  Be as useModal,
  et as useNeumorphismSetup,
  rm as useNumberInput,
  Fe as usePagination,
  $m as usePieChart,
  Te as usePixelLogoAnimation,
  mm as usePopover,
  ye as useProgress,
  Ae as useReducedMotion,
  le as useScrollbar,
  Mm as useSegmented,
  Ce as useSelect,
  Qe as useSlider,
  sm as useSteps,
  ie as useSwipe,
  _e as useTable,
  Pe as useTabs,
  fe as useTheme,
  Oe as useToast,
  ze as useTooltip,
  Ze as useTouchDevice,
  Ee as useTree,
  lm as useUpload,
  fm as useVirtualList,
  te as useZIndex,
  jr as vMagnetic,
  wm as validateFieldValue,
  jm as zhCN
};

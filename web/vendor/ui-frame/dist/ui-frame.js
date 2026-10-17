import { computed as T } from "vue";
import { ConfigKey as S } from "./composables/useConfig.js";
import { useConfig as Wr } from "./composables/useConfig.js";
import { useFocusStack as Jr } from "./composables/useFocusStack.js";
import { Z_LAYERS as oe, Z_STRIDE as re, useZIndex as ee } from "./composables/useZIndex.js";
import { useSwipe as te } from "./composables/useSwipe.js";
import { createTheme as ie, getAntiFlickerScript as pe, provideTheme as ae, useTheme as ne } from "./composables/useTheme.js";
import { default as fe } from "./composables/useFloatingPosition.js";
import { default as he } from "./composables/useScrollbar.js";
import { default as de } from "./composables/useChartInteraction.js";
import { useSelect as xe } from "./composables/useSelect.js";
import { default as Ce } from "./composables/usePixelLogoAnimation.js";
import { useArtRenderer as Te } from "./composables/useArtRenderer.js";
import { prefersReducedMotion as b } from "./composables/useReducedMotion.js";
import { default as be } from "./composables/useReducedMotion.js";
import { default as Me } from "./composables/useProgress.js";
import { useTabs as Ae } from "./composables/useTabs.js";
import { usePagination as Pe } from "./composables/usePagination.js";
import { useTree as Re } from "./composables/useTree.js";
import { useTable as Ee } from "./composables/useTable.js";
import { useCollapse as $e } from "./composables/useCollapse.js";
import { useModal as _e } from "./composables/useModal.js";
import { useToast as Ke } from "./composables/useToast.js";
import { useAlert as Ye } from "./composables/useAlert.js";
import { useTooltip as Ge } from "./composables/useTooltip.js";
import { useTouchDevice as Ve } from "./composables/useTouchDevice.js";
import { useCheckable as je } from "./composables/useCheckable.js";
import { useFormField as qe } from "./composables/useFormField.js";
import { useSlider as He } from "./composables/useSlider.js";
import { useNumberInput as Qe } from "./composables/useNumberInput.js";
import { usePopover as rm } from "./composables/usePopover.js";
import { useSteps as mm } from "./composables/useSteps.js";
import { useDrawer as sm } from "./composables/useDrawer.js";
import { useMenu as pm } from "./composables/useMenu.js";
import { useVirtualList as nm } from "./composables/useVirtualList.js";
import { useDatePicker as fm } from "./composables/useDatePicker.js";
import { useUpload as hm } from "./composables/useUpload.js";
import { useAutoComplete as dm } from "./composables/useAutoComplete.js";
import { useClipboard as xm } from "./composables/useClipboard.js";
import { useChatScroll as Cm } from "./composables/useChatScroll.js";
import { isImeComposing as Tm, useChatInput as Sm } from "./composables/useChatInput.js";
import { useSegmented as Lm } from "./composables/useSegmented.js";
import { validateFieldValue as ym } from "./composables/useFormValidation.js";
import { useChart as wm } from "./composables/useChart.js";
import { useBarChart as Fm } from "./composables/useBarChart.js";
import { useLineChart as Im } from "./composables/useLineChart.js";
import { usePieChart as Dm } from "./composables/usePieChart.js";
import { useCandlestickChart as km } from "./composables/useCandlestickChart.js";
import { createChartRenderer as Bm } from "./composables/chartCanvasRenderer.js";
import { LocaleKey as Om, getLocaleMessages as Ym, provideLocale as Xm, useLocale as Gm } from "./composables/useLocale.js";
import { enUS as Vm, zhCN as Zm } from "./locales/index.js";
import { debounce as zm, generateId as qm, isEmpty as Wm } from "./utils/index.js";
import { C as Jm } from "./chunks/componentRegistry-B-lS5uh-.js";
import { u as ot } from "./chunks/createComponent-jnXBYqCm.js";
import { FormKey as et, RadioGroupKey as mt, RowGutterKey as tt } from "./composables/injectionKeys.js";
import { N as L } from "./chunks/NeumorphismIcon-CFyBR-Sk.js";
import { N as M } from "./chunks/NeumorphismSegmented-D9q1A1Xr.js";
import { N as y } from "./chunks/NeumorphismStatusDot-DVKfRlP8.js";
import { N as A } from "./chunks/NeumorphismSpinner-CecIG42-.js";
import { N as w } from "./chunks/NeumorphismChartCandlestick-CkCTva9p.js";
import { N as P } from "./chunks/NeumorphismChartPie-9GSJM5aN.js";
import { N as F } from "./chunks/NeumorphismChartLine-CpQfVJga.js";
import { N as R } from "./chunks/NeumorphismChartBar-DhKQR0v6.js";
import { N as I } from "./chunks/NeumorphismAutoComplete-IYF1k55N.js";
import { N as E } from "./chunks/NeumorphismUpload-lLXl0erH.js";
import { N as D } from "./chunks/NeumorphismList-xtxqOyjk.js";
import { N as $ } from "./chunks/NeumorphismDatePicker-BfUMShI2.js";
import { N as k } from "./chunks/NeumorphismVirtualList-CYJsckGD.js";
import { N as _ } from "./chunks/NeumorphismSteps-BtUd-8p1.js";
import { N as B } from "./chunks/NeumorphismNavMenu-DAG7c74I.js";
import { N as K } from "./chunks/NeumorphismMenu-DJrsWv9p.js";
import { N as O } from "./chunks/NeumorphismDrawer-CM9So2kx.js";
import { N as Y } from "./chunks/NeumorphismInputNumber-HxsLULrQ.js";
import { N as X } from "./chunks/NeumorphismSlider-Dz-659J6.js";
import { N as G } from "./chunks/NeumorphismFieldError-BxamHjhs.js";
import { N as U } from "./chunks/NeumorphismFieldLabel-C3S1Ax2f.js";
import { N as V } from "./chunks/NeumorphismPixelFont-gsT7d_OL.js";
import { N as Z } from "./chunks/NeumorphismAsciiArt-BAzPGKAw.js";
import { N as j } from "./chunks/NeumorphismArt-dTpvKClT.js";
import { N as z } from "./chunks/NeumorphismLogo-JYOrKIBD.js";
import { N as q } from "./chunks/NeumorphismCanvas-B8TpGQt6.js";
import { a as W, N as H } from "./chunks/NeumorphismTree-Dmru8CiZ.js";
import { N as J } from "./chunks/NeumorphismThemeToggle-CLYADOe4.js";
import { N as Q } from "./chunks/NeumorphismLayout-ortLGvgQ.js";
import { N as oo, a as ro } from "./chunks/NeumorphismCol-BiaTAjWV.js";
import { N as eo } from "./chunks/NeumorphismContainer-CGr-px2A.js";
import { N as mo } from "./chunks/NeumorphismCollapse-Bwqpy8Ts.js";
import { N as to } from "./chunks/NeumorphismDivider-BzjZ5AP8.js";
import { N as so } from "./chunks/NeumorphismTable-BO1mMCOy.js";
import { N as io } from "./chunks/NeumorphismSkeleton-Bxt10H5L.js";
import { _ as po } from "./chunks/NeumorphismScrollbar.vue_vue_type_script_setup_true_lang-PwK95onm.js";
import { N as ao } from "./chunks/NeumorphismProgress-D8vaRM9G.js";
import { N as no } from "./chunks/NeumorphismEmpty--dig1NGG.js";
import { N as uo } from "./chunks/NeumorphismDropdown-IdvKvRCI.js";
import { N as fo } from "./chunks/NeumorphismPopover-m8EjDIRe.js";
import { N as No } from "./chunks/NeumorphismAlert-Ckl8dPqX.js";
import { N as ho } from "./chunks/NeumorphismTag-D6Yz18Ws.js";
import { N as co } from "./chunks/NeumorphismBadge-BLGlrhXp.js";
import { N as lo } from "./chunks/NeumorphismAvatar-BBQ1Wrjq.js";
import { N as xo } from "./chunks/NeumorphismPagination-C7xprFdY.js";
import { N as go } from "./chunks/NeumorphismBreadcrumb-CjxA6zQg.js";
import { N as Co } from "./chunks/NeumorphismTabs-D5OwLAaC.js";
import { N as vo } from "./chunks/NeumorphismTooltip-pagvhUIJ.js";
import { N as To } from "./chunks/NeumorphismToastProvider-BiNgckKj.js";
import { N as So } from "./chunks/NeumorphismModal-C28AbuwP.js";
import { a as bo, N as Lo } from "./chunks/NeumorphismFormItem-BySt7xa8.js";
import { N as Mo } from "./chunks/NeumorphismTextarea-D4alPN-q.js";
import { N as yo } from "./chunks/NeumorphismSelect-CN_Bw-pj.js";
import { a as Ao, N as wo } from "./chunks/NeumorphismRadioGroup-CxVaAN76.js";
import { N as Po } from "./chunks/NeumorphismCheckbox-YoI_8c5H.js";
import { T as Fo } from "./chunks/ThemeProvider-CCR_TjUs.js";
import { N as Ro } from "./chunks/NeumorphismInput-COGouhbp.js";
import { N as Io } from "./chunks/NeumorphismCard-DGFr51dd.js";
import { N as Eo } from "./chunks/NeumorphismSwitch-Bg5yf_Pl.js";
import { N as Do } from "./chunks/NeumorphismButton-CTLPjGe-.js";
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
  NeumorphismButton: Do,
  NeumorphismSwitch: Eo,
  NeumorphismCard: Io,
  NeumorphismInput: Ro,
  ThemeProvider: Fo,
  NeumorphismCheckbox: Po,
  NeumorphismRadio: wo,
  NeumorphismRadioGroup: Ao,
  NeumorphismSelect: yo,
  NeumorphismTextarea: Mo,
  NeumorphismForm: Lo,
  NeumorphismFormItem: bo,
  NeumorphismModal: So,
  NeumorphismToastProvider: To,
  NeumorphismTooltip: vo,
  NeumorphismTabs: Co,
  NeumorphismBreadcrumb: go,
  NeumorphismPagination: xo,
  NeumorphismAvatar: lo,
  NeumorphismBadge: co,
  NeumorphismTag: ho,
  NeumorphismAlert: No,
  NeumorphismPopover: fo,
  NeumorphismDropdown: uo,
  NeumorphismEmpty: no,
  NeumorphismProgress: ao,
  NeumorphismScrollbar: po,
  NeumorphismSkeleton: io,
  NeumorphismTable: so,
  NeumorphismDivider: to,
  NeumorphismCollapse: mo,
  NeumorphismContainer: eo,
  NeumorphismRow: ro,
  NeumorphismCol: oo,
  NeumorphismLayout: Q,
  NeumorphismThemeToggle: J,
  NeumorphismTree: H,
  NeumorphismTreeNode: W,
  NeumorphismCanvas: q,
  NeumorphismLogo: z,
  NeumorphismArt: j,
  NeumorphismAsciiArt: Z,
  NeumorphismPixelFont: V,
  NeumorphismFieldLabel: U,
  NeumorphismFieldError: G,
  NeumorphismSlider: X,
  NeumorphismInputNumber: Y,
  NeumorphismDrawer: O,
  NeumorphismMenu: K,
  NeumorphismNavMenu: B,
  NeumorphismSteps: _,
  NeumorphismVirtualList: k,
  NeumorphismDatePicker: $,
  NeumorphismList: D,
  NeumorphismUpload: E,
  NeumorphismAutoComplete: I,
  NeumorphismChartBar: R,
  NeumorphismChartLine: F,
  NeumorphismChartPie: P,
  NeumorphismChartCandlestick: w,
  NeumorphismSpinner: A,
  NeumorphismStatusDot: y,
  NeumorphismSegmented: M,
  NeumorphismIcon: L
};
function ko(o, m) {
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
const jr = {
  install: ko,
  version: "1.3.2-dev.4"
};
export {
  Jm as ComponentRegistry,
  S as ConfigKey,
  et as FormKey,
  Om as LocaleKey,
  No as NeumorphismAlert,
  j as NeumorphismArt,
  Z as NeumorphismAsciiArt,
  I as NeumorphismAutoComplete,
  lo as NeumorphismAvatar,
  co as NeumorphismBadge,
  go as NeumorphismBreadcrumb,
  Do as NeumorphismButton,
  q as NeumorphismCanvas,
  Io as NeumorphismCard,
  R as NeumorphismChartBar,
  w as NeumorphismChartCandlestick,
  F as NeumorphismChartLine,
  P as NeumorphismChartPie,
  Po as NeumorphismCheckbox,
  oo as NeumorphismCol,
  mo as NeumorphismCollapse,
  eo as NeumorphismContainer,
  $ as NeumorphismDatePicker,
  to as NeumorphismDivider,
  O as NeumorphismDrawer,
  uo as NeumorphismDropdown,
  no as NeumorphismEmpty,
  G as NeumorphismFieldError,
  U as NeumorphismFieldLabel,
  Lo as NeumorphismForm,
  bo as NeumorphismFormItem,
  L as NeumorphismIcon,
  Ro as NeumorphismInput,
  Y as NeumorphismInputNumber,
  Q as NeumorphismLayout,
  D as NeumorphismList,
  z as NeumorphismLogo,
  K as NeumorphismMenu,
  So as NeumorphismModal,
  B as NeumorphismNavMenu,
  xo as NeumorphismPagination,
  V as NeumorphismPixelFont,
  fo as NeumorphismPopover,
  ao as NeumorphismProgress,
  wo as NeumorphismRadio,
  Ao as NeumorphismRadioGroup,
  ro as NeumorphismRow,
  po as NeumorphismScrollbar,
  M as NeumorphismSegmented,
  yo as NeumorphismSelect,
  io as NeumorphismSkeleton,
  X as NeumorphismSlider,
  A as NeumorphismSpinner,
  y as NeumorphismStatusDot,
  _ as NeumorphismSteps,
  Eo as NeumorphismSwitch,
  so as NeumorphismTable,
  Co as NeumorphismTabs,
  ho as NeumorphismTag,
  Mo as NeumorphismTextarea,
  J as NeumorphismThemeToggle,
  To as NeumorphismToastProvider,
  vo as NeumorphismTooltip,
  H as NeumorphismTree,
  W as NeumorphismTreeNode,
  E as NeumorphismUpload,
  k as NeumorphismVirtualList,
  mt as RadioGroupKey,
  tt as RowGutterKey,
  Fo as ThemeProvider,
  oe as Z_LAYERS,
  re as Z_STRIDE,
  Bm as createChartRenderer,
  ie as createTheme,
  zm as debounce,
  jr as default,
  Vm as enUS,
  qm as generateId,
  pe as getAntiFlickerScript,
  Ym as getLocaleMessages,
  ko as install,
  Wm as isEmpty,
  Tm as isImeComposing,
  b as prefersReducedMotion,
  Xm as provideLocale,
  ae as provideTheme,
  Ye as useAlert,
  Te as useArtRenderer,
  dm as useAutoComplete,
  Fm as useBarChart,
  km as useCandlestickChart,
  wm as useChart,
  de as useChartInteraction,
  Sm as useChatInput,
  Cm as useChatScroll,
  je as useCheckable,
  xm as useClipboard,
  $e as useCollapse,
  Wr as useConfig,
  fm as useDatePicker,
  sm as useDrawer,
  fe as useFloatingPosition,
  Jr as useFocusStack,
  qe as useFormField,
  Im as useLineChart,
  Gm as useLocale,
  pm as useMenu,
  _e as useModal,
  ot as useNeumorphismSetup,
  Qe as useNumberInput,
  Pe as usePagination,
  Dm as usePieChart,
  Ce as usePixelLogoAnimation,
  rm as usePopover,
  Me as useProgress,
  be as useReducedMotion,
  he as useScrollbar,
  Lm as useSegmented,
  xe as useSelect,
  He as useSlider,
  mm as useSteps,
  te as useSwipe,
  Ee as useTable,
  Ae as useTabs,
  ne as useTheme,
  Ke as useToast,
  Ge as useTooltip,
  Ve as useTouchDevice,
  Re as useTree,
  hm as useUpload,
  nm as useVirtualList,
  ee as useZIndex,
  Zr as vMagnetic,
  ym as validateFieldValue,
  Zm as zhCN
};

import { computed as T } from "vue";
import { ConfigKey as S } from "./composables/useConfig.js";
import { useConfig as Zr } from "./composables/useConfig.js";
import { useFocusStack as zr } from "./composables/useFocusStack.js";
import { Z_LAYERS as Wr, Z_STRIDE as Hr, useZIndex as Jr } from "./composables/useZIndex.js";
import { useSwipe as oe } from "./composables/useSwipe.js";
import { createTheme as ee, getAntiFlickerScript as me, provideTheme as te, useTheme as se } from "./composables/useTheme.js";
import { default as pe } from "./composables/useFloatingPosition.js";
import { default as ne } from "./composables/useScrollbar.js";
import { default as fe } from "./composables/useChartInteraction.js";
import { useSelect as he } from "./composables/useSelect.js";
import { default as le } from "./composables/usePixelLogoAnimation.js";
import { useArtRenderer as xe } from "./composables/useArtRenderer.js";
import { prefersReducedMotion as L } from "./composables/useReducedMotion.js";
import { default as Ce } from "./composables/useReducedMotion.js";
import { default as Te } from "./composables/useProgress.js";
import { useTabs as Le } from "./composables/useTabs.js";
import { usePagination as be } from "./composables/usePagination.js";
import { useTree as we } from "./composables/useTree.js";
import { useTable as Pe } from "./composables/useTable.js";
import { useCollapse as Fe } from "./composables/useCollapse.js";
import { useModal as Ee } from "./composables/useModal.js";
import { useToast as $e } from "./composables/useToast.js";
import { useAlert as _e } from "./composables/useAlert.js";
import { useTooltip as Ke } from "./composables/useTooltip.js";
import { useTouchDevice as Ye } from "./composables/useTouchDevice.js";
import { useCheckable as Ge } from "./composables/useCheckable.js";
import { useFormField as Ve } from "./composables/useFormField.js";
import { useSlider as je } from "./composables/useSlider.js";
import { useNumberInput as qe } from "./composables/useNumberInput.js";
import { usePopover as He } from "./composables/usePopover.js";
import { useSteps as Qe } from "./composables/useSteps.js";
import { useDrawer as rm } from "./composables/useDrawer.js";
import { useMenu as mm } from "./composables/useMenu.js";
import { useVirtualList as sm } from "./composables/useVirtualList.js";
import { useDatePicker as pm } from "./composables/useDatePicker.js";
import { useUpload as nm } from "./composables/useUpload.js";
import { useAutoComplete as fm } from "./composables/useAutoComplete.js";
import { useClipboard as hm } from "./composables/useClipboard.js";
import { useChatScroll as lm } from "./composables/useChatScroll.js";
import { isImeComposing as xm, useChatInput as gm } from "./composables/useChatInput.js";
import { useSegmented as vm } from "./composables/useSegmented.js";
import { validateFieldValue as Sm } from "./composables/useFormValidation.js";
import { useChart as Mm } from "./composables/useChart.js";
import { useBarChart as ym } from "./composables/useBarChart.js";
import { useLineChart as Am } from "./composables/useLineChart.js";
import { usePieChart as Rm } from "./composables/usePieChart.js";
import { useCandlestickChart as Im } from "./composables/useCandlestickChart.js";
import { createChartRenderer as Dm } from "./composables/chartCanvasRenderer.js";
import { LocaleKey as km, getLocaleMessages as _m, provideLocale as Bm, useLocale as Km } from "./composables/useLocale.js";
import { enUS as Ym, zhCN as Xm } from "./locales/index.js";
import { debounce as Um, generateId as Vm, isEmpty as Zm } from "./utils/index.js";
import { C as zm } from "./chunks/componentRegistry-B-lS5uh-.js";
import { u as Wm } from "./chunks/createComponent-jnXBYqCm.js";
import { FormKey as Jm, RadioGroupKey as Qm, RowGutterKey as ot } from "./composables/injectionKeys.js";
import { N as M } from "./chunks/NeumorphismSegmented-DriZive5.js";
import { N as b } from "./chunks/NeumorphismStatusDot-DVKfRlP8.js";
import { N as y } from "./chunks/NeumorphismSpinner-CecIG42-.js";
import { N as w } from "./chunks/NeumorphismChartCandlestick-Bn4aNHNL.js";
import { N as A } from "./chunks/NeumorphismChartPie-CBVlGwTY.js";
import { N as P } from "./chunks/NeumorphismChartLine-CD7XaWsj.js";
import { N as R } from "./chunks/NeumorphismChartBar-C9osVs5Q.js";
import { N as F } from "./chunks/NeumorphismAutoComplete-Cg4JfB0e.js";
import { N as I } from "./chunks/NeumorphismUpload-B_Ce5z0X.js";
import { N as E } from "./chunks/NeumorphismList-ByUgLAga.js";
import { N as D } from "./chunks/NeumorphismDatePicker-B7XCHoCi.js";
import { N as $ } from "./chunks/NeumorphismVirtualList-CYJsckGD.js";
import { N as k } from "./chunks/NeumorphismSteps-Dt8oemy3.js";
import { N as _ } from "./chunks/NeumorphismNavMenu-DJ_2h4xU.js";
import { N as B } from "./chunks/NeumorphismMenu-BD2HEBQp.js";
import { N as K } from "./chunks/NeumorphismDrawer-YugAz7JW.js";
import { N as O } from "./chunks/NeumorphismInputNumber-CqEXe_8_.js";
import { N as Y } from "./chunks/NeumorphismSlider-iL6dJ68o.js";
import { N as X } from "./chunks/NeumorphismFieldError-BxamHjhs.js";
import { N as G } from "./chunks/NeumorphismFieldLabel-CBF1nZs1.js";
import { N as U } from "./chunks/NeumorphismAsciiArt-CvzwbNkv.js";
import { N as V } from "./chunks/NeumorphismArt-dTpvKClT.js";
import { N as Z } from "./chunks/NeumorphismLogo-RF43SokA.js";
import { N as j } from "./chunks/NeumorphismCanvas-Dkp5eA0u.js";
import { a as z, N as q } from "./chunks/NeumorphismTree-DKdQqI-G.js";
import { N as W } from "./chunks/NeumorphismThemeToggle-Z1Q61lr6.js";
import { N as H } from "./chunks/NeumorphismLayout-GEx80IRW.js";
import { N as J, a as Q } from "./chunks/NeumorphismCol-Ca0Cuvrg.js";
import { N as oo } from "./chunks/NeumorphismContainer-CGr-px2A.js";
import { N as ro } from "./chunks/NeumorphismCollapse-CcQEm0Jq.js";
import { N as eo } from "./chunks/NeumorphismDivider-C571hn7Q.js";
import { N as mo } from "./chunks/NeumorphismTable-O0H9yKvf.js";
import { N as to } from "./chunks/NeumorphismSkeleton-Bxt10H5L.js";
import { _ as so } from "./chunks/NeumorphismScrollbar.vue_vue_type_script_setup_true_lang-PwK95onm.js";
import { N as io } from "./chunks/NeumorphismProgress--mVVwvOC.js";
import { N as po } from "./chunks/NeumorphismEmpty--dig1NGG.js";
import { N as ao } from "./chunks/NeumorphismDropdown-BvgcwiJS.js";
import { N as no } from "./chunks/NeumorphismPopover-m8EjDIRe.js";
import { N as uo } from "./chunks/NeumorphismAlert-yHMu8tZ7.js";
import { N as fo } from "./chunks/NeumorphismTag-S0FZZ2i6.js";
import { N as No } from "./chunks/NeumorphismBadge-D6f1uflq.js";
import { N as ho } from "./chunks/NeumorphismAvatar-BBQ1Wrjq.js";
import { N as co } from "./chunks/NeumorphismPagination-CNOeDpFp.js";
import { N as lo } from "./chunks/NeumorphismBreadcrumb-BFyQ5tRM.js";
import { N as xo } from "./chunks/NeumorphismTabs-DJ0sUeba.js";
import { N as go } from "./chunks/NeumorphismTooltip-MKJQObU9.js";
import { N as Co } from "./chunks/NeumorphismToastProvider-CSDYfOdN.js";
import { N as vo } from "./chunks/NeumorphismModal-lMe8tfPG.js";
import { a as To, N as So } from "./chunks/NeumorphismFormItem-C3LD1Est.js";
import { N as Lo } from "./chunks/NeumorphismTextarea-CSZ2VWdh.js";
import { N as Mo } from "./chunks/NeumorphismSelect-Bt3u4X4L.js";
import { a as bo, N as yo } from "./chunks/NeumorphismRadioGroup-LbLt8St5.js";
import { N as wo } from "./chunks/NeumorphismCheckbox-ZN_HeVOw.js";
import { T as Ao } from "./chunks/ThemeProvider-CCR_TjUs.js";
import { N as Po } from "./chunks/NeumorphismInput-BlgrjPEH.js";
import { N as Ro } from "./chunks/NeumorphismCard-Bc1QAxUh.js";
import { N as Fo } from "./chunks/NeumorphismSwitch-Caas9-Oj.js";
import { N as Io } from "./chunks/NeumorphismButton-DEVgFO0I.js";
import './ui-frame.css';const c = /* @__PURE__ */ new WeakMap();
function Eo() {
  return typeof window < "u" && window.matchMedia("(pointer: coarse)").matches;
}
const Xr = {
  mounted(o, m) {
    if (Eo() || L()) return;
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
  NeumorphismButton: Io,
  NeumorphismSwitch: Fo,
  NeumorphismCard: Ro,
  NeumorphismInput: Po,
  ThemeProvider: Ao,
  NeumorphismCheckbox: wo,
  NeumorphismRadio: yo,
  NeumorphismRadioGroup: bo,
  NeumorphismSelect: Mo,
  NeumorphismTextarea: Lo,
  NeumorphismForm: So,
  NeumorphismFormItem: To,
  NeumorphismModal: vo,
  NeumorphismToastProvider: Co,
  NeumorphismTooltip: go,
  NeumorphismTabs: xo,
  NeumorphismBreadcrumb: lo,
  NeumorphismPagination: co,
  NeumorphismAvatar: ho,
  NeumorphismBadge: No,
  NeumorphismTag: fo,
  NeumorphismAlert: uo,
  NeumorphismPopover: no,
  NeumorphismDropdown: ao,
  NeumorphismEmpty: po,
  NeumorphismProgress: io,
  NeumorphismScrollbar: so,
  NeumorphismSkeleton: to,
  NeumorphismTable: mo,
  NeumorphismDivider: eo,
  NeumorphismCollapse: ro,
  NeumorphismContainer: oo,
  NeumorphismRow: Q,
  NeumorphismCol: J,
  NeumorphismLayout: H,
  NeumorphismThemeToggle: W,
  NeumorphismTree: q,
  NeumorphismTreeNode: z,
  NeumorphismCanvas: j,
  NeumorphismLogo: Z,
  NeumorphismArt: V,
  NeumorphismAsciiArt: U,
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
  NeumorphismAutoComplete: F,
  NeumorphismChartBar: R,
  NeumorphismChartLine: P,
  NeumorphismChartPie: A,
  NeumorphismChartCandlestick: w,
  NeumorphismSpinner: y,
  NeumorphismStatusDot: b,
  NeumorphismSegmented: M
};
function Do(o, m) {
  var f, N, s;
  const e = m ?? {}, p = "config" in e || "components" in e || "prefix" in e || "hooks" in e, a = p ? e.config : m, u = p ? e.components ?? {} : {}, t = p ? e.prefix ?? "" : "", r = (p ? e.hooks : void 0) ?? {};
  a && (o.provide(
    S,
    T(() => a)
  ), (f = r.onConfigChange) == null || f.call(r, a));
  for (const [i, n] of Object.entries(d)) {
    const h = u[i] ?? n;
    o.component(`${t}${i}`, h), (N = r.onComponentRegister) == null || N.call(r, i, h);
  }
  for (const [i, n] of Object.entries(u))
    i in d || (o.component(`${t}${i}`, n), (s = r.onComponentRegister) == null || s.call(r, i, n));
}
const Gr = {
  install: Do,
  version: "1.3.0"
};
export {
  zm as ComponentRegistry,
  S as ConfigKey,
  Jm as FormKey,
  km as LocaleKey,
  uo as NeumorphismAlert,
  V as NeumorphismArt,
  U as NeumorphismAsciiArt,
  F as NeumorphismAutoComplete,
  ho as NeumorphismAvatar,
  No as NeumorphismBadge,
  lo as NeumorphismBreadcrumb,
  Io as NeumorphismButton,
  j as NeumorphismCanvas,
  Ro as NeumorphismCard,
  R as NeumorphismChartBar,
  w as NeumorphismChartCandlestick,
  P as NeumorphismChartLine,
  A as NeumorphismChartPie,
  wo as NeumorphismCheckbox,
  J as NeumorphismCol,
  ro as NeumorphismCollapse,
  oo as NeumorphismContainer,
  D as NeumorphismDatePicker,
  eo as NeumorphismDivider,
  K as NeumorphismDrawer,
  ao as NeumorphismDropdown,
  po as NeumorphismEmpty,
  X as NeumorphismFieldError,
  G as NeumorphismFieldLabel,
  So as NeumorphismForm,
  To as NeumorphismFormItem,
  Po as NeumorphismInput,
  O as NeumorphismInputNumber,
  H as NeumorphismLayout,
  E as NeumorphismList,
  Z as NeumorphismLogo,
  B as NeumorphismMenu,
  vo as NeumorphismModal,
  _ as NeumorphismNavMenu,
  co as NeumorphismPagination,
  no as NeumorphismPopover,
  io as NeumorphismProgress,
  yo as NeumorphismRadio,
  bo as NeumorphismRadioGroup,
  Q as NeumorphismRow,
  so as NeumorphismScrollbar,
  M as NeumorphismSegmented,
  Mo as NeumorphismSelect,
  to as NeumorphismSkeleton,
  Y as NeumorphismSlider,
  y as NeumorphismSpinner,
  b as NeumorphismStatusDot,
  k as NeumorphismSteps,
  Fo as NeumorphismSwitch,
  mo as NeumorphismTable,
  xo as NeumorphismTabs,
  fo as NeumorphismTag,
  Lo as NeumorphismTextarea,
  W as NeumorphismThemeToggle,
  Co as NeumorphismToastProvider,
  go as NeumorphismTooltip,
  q as NeumorphismTree,
  z as NeumorphismTreeNode,
  I as NeumorphismUpload,
  $ as NeumorphismVirtualList,
  Qm as RadioGroupKey,
  ot as RowGutterKey,
  Ao as ThemeProvider,
  Wr as Z_LAYERS,
  Hr as Z_STRIDE,
  Dm as createChartRenderer,
  ee as createTheme,
  Um as debounce,
  Gr as default,
  Ym as enUS,
  Vm as generateId,
  me as getAntiFlickerScript,
  _m as getLocaleMessages,
  Do as install,
  Zm as isEmpty,
  xm as isImeComposing,
  L as prefersReducedMotion,
  Bm as provideLocale,
  te as provideTheme,
  _e as useAlert,
  xe as useArtRenderer,
  fm as useAutoComplete,
  ym as useBarChart,
  Im as useCandlestickChart,
  Mm as useChart,
  fe as useChartInteraction,
  gm as useChatInput,
  lm as useChatScroll,
  Ge as useCheckable,
  hm as useClipboard,
  Fe as useCollapse,
  Zr as useConfig,
  pm as useDatePicker,
  rm as useDrawer,
  pe as useFloatingPosition,
  zr as useFocusStack,
  Ve as useFormField,
  Am as useLineChart,
  Km as useLocale,
  mm as useMenu,
  Ee as useModal,
  Wm as useNeumorphismSetup,
  qe as useNumberInput,
  be as usePagination,
  Rm as usePieChart,
  le as usePixelLogoAnimation,
  He as usePopover,
  Te as useProgress,
  Ce as useReducedMotion,
  ne as useScrollbar,
  vm as useSegmented,
  he as useSelect,
  je as useSlider,
  Qe as useSteps,
  oe as useSwipe,
  Pe as useTable,
  Le as useTabs,
  se as useTheme,
  $e as useToast,
  Ke as useTooltip,
  Ye as useTouchDevice,
  we as useTree,
  nm as useUpload,
  sm as useVirtualList,
  Jr as useZIndex,
  Xr as vMagnetic,
  Sm as validateFieldValue,
  Xm as zhCN
};

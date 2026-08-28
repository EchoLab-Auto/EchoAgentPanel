import { computed as T } from "vue";
import { ConfigKey as S } from "./composables/useConfig.js";
import { useConfig as Xr } from "./composables/useConfig.js";
import { useFocusStack as Ur } from "./composables/useFocusStack.js";
import { Z_LAYERS as Zr, Z_STRIDE as jr, useZIndex as zr } from "./composables/useZIndex.js";
import { useSwipe as Wr } from "./composables/useSwipe.js";
import { createTheme as Jr, getAntiFlickerScript as Qr, provideTheme as oe, useTheme as re } from "./composables/useTheme.js";
import { default as me } from "./composables/useFloatingPosition.js";
import { default as se } from "./composables/useScrollbar.js";
import { default as pe } from "./composables/useChartInteraction.js";
import { useSelect as ne } from "./composables/useSelect.js";
import { default as fe } from "./composables/usePixelLogoAnimation.js";
import { prefersReducedMotion as L } from "./composables/useReducedMotion.js";
import { default as he } from "./composables/useReducedMotion.js";
import { default as le } from "./composables/useProgress.js";
import { useTabs as xe } from "./composables/useTabs.js";
import { usePagination as Ce } from "./composables/usePagination.js";
import { useTree as Te } from "./composables/useTree.js";
import { useTable as Le } from "./composables/useTable.js";
import { useCollapse as be } from "./composables/useCollapse.js";
import { useModal as we } from "./composables/useModal.js";
import { useToast as Fe } from "./composables/useToast.js";
import { useAlert as Ie } from "./composables/useAlert.js";
import { useTooltip as Ee } from "./composables/useTooltip.js";
import { useTouchDevice as $e } from "./composables/useTouchDevice.js";
import { useCheckable as _e } from "./composables/useCheckable.js";
import { useFormField as Ke } from "./composables/useFormField.js";
import { useSlider as Ye } from "./composables/useSlider.js";
import { useNumberInput as Ge } from "./composables/useNumberInput.js";
import { usePopover as Ve } from "./composables/usePopover.js";
import { useSteps as je } from "./composables/useSteps.js";
import { useDrawer as qe } from "./composables/useDrawer.js";
import { useMenu as He } from "./composables/useMenu.js";
import { useVirtualList as Qe } from "./composables/useVirtualList.js";
import { useDatePicker as rm } from "./composables/useDatePicker.js";
import { useUpload as mm } from "./composables/useUpload.js";
import { useAutoComplete as sm } from "./composables/useAutoComplete.js";
import { useClipboard as pm } from "./composables/useClipboard.js";
import { useChatScroll as nm } from "./composables/useChatScroll.js";
import { isImeComposing as fm, useChatInput as Nm } from "./composables/useChatInput.js";
import { useSegmented as cm } from "./composables/useSegmented.js";
import { validateFieldValue as dm } from "./composables/useFormValidation.js";
import { useChart as gm } from "./composables/useChart.js";
import { useBarChart as vm } from "./composables/useBarChart.js";
import { useLineChart as Sm } from "./composables/useLineChart.js";
import { usePieChart as Mm } from "./composables/usePieChart.js";
import { useCandlestickChart as ym } from "./composables/useCandlestickChart.js";
import { createChartRenderer as Pm } from "./composables/chartCanvasRenderer.js";
import { LocaleKey as Rm, getLocaleMessages as Im, provideLocale as Am, useLocale as Em } from "./composables/useLocale.js";
import { enUS as $m, zhCN as km } from "./locales/index.js";
import { debounce as Bm, generateId as Km, isEmpty as Om } from "./utils/index.js";
import { C as Xm } from "./chunks/componentRegistry-B-lS5uh-.js";
import { u as Um } from "./chunks/createComponent-jnXBYqCm.js";
import { FormKey as Zm, RadioGroupKey as jm, RowGutterKey as zm } from "./composables/injectionKeys.js";
import { N as M } from "./chunks/NeumorphismSegmented-DriZive5.js";
import { N as b } from "./chunks/NeumorphismStatusDot-DVKfRlP8.js";
import { N as y } from "./chunks/NeumorphismSpinner-CecIG42-.js";
import { N as w } from "./chunks/NeumorphismChartCandlestick-Bn4aNHNL.js";
import { N as P } from "./chunks/NeumorphismChartPie-CBVlGwTY.js";
import { N as F } from "./chunks/NeumorphismChartLine-CD7XaWsj.js";
import { N as R } from "./chunks/NeumorphismChartBar-C9osVs5Q.js";
import { N as I } from "./chunks/NeumorphismAutoComplete-Cg4JfB0e.js";
import { N as A } from "./chunks/NeumorphismUpload-B_Ce5z0X.js";
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
import { N as U } from "./chunks/NeumorphismLogo-RF43SokA.js";
import { N as V } from "./chunks/NeumorphismCanvas-Dkp5eA0u.js";
import { a as Z, N as j } from "./chunks/NeumorphismTree-DKdQqI-G.js";
import { N as z } from "./chunks/NeumorphismThemeToggle-Z1Q61lr6.js";
import { N as q } from "./chunks/NeumorphismLayout-GEx80IRW.js";
import { N as W, a as H } from "./chunks/NeumorphismCol-Ca0Cuvrg.js";
import { N as J } from "./chunks/NeumorphismContainer-CGr-px2A.js";
import { N as Q } from "./chunks/NeumorphismCollapse-CcQEm0Jq.js";
import { N as oo } from "./chunks/NeumorphismDivider-C571hn7Q.js";
import { N as ro } from "./chunks/NeumorphismTable-O0H9yKvf.js";
import { N as eo } from "./chunks/NeumorphismSkeleton-Bxt10H5L.js";
import { _ as mo } from "./chunks/NeumorphismScrollbar.vue_vue_type_script_setup_true_lang-PwK95onm.js";
import { N as to } from "./chunks/NeumorphismProgress--mVVwvOC.js";
import { N as so } from "./chunks/NeumorphismEmpty--dig1NGG.js";
import { N as io } from "./chunks/NeumorphismDropdown-BvgcwiJS.js";
import { N as po } from "./chunks/NeumorphismPopover-m8EjDIRe.js";
import { N as ao } from "./chunks/NeumorphismAlert-yHMu8tZ7.js";
import { N as no } from "./chunks/NeumorphismTag-S0FZZ2i6.js";
import { N as uo } from "./chunks/NeumorphismBadge-D6f1uflq.js";
import { N as fo } from "./chunks/NeumorphismAvatar-BBQ1Wrjq.js";
import { N as No } from "./chunks/NeumorphismPagination-CNOeDpFp.js";
import { N as ho } from "./chunks/NeumorphismBreadcrumb-BFyQ5tRM.js";
import { N as co } from "./chunks/NeumorphismTabs-DJ0sUeba.js";
import { N as lo } from "./chunks/NeumorphismTooltip-MKJQObU9.js";
import { N as xo } from "./chunks/NeumorphismToastProvider-CSDYfOdN.js";
import { N as go } from "./chunks/NeumorphismModal-lMe8tfPG.js";
import { a as Co, N as vo } from "./chunks/NeumorphismFormItem-C3LD1Est.js";
import { N as To } from "./chunks/NeumorphismTextarea-CSZ2VWdh.js";
import { N as So } from "./chunks/NeumorphismSelect-Bt3u4X4L.js";
import { a as Lo, N as Mo } from "./chunks/NeumorphismRadioGroup-LbLt8St5.js";
import { N as bo } from "./chunks/NeumorphismCheckbox-ZN_HeVOw.js";
import { T as yo } from "./chunks/ThemeProvider-CCR_TjUs.js";
import { N as wo } from "./chunks/NeumorphismInput-BlgrjPEH.js";
import { N as Po } from "./chunks/NeumorphismCard-Bc1QAxUh.js";
import { N as Fo } from "./chunks/NeumorphismSwitch-Caas9-Oj.js";
import { N as Ro } from "./chunks/NeumorphismButton-6BjLxZWQ.js";
import './ui-frame.css';const c = /* @__PURE__ */ new WeakMap();
function Io() {
  return typeof window < "u" && window.matchMedia("(pointer: coarse)").matches;
}
const Br = {
  mounted(o, m) {
    if (Io() || L()) return;
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
  NeumorphismButton: Ro,
  NeumorphismSwitch: Fo,
  NeumorphismCard: Po,
  NeumorphismInput: wo,
  ThemeProvider: yo,
  NeumorphismCheckbox: bo,
  NeumorphismRadio: Mo,
  NeumorphismRadioGroup: Lo,
  NeumorphismSelect: So,
  NeumorphismTextarea: To,
  NeumorphismForm: vo,
  NeumorphismFormItem: Co,
  NeumorphismModal: go,
  NeumorphismToastProvider: xo,
  NeumorphismTooltip: lo,
  NeumorphismTabs: co,
  NeumorphismBreadcrumb: ho,
  NeumorphismPagination: No,
  NeumorphismAvatar: fo,
  NeumorphismBadge: uo,
  NeumorphismTag: no,
  NeumorphismAlert: ao,
  NeumorphismPopover: po,
  NeumorphismDropdown: io,
  NeumorphismEmpty: so,
  NeumorphismProgress: to,
  NeumorphismScrollbar: mo,
  NeumorphismSkeleton: eo,
  NeumorphismTable: ro,
  NeumorphismDivider: oo,
  NeumorphismCollapse: Q,
  NeumorphismContainer: J,
  NeumorphismRow: H,
  NeumorphismCol: W,
  NeumorphismLayout: q,
  NeumorphismThemeToggle: z,
  NeumorphismTree: j,
  NeumorphismTreeNode: Z,
  NeumorphismCanvas: V,
  NeumorphismLogo: U,
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
  NeumorphismUpload: A,
  NeumorphismAutoComplete: I,
  NeumorphismChartBar: R,
  NeumorphismChartLine: F,
  NeumorphismChartPie: P,
  NeumorphismChartCandlestick: w,
  NeumorphismSpinner: y,
  NeumorphismStatusDot: b,
  NeumorphismSegmented: M
};
function Ao(o, m) {
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
const Kr = {
  install: Ao,
  version: "1.2.0"
};
export {
  Xm as ComponentRegistry,
  S as ConfigKey,
  Zm as FormKey,
  Rm as LocaleKey,
  ao as NeumorphismAlert,
  I as NeumorphismAutoComplete,
  fo as NeumorphismAvatar,
  uo as NeumorphismBadge,
  ho as NeumorphismBreadcrumb,
  Ro as NeumorphismButton,
  V as NeumorphismCanvas,
  Po as NeumorphismCard,
  R as NeumorphismChartBar,
  w as NeumorphismChartCandlestick,
  F as NeumorphismChartLine,
  P as NeumorphismChartPie,
  bo as NeumorphismCheckbox,
  W as NeumorphismCol,
  Q as NeumorphismCollapse,
  J as NeumorphismContainer,
  D as NeumorphismDatePicker,
  oo as NeumorphismDivider,
  K as NeumorphismDrawer,
  io as NeumorphismDropdown,
  so as NeumorphismEmpty,
  X as NeumorphismFieldError,
  G as NeumorphismFieldLabel,
  vo as NeumorphismForm,
  Co as NeumorphismFormItem,
  wo as NeumorphismInput,
  O as NeumorphismInputNumber,
  q as NeumorphismLayout,
  E as NeumorphismList,
  U as NeumorphismLogo,
  B as NeumorphismMenu,
  go as NeumorphismModal,
  _ as NeumorphismNavMenu,
  No as NeumorphismPagination,
  po as NeumorphismPopover,
  to as NeumorphismProgress,
  Mo as NeumorphismRadio,
  Lo as NeumorphismRadioGroup,
  H as NeumorphismRow,
  mo as NeumorphismScrollbar,
  M as NeumorphismSegmented,
  So as NeumorphismSelect,
  eo as NeumorphismSkeleton,
  Y as NeumorphismSlider,
  y as NeumorphismSpinner,
  b as NeumorphismStatusDot,
  k as NeumorphismSteps,
  Fo as NeumorphismSwitch,
  ro as NeumorphismTable,
  co as NeumorphismTabs,
  no as NeumorphismTag,
  To as NeumorphismTextarea,
  z as NeumorphismThemeToggle,
  xo as NeumorphismToastProvider,
  lo as NeumorphismTooltip,
  j as NeumorphismTree,
  Z as NeumorphismTreeNode,
  A as NeumorphismUpload,
  $ as NeumorphismVirtualList,
  jm as RadioGroupKey,
  zm as RowGutterKey,
  yo as ThemeProvider,
  Zr as Z_LAYERS,
  jr as Z_STRIDE,
  Pm as createChartRenderer,
  Jr as createTheme,
  Bm as debounce,
  Kr as default,
  $m as enUS,
  Km as generateId,
  Qr as getAntiFlickerScript,
  Im as getLocaleMessages,
  Ao as install,
  Om as isEmpty,
  fm as isImeComposing,
  L as prefersReducedMotion,
  Am as provideLocale,
  oe as provideTheme,
  Ie as useAlert,
  sm as useAutoComplete,
  vm as useBarChart,
  ym as useCandlestickChart,
  gm as useChart,
  pe as useChartInteraction,
  Nm as useChatInput,
  nm as useChatScroll,
  _e as useCheckable,
  pm as useClipboard,
  be as useCollapse,
  Xr as useConfig,
  rm as useDatePicker,
  qe as useDrawer,
  me as useFloatingPosition,
  Ur as useFocusStack,
  Ke as useFormField,
  Sm as useLineChart,
  Em as useLocale,
  He as useMenu,
  we as useModal,
  Um as useNeumorphismSetup,
  Ge as useNumberInput,
  Ce as usePagination,
  Mm as usePieChart,
  fe as usePixelLogoAnimation,
  Ve as usePopover,
  le as useProgress,
  he as useReducedMotion,
  se as useScrollbar,
  cm as useSegmented,
  ne as useSelect,
  Ye as useSlider,
  je as useSteps,
  Wr as useSwipe,
  Le as useTable,
  xe as useTabs,
  re as useTheme,
  Fe as useToast,
  Ee as useTooltip,
  $e as useTouchDevice,
  Te as useTree,
  mm as useUpload,
  Qe as useVirtualList,
  zr as useZIndex,
  Br as vMagnetic,
  dm as validateFieldValue,
  km as zhCN
};

import { computed as c, inject as l, provide as d } from "vue";
import { zhCN as r, enUS as f } from "../locales/index.js";
const L = {
  "zh-CN": r,
  "en-US": f
}, u = Symbol("nm-locale"), i = r, m = c(() => i);
function p(n, e) {
  return n ? e ? n.replace(/\{(\w+)\}/g, (t, o) => String(e[o] ?? `{${o}}`)) : n : "";
}
function C() {
  const n = l(u, m);
  function e(t, o) {
    return p(n.value[t], o);
  }
  return { locale: n, t: e };
}
function A(n) {
  d(
    u,
    c(() => n)
  ), typeof document < "u" && typeof window < "u" && (document.documentElement.lang = n._localeCode || document.documentElement.lang || "zh-CN");
}
function _(n) {
  return L[n] ?? i;
}
export {
  u as LocaleKey,
  _ as getLocaleMessages,
  A as provideLocale,
  C as useLocale
};

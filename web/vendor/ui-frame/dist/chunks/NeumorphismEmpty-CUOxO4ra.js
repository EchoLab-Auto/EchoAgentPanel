import { defineComponent as f, computed as o, openBlock as i, createElementBlock as r, normalizeStyle as h, normalizeClass as _, createElementVNode as g, renderSlot as n, createStaticVNode as k, toDisplayString as w, createCommentVNode as c } from "vue";
import { u as x } from "./createComponent-jnXBYqCm.js";
import { n as S, r as z, E as C } from "./controlScales-CPj0Htdh.js";
import { _ as E } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismEmpty.css';const N = { class: "nm-empty__image" }, L = ["src", "alt"], $ = {
  key: 1,
  class: "nm-empty__illustration",
  viewBox: "0 0 160 160",
  xmlns: "http://www.w3.org/2000/svg",
  "aria-hidden": "true"
}, B = {
  key: 0,
  class: "nm-empty__description"
}, P = {
  key: 1,
  class: "nm-empty__footer"
}, V = 100, A = /* @__PURE__ */ f({
  __name: "NeumorphismEmpty",
  props: {
    image: {},
    description: {},
    size: {}
  },
  setup(e) {
    const d = e, { config: m, resolveProp: u } = x(), s = o(() => {
      var t;
      return u(d.size, (t = m.value.empty) == null ? void 0 : t.size, "medium");
    }), a = o(
      () => typeof s.value == "number" ? S(s.value, V) : void 0
    ), p = o(
      () => typeof s.value == "string" ? s.value : "medium"
    ), y = o(
      () => a.value === void 0 ? void 0 : z(C, a.value)
    ), v = o(() => [
      "nm-empty",
      // 数字与档位互斥：数字走 `--sized`（变量来自内联样式），字符串走档位类
      a.value === void 0 ? `nm-empty--${p.value}` : "nm-empty--sized"
    ]);
    return (t, l) => (i(), r("div", {
      class: _(v.value),
      style: h(y.value)
    }, [
      g("div", N, [
        n(t.$slots, "image", {}, () => [
          e.image ? (i(), r("img", {
            key: 0,
            src: e.image,
            alt: e.description ?? "",
            class: "nm-empty__img"
          }, null, 8, L)) : (i(), r("svg", $, [...l[0] || (l[0] = [
            k('<rect x="28" y="48" width="104" height="82" rx="4" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3" data-v-2d2f9858></rect><path d="M28 48 L80 62 L132 48" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3" data-v-2d2f9858></path><rect x="48" y="66" width="64" height="6" rx="2" fill="currentColor" opacity="0.12" data-v-2d2f9858></rect><rect x="48" y="80" width="48" height="6" rx="2" fill="currentColor" opacity="0.12" data-v-2d2f9858></rect><rect x="48" y="94" width="56" height="6" rx="2" fill="currentColor" opacity="0.12" data-v-2d2f9858></rect><circle cx="116" cy="116" r="16" fill="none" stroke="currentColor" stroke-width="2.5" opacity="0.25" data-v-2d2f9858></circle><line x1="127" y1="127" x2="138" y2="138" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.25" data-v-2d2f9858></line>', 7)
          ])]))
        ], !0)
      ]),
      e.description ? (i(), r("div", B, w(e.description), 1)) : c("", !0),
      t.$slots.default ? (i(), r("div", P, [
        n(t.$slots, "default", {}, void 0, !0)
      ])) : c("", !0)
    ], 6));
  }
}), b = /* @__PURE__ */ E(A, [["__scopeId", "data-v-2d2f9858"]]);
export {
  b as N
};

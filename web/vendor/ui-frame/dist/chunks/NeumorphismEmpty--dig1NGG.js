import { defineComponent as u, computed as s, openBlock as o, createElementBlock as r, normalizeClass as y, createElementVNode as h, renderSlot as a, createStaticVNode as v, toDisplayString as f, createCommentVNode as c } from "vue";
import { u as g } from "./createComponent-jnXBYqCm.js";
import { _ } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismEmpty.css';const k = { class: "nm-empty__image" }, w = ["src", "alt"], x = {
  key: 1,
  class: "nm-empty__illustration",
  viewBox: "0 0 160 160",
  xmlns: "http://www.w3.org/2000/svg",
  "aria-hidden": "true"
}, C = {
  key: 0,
  class: "nm-empty__description"
}, N = {
  key: 1,
  class: "nm-empty__footer"
}, z = /* @__PURE__ */ u({
  __name: "NeumorphismEmpty",
  props: {
    image: {},
    description: {},
    size: {}
  },
  setup(e) {
    const n = e, { config: l, resolveProp: m } = g(), d = s(() => {
      var t;
      return m(n.size, (t = l.value.empty) == null ? void 0 : t.size, "medium");
    }), p = s(() => ["nm-empty", `nm-empty--${d.value}`]);
    return (t, i) => (o(), r("div", {
      class: y(p.value)
    }, [
      h("div", k, [
        a(t.$slots, "image", {}, () => [
          e.image ? (o(), r("img", {
            key: 0,
            src: e.image,
            alt: e.description ?? "",
            class: "nm-empty__img"
          }, null, 8, w)) : (o(), r("svg", x, [...i[0] || (i[0] = [
            v('<rect x="28" y="48" width="104" height="82" rx="4" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3" data-v-766e3e5a></rect><path d="M28 48 L80 62 L132 48" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3" data-v-766e3e5a></path><rect x="48" y="66" width="64" height="6" rx="2" fill="currentColor" opacity="0.12" data-v-766e3e5a></rect><rect x="48" y="80" width="48" height="6" rx="2" fill="currentColor" opacity="0.12" data-v-766e3e5a></rect><rect x="48" y="94" width="56" height="6" rx="2" fill="currentColor" opacity="0.12" data-v-766e3e5a></rect><circle cx="116" cy="116" r="16" fill="none" stroke="currentColor" stroke-width="2.5" opacity="0.25" data-v-766e3e5a></circle><line x1="127" y1="127" x2="138" y2="138" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.25" data-v-766e3e5a></line>', 7)
          ])]))
        ], !0)
      ]),
      e.description ? (o(), r("div", C, f(e.description), 1)) : c("", !0),
      t.$slots.default ? (o(), r("div", N, [
        a(t.$slots, "default", {}, void 0, !0)
      ])) : c("", !0)
    ], 2));
  }
}), B = /* @__PURE__ */ _(z, [["__scopeId", "data-v-766e3e5a"]]);
export {
  B as N
};

import { defineComponent as y, computed as l, openBlock as s, createElementBlock as n, unref as N, normalizeClass as m, createElementVNode as d, Fragment as z, renderList as w, withKeys as u, withModifiers as B, toDisplayString as b, createCommentVNode as L } from "vue";
import { useLocale as $ } from "../composables/useLocale.js";
import { u as K } from "./createComponent-jnXBYqCm.js";
import { _ as S } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismBreadcrumb.css';const E = ["aria-label"], V = { class: "nm-breadcrumb__list" }, D = ["aria-current"], F = ["role", "tabindex", "onClick", "onKeydown"], I = {
  key: 0,
  class: "nm-breadcrumb__separator",
  "aria-hidden": "true"
}, M = /* @__PURE__ */ y({
  __name: "NeumorphismBreadcrumb",
  props: {
    items: { default: () => [] },
    separator: { default: "/" },
    size: {}
  },
  emits: ["itemClick"],
  setup(t, { emit: h }) {
    const _ = t, { config: f, resolveProp: v } = K(), p = l(
      () => {
        var a;
        return v(_.size, (a = f.value.breadcrumb) == null ? void 0 : a.size, "medium");
      }
    ), { t: k } = $(), g = h, C = l(() => ["nm-breadcrumb", `nm-breadcrumb--${p.value}`]);
    function o(a, c) {
      a.disabled || g("itemClick", a, c);
    }
    return (a, c) => (s(), n("nav", {
      class: m(C.value),
      "aria-label": N(k)("breadcrumbLabel")
    }, [
      d("ol", V, [
        (s(!0), n(z, null, w(t.items, (r, e) => (s(), n("li", {
          key: e,
          class: m(["nm-breadcrumb__item", {
            "nm-breadcrumb__item--active": e === t.items.length - 1,
            "nm-breadcrumb__item--disabled": r.disabled
          }]),
          "aria-current": e === t.items.length - 1 ? "page" : void 0
        }, [
          d("span", {
            class: m(["nm-breadcrumb__text", { "nm-breadcrumb__text--link": e !== t.items.length - 1 && !r.disabled }]),
            role: e !== t.items.length - 1 ? "link" : void 0,
            tabindex: e !== t.items.length - 1 && !r.disabled ? 0 : -1,
            onClick: (i) => o(r, e),
            onKeydown: [
              u((i) => o(r, e), ["enter"]),
              u(B((i) => o(r, e), ["prevent"]), ["space"])
            ]
          }, b(r.label), 43, F),
          e < t.items.length - 1 ? (s(), n("span", I, b(t.separator), 1)) : L("", !0)
        ], 10, D))), 128))
      ])
    ], 10, E));
  }
}), G = /* @__PURE__ */ S(M, [["__scopeId", "data-v-754f15f5"]]);
export {
  G as N
};

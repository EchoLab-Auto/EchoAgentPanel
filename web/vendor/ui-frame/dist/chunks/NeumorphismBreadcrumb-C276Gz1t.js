import { defineComponent as C, computed as n, openBlock as o, createElementBlock as i, unref as S, normalizeStyle as B, normalizeClass as l, createElementVNode as v, Fragment as N, renderList as w, withKeys as _, withModifiers as E, toDisplayString as h, createCommentVNode as L } from "vue";
import { useLocale as $ } from "../composables/useLocale.js";
import { u as A } from "./createComponent-jnXBYqCm.js";
import { n as D, r as K, B as F } from "./controlScales-CPj0Htdh.js";
import { _ as I } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismBreadcrumb.css';const M = ["aria-label"], R = { class: "nm-breadcrumb__list" }, U = ["aria-current"], V = ["role", "tabindex", "onClick", "onKeydown"], P = {
  key: 0,
  class: "nm-breadcrumb__separator",
  "aria-hidden": "true"
}, T = 14, X = /* @__PURE__ */ C({
  __name: "NeumorphismBreadcrumb",
  props: {
    items: { default: () => [] },
    separator: { default: "/" },
    size: {}
  },
  emits: ["itemClick"],
  setup(t, { emit: f }) {
    const u = t, { config: d } = A(), c = n(() => {
      var a;
      const r = u.size ?? ((a = d.value.breadcrumb) == null ? void 0 : a.size);
      return typeof r == "number" ? D(r, T) : void 0;
    }), p = n(() => {
      var a;
      const r = u.size ?? ((a = d.value.breadcrumb) == null ? void 0 : a.size);
      return typeof r == "string" ? r : "medium";
    }), z = n(
      () => c.value === void 0 ? void 0 : K(F, c.value)
    ), { t: g } = $(), k = f, y = n(() => [
      "nm-breadcrumb",
      c.value === void 0 ? `nm-breadcrumb--${p.value}` : "nm-breadcrumb--sized"
    ]);
    function m(r, a) {
      r.disabled || k("itemClick", r, a);
    }
    return (r, a) => (o(), i("nav", {
      class: l(y.value),
      style: B(z.value),
      "aria-label": S(g)("breadcrumbLabel")
    }, [
      v("ol", R, [
        (o(!0), i(N, null, w(t.items, (s, e) => (o(), i("li", {
          key: e,
          class: l(["nm-breadcrumb__item", {
            "nm-breadcrumb__item--active": e === t.items.length - 1,
            "nm-breadcrumb__item--disabled": s.disabled
          }]),
          "aria-current": e === t.items.length - 1 ? "page" : void 0
        }, [
          v("span", {
            class: l(["nm-breadcrumb__text", { "nm-breadcrumb__text--link": e !== t.items.length - 1 && !s.disabled }]),
            role: e !== t.items.length - 1 ? "link" : void 0,
            tabindex: e !== t.items.length - 1 && !s.disabled ? 0 : -1,
            onClick: (b) => m(s, e),
            onKeydown: [
              _((b) => m(s, e), ["enter"]),
              _(E((b) => m(s, e), ["prevent"]), ["space"])
            ]
          }, h(s.label), 43, V),
          e < t.items.length - 1 ? (o(), i("span", P, h(t.separator), 1)) : L("", !0)
        ], 10, U))), 128))
      ])
    ], 14, M));
  }
}), J = /* @__PURE__ */ I(X, [["__scopeId", "data-v-c7b8966a"]]);
export {
  J as N
};

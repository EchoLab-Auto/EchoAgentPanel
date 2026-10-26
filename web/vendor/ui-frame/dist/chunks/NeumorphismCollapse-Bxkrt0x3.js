import { defineComponent as C, computed as a, openBlock as m, createElementBlock as u, normalizeStyle as N, normalizeClass as r, Fragment as V, renderList as E, unref as s, createElementVNode as l, renderSlot as y, toDisplayString as L, createVNode as A } from "vue";
import { useCollapse as I } from "../composables/useCollapse.js";
import { generateId as w } from "../utils/index.js";
import { u as x } from "./createComponent-jnXBYqCm.js";
import { n as B, r as P, d as D } from "./controlScales-CPj0Htdh.js";
import { N as F } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as K } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismCollapse.css';const O = { class: "nm-collapse__header" }, T = ["id", "aria-expanded", "aria-controls", "aria-disabled", "disabled", "onClick"], U = { class: "nm-collapse__title" }, X = ["id", "aria-labelledby"], Z = { class: "nm-collapse__content" }, j = { class: "nm-collapse__content-inner" }, q = 15, G = /* @__PURE__ */ C({
  __name: "NeumorphismCollapse",
  props: {
    modelValue: { default: () => [] },
    accordion: { type: Boolean, default: void 0 },
    items: { default: () => [] },
    size: {}
  },
  emits: ["update:modelValue", "change"],
  setup(_, { emit: f }) {
    const c = _, { config: d, resolveProp: h } = x(), p = a(() => {
      var n;
      const o = c.size ?? ((n = d.value.collapse) == null ? void 0 : n.size);
      return typeof o == "number" ? B(o, q) : void 0;
    }), k = a(() => {
      var n;
      const o = c.size ?? ((n = d.value.collapse) == null ? void 0 : n.size);
      return typeof o == "string" ? o : "medium";
    }), b = a(
      () => p.value === void 0 ? void 0 : P(D, p.value)
    ), z = a(
      () => {
        var o;
        return h(c.accordion, (o = d.value.collapse) == null ? void 0 : o.accordion, !1);
      }
    ), v = f, g = a({
      get: () => c.modelValue,
      set: (o) => {
        v("update:modelValue", o), v("change", o);
      }
    }), { toggle: $, isActive: t } = I({
      modelValue: g,
      items: a(() => c.items),
      accordion: a(() => z.value)
    }), i = w("nm-collapse"), S = a(() => [
      "nm-collapse",
      p.value === void 0 ? `nm-collapse--${k.value}` : "nm-collapse--sized"
    ]);
    return (o, n) => (m(), u("div", {
      class: r(S.value),
      style: N(b.value)
    }, [
      (m(!0), u(V, null, E(_.items, (e) => (m(), u("div", {
        key: e.key,
        class: r(["nm-collapse__item", {
          "nm-collapse__item--active": s(t)(e.key),
          "nm-collapse__item--disabled": e.disabled
        }])
      }, [
        l("h3", O, [
          l("button", {
            id: `${s(i)}-${e.key}-header`,
            class: "nm-collapse__trigger",
            type: "button",
            "aria-expanded": s(t)(e.key),
            "aria-controls": `${s(i)}-${e.key}-panel`,
            "aria-disabled": e.disabled,
            disabled: e.disabled,
            onClick: (H) => s($)(e.key)
          }, [
            y(o.$slots, `header-${e.key}`, {
              item: e,
              active: s(t)(e.key)
            }, () => [
              l("span", U, L(e.title), 1)
            ], !0),
            l("span", {
              class: r(["nm-collapse__icon", { "nm-collapse__icon--active": s(t)(e.key) }])
            }, [
              A(F, {
                name: "chevron-down",
                size: "sm"
              })
            ], 2)
          ], 8, T)
        ]),
        l("div", {
          id: `${s(i)}-${e.key}-panel`,
          class: r(["nm-collapse__panel", { "nm-collapse__panel--collapsed": !s(t)(e.key) }]),
          role: "region",
          "aria-labelledby": `${s(i)}-${e.key}-header`
        }, [
          l("div", Z, [
            l("div", j, [
              y(o.$slots, e.key, {}, void 0, !0)
            ])
          ])
        ], 10, X)
      ], 2))), 128))
    ], 6));
  }
}), oe = /* @__PURE__ */ K(G, [["__scopeId", "data-v-f8da99a9"]]);
export {
  oe as N
};

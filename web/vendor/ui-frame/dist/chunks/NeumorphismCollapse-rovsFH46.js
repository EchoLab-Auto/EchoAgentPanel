import { defineComponent as g, computed as l, openBlock as i, createElementBlock as r, normalizeClass as d, Fragment as N, renderList as C, unref as s, createElementVNode as a, renderSlot as v, toDisplayString as V, createVNode as z } from "vue";
import { useCollapse as I } from "../composables/useCollapse.js";
import { generateId as S } from "../utils/index.js";
import { u as x } from "./createComponent-jnXBYqCm.js";
import { N as B } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as A } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismCollapse.css';const E = { class: "nm-collapse__header" }, L = ["id", "aria-expanded", "aria-controls", "aria-disabled", "disabled", "onClick"], w = { class: "nm-collapse__title" }, D = ["id", "aria-labelledby"], F = { class: "nm-collapse__content" }, K = { class: "nm-collapse__content-inner" }, P = /* @__PURE__ */ g({
  __name: "NeumorphismCollapse",
  props: {
    modelValue: { default: () => [] },
    accordion: { type: Boolean, default: void 0 },
    items: { default: () => [] },
    size: {}
  },
  emits: ["update:modelValue", "change"],
  setup(p, { emit: y }) {
    const c = p, { config: m, resolveProp: _ } = x(), h = l(() => {
      var o;
      return _(c.size, (o = m.value.collapse) == null ? void 0 : o.size, "medium");
    }), k = l(
      () => {
        var o;
        return _(c.accordion, (o = m.value.collapse) == null ? void 0 : o.accordion, !1);
      }
    ), u = y, f = l({
      get: () => c.modelValue,
      set: (o) => {
        u("update:modelValue", o), u("change", o);
      }
    }), { toggle: b, isActive: n } = I({
      modelValue: f,
      items: l(() => c.items),
      accordion: l(() => k.value)
    }), t = S("nm-collapse"), $ = l(() => ["nm-collapse", `nm-collapse--${h.value}`]);
    return (o, j) => (i(), r("div", {
      class: d($.value)
    }, [
      (i(!0), r(N, null, C(p.items, (e) => (i(), r("div", {
        key: e.key,
        class: d(["nm-collapse__item", {
          "nm-collapse__item--active": s(n)(e.key),
          "nm-collapse__item--disabled": e.disabled
        }])
      }, [
        a("h3", E, [
          a("button", {
            id: `${s(t)}-${e.key}-header`,
            class: "nm-collapse__trigger",
            type: "button",
            "aria-expanded": s(n)(e.key),
            "aria-controls": `${s(t)}-${e.key}-panel`,
            "aria-disabled": e.disabled,
            disabled: e.disabled,
            onClick: (q) => s(b)(e.key)
          }, [
            v(o.$slots, `header-${e.key}`, {
              item: e,
              active: s(n)(e.key)
            }, () => [
              a("span", w, V(e.title), 1)
            ], !0),
            a("span", {
              class: d(["nm-collapse__icon", { "nm-collapse__icon--active": s(n)(e.key) }])
            }, [
              z(B, {
                name: "chevron-down",
                size: "sm"
              })
            ], 2)
          ], 8, L)
        ]),
        a("div", {
          id: `${s(t)}-${e.key}-panel`,
          class: d(["nm-collapse__panel", { "nm-collapse__panel--collapsed": !s(n)(e.key) }]),
          role: "region",
          "aria-labelledby": `${s(t)}-${e.key}-header`
        }, [
          a("div", F, [
            a("div", K, [
              v(o.$slots, e.key, {}, void 0, !0)
            ])
          ])
        ], 10, D)
      ], 2))), 128))
    ], 2));
  }
}), R = /* @__PURE__ */ A(P, [["__scopeId", "data-v-116587fa"]]);
export {
  R as N
};

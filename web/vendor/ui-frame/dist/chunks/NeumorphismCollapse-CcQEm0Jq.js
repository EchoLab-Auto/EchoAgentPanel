import { defineComponent as C, computed as a, openBlock as i, createElementBlock as r, normalizeClass as d, Fragment as V, renderList as z, unref as l, createElementVNode as s, renderSlot as h, toDisplayString as N } from "vue";
import { useCollapse as x } from "../composables/useCollapse.js";
import { generateId as B } from "../utils/index.js";
import { u as S } from "./createComponent-jnXBYqCm.js";
import { _ as w } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismCollapse.css';const I = { class: "nm-collapse__header" }, A = ["id", "aria-expanded", "aria-controls", "aria-disabled", "disabled", "onClick"], E = { class: "nm-collapse__title" }, L = ["id", "aria-labelledby"], D = { class: "nm-collapse__content" }, F = { class: "nm-collapse__content-inner" }, K = /* @__PURE__ */ C({
  __name: "NeumorphismCollapse",
  props: {
    modelValue: { default: () => [] },
    accordion: { type: Boolean, default: void 0 },
    items: { default: () => [] },
    size: {}
  },
  emits: ["update:modelValue", "change"],
  setup(p, { emit: k }) {
    const t = p, { config: _, resolveProp: m } = S(), y = a(() => {
      var o;
      return m(t.size, (o = _.value.collapse) == null ? void 0 : o.size, "medium");
    }), b = a(
      () => {
        var o;
        return m(t.accordion, (o = _.value.collapse) == null ? void 0 : o.accordion, !1);
      }
    ), u = k, f = a({
      get: () => t.modelValue,
      set: (o) => {
        u("update:modelValue", o), u("change", o);
      }
    }), { toggle: g, isActive: n } = x({
      modelValue: f,
      items: a(() => t.items),
      accordion: a(() => b.value)
    }), c = B("nm-collapse"), $ = a(() => ["nm-collapse", `nm-collapse--${y.value}`]);
    return (o, v) => (i(), r("div", {
      class: d($.value)
    }, [
      (i(!0), r(V, null, z(p.items, (e) => (i(), r("div", {
        key: e.key,
        class: d(["nm-collapse__item", {
          "nm-collapse__item--active": l(n)(e.key),
          "nm-collapse__item--disabled": e.disabled
        }])
      }, [
        s("h3", I, [
          s("button", {
            id: `${l(c)}-${e.key}-header`,
            class: "nm-collapse__trigger",
            type: "button",
            "aria-expanded": l(n)(e.key),
            "aria-controls": `${l(c)}-${e.key}-panel`,
            "aria-disabled": e.disabled,
            disabled: e.disabled,
            onClick: (M) => l(g)(e.key)
          }, [
            h(o.$slots, `header-${e.key}`, {
              item: e,
              active: l(n)(e.key)
            }, () => [
              s("span", E, N(e.title), 1)
            ], !0),
            s("span", {
              class: d(["nm-collapse__icon", { "nm-collapse__icon--active": l(n)(e.key) }])
            }, [...v[0] || (v[0] = [
              s("svg", {
                width: "14",
                height: "14",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                "stroke-width": "2"
              }, [
                s("path", { d: "M6 9l6 6 6-6" })
              ], -1)
            ])], 2)
          ], 8, A)
        ]),
        s("div", {
          id: `${l(c)}-${e.key}-panel`,
          class: d(["nm-collapse__panel", { "nm-collapse__panel--collapsed": !l(n)(e.key) }]),
          role: "region",
          "aria-labelledby": `${l(c)}-${e.key}-header`
        }, [
          s("div", D, [
            s("div", F, [
              h(o.$slots, e.key, {}, void 0, !0)
            ])
          ])
        ], 10, L)
      ], 2))), 128))
    ], 2));
  }
}), J = /* @__PURE__ */ w(K, [["__scopeId", "data-v-881352be"]]);
export {
  J as N
};

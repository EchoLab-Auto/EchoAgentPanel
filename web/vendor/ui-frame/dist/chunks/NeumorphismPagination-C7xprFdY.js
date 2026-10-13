import { defineComponent as M, computed as l, openBlock as r, createElementBlock as u, unref as o, normalizeClass as _, toDisplayString as g, createCommentVNode as P, createElementVNode as i, Fragment as $, renderList as E, renderSlot as F, createTextVNode as x } from "vue";
import { useLocale as I } from "../composables/useLocale.js";
import { usePagination as q } from "../composables/usePagination.js";
import { u as A } from "./createComponent-jnXBYqCm.js";
import { _ as G } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismPagination.css';const H = ["aria-label"], K = {
  key: 0,
  class: "nm-pagination__total"
}, O = { class: "nm-pagination__list" }, Q = ["disabled", "aria-label"], R = {
  key: 0,
  class: "nm-pagination__ellipsis",
  "aria-hidden": "true"
}, U = ["aria-label", "aria-current", "onClick"], W = ["disabled", "aria-label"], X = {
  key: 1,
  class: "nm-pagination__jumper"
}, Y = ["max", "value", "disabled"], Z = /* @__PURE__ */ M({
  __name: "NeumorphismPagination",
  props: {
    modelValue: { default: 1 },
    total: { default: 0 },
    pageSize: {},
    size: {},
    showTotal: { type: Boolean, default: void 0 },
    showJumper: { type: Boolean, default: void 0 },
    maxVisiblePages: {},
    disabled: { type: Boolean, default: !1 },
    prevLabel: { default: "上一页" },
    nextLabel: { default: "下一页" },
    totalLabel: { default: void 0 }
  },
  emits: ["update:modelValue", "change"],
  setup(s, { emit: V }) {
    const a = s, { config: d, resolveProp: m } = A(), k = l(
      () => {
        var e;
        return m(a.size, (e = d.value.pagination) == null ? void 0 : e.size, "medium");
      }
    ), w = l(
      () => {
        var e;
        return m(a.showTotal, (e = d.value.pagination) == null ? void 0 : e.showTotal, !1);
      }
    ), y = l(
      () => {
        var e;
        return m(a.showJumper, (e = d.value.pagination) == null ? void 0 : e.showJumper, !1);
      }
    ), S = l(
      () => {
        var e;
        return m(a.maxVisiblePages, (e = d.value.pagination) == null ? void 0 : e.maxVisiblePages, 7);
      }
    ), L = l(
      () => {
        var e;
        return m(a.pageSize, (e = d.value.pagination) == null ? void 0 : e.pageSize, 10);
      }
    ), c = V, C = l({
      get: () => a.modelValue,
      set: (e) => {
        c("update:modelValue", e), c("change", e);
      }
    }), { totalPages: z, visiblePages: N, changePage: b, prevPage: v, nextPage: h, isPrevDisabled: T, isNextDisabled: B } = q({
      modelValue: C,
      total: l(() => a.total),
      pageSize: l(() => L.value),
      maxVisiblePages: l(() => S.value),
      disabled: l(() => a.disabled)
    }), J = l(() => [
      "nm-pagination",
      `nm-pagination--${k.value}`,
      { "nm-pagination--disabled": a.disabled }
    ]);
    function j(e) {
      b(Number(e.target.value));
    }
    const { t: p } = I(), D = l(() => a.totalLabel ? a.totalLabel.replace(/\{total\}/g, String(a.total)) : p("paginationTotal", { total: a.total })), f = l(() => {
      const [e = "", n = ""] = p("paginationJumper").split("{input}");
      return { pre: e.trim(), post: n.trim() };
    });
    return (e, n) => (r(), u("nav", {
      class: _(J.value),
      role: "navigation",
      "aria-label": o(p)("paginationLabel")
    }, [
      w.value ? (r(), u("span", K, g(D.value), 1)) : P("", !0),
      i("ul", O, [
        i("li", null, [
          i("button", {
            class: "nm-pagination__btn",
            disabled: o(T),
            "aria-label": s.prevLabel,
            type: "button",
            onClick: n[0] || (n[0] = //@ts-ignore
            (...t) => o(v) && o(v)(...t))
          }, [...n[2] || (n[2] = [
            i("svg", {
              width: "16",
              height: "16",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              "stroke-width": "2"
            }, [
              i("path", { d: "M15 18l-6-6 6-6" })
            ], -1)
          ])], 8, Q)
        ]),
        (r(!0), u($, null, E(o(N), (t) => F(e.$slots, "page-item", {
          key: String(t),
          page: t,
          active: t === s.modelValue
        }, () => [
          i("li", null, [
            typeof t == "string" ? (r(), u("span", R, "...")) : (r(), u("button", {
              key: 1,
              class: _(["nm-pagination__btn", { "nm-pagination__btn--active": t === s.modelValue }]),
              "aria-label": o(p)("paginationPageLabel", { page: t }),
              "aria-current": t === s.modelValue ? "page" : void 0,
              type: "button",
              onClick: (ee) => o(b)(t)
            }, g(t), 11, U))
          ])
        ], !0)), 128)),
        i("li", null, [
          i("button", {
            class: "nm-pagination__btn",
            disabled: o(B),
            "aria-label": s.nextLabel,
            type: "button",
            onClick: n[1] || (n[1] = //@ts-ignore
            (...t) => o(h) && o(h)(...t))
          }, [...n[3] || (n[3] = [
            i("svg", {
              width: "16",
              height: "16",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              "stroke-width": "2"
            }, [
              i("path", { d: "M9 18l6-6-6-6" })
            ], -1)
          ])], 8, W)
        ])
      ]),
      y.value ? (r(), u("div", X, [
        x(g(f.value.pre) + " ", 1),
        i("input", {
          class: "nm-pagination__jumper-input",
          type: "number",
          min: 1,
          max: o(z),
          value: s.modelValue,
          disabled: s.disabled,
          onChange: j
        }, null, 40, Y),
        x(" " + g(f.value.post), 1)
      ])) : P("", !0)
    ], 10, H));
  }
}), ne = /* @__PURE__ */ G(Z, [["__scopeId", "data-v-d3ccceda"]]);
export {
  ne as N
};

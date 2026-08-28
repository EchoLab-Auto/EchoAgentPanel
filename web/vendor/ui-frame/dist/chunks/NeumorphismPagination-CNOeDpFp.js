import { defineComponent as D, computed as l, openBlock as r, createElementBlock as u, unref as i, normalizeClass as f, toDisplayString as h, createCommentVNode as P, createElementVNode as n, Fragment as M, renderList as $, renderSlot as j, createTextVNode as _ } from "vue";
import { useLocale as E } from "../composables/useLocale.js";
import { usePagination as F } from "../composables/usePagination.js";
import { u as I } from "./createComponent-jnXBYqCm.js";
import { _ as q } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismPagination.css';const A = ["aria-label"], G = {
  key: 0,
  class: "nm-pagination__total"
}, H = { class: "nm-pagination__list" }, K = ["disabled", "aria-label"], O = {
  key: 0,
  class: "nm-pagination__ellipsis",
  "aria-hidden": "true"
}, Q = ["aria-label", "aria-current", "onClick"], R = ["disabled", "aria-label"], U = {
  key: 1,
  class: "nm-pagination__jumper"
}, W = ["max", "value", "disabled"], X = /* @__PURE__ */ D({
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
    totalLabel: { default: "共" }
  },
  emits: ["update:modelValue", "change"],
  setup(o, { emit: V }) {
    const s = o, { config: d, resolveProp: m } = I(), x = l(
      () => {
        var e;
        return m(s.size, (e = d.value.pagination) == null ? void 0 : e.size, "medium");
      }
    ), k = l(
      () => {
        var e;
        return m(s.showTotal, (e = d.value.pagination) == null ? void 0 : e.showTotal, !1);
      }
    ), w = l(
      () => {
        var e;
        return m(s.showJumper, (e = d.value.pagination) == null ? void 0 : e.showJumper, !1);
      }
    ), y = l(
      () => {
        var e;
        return m(s.maxVisiblePages, (e = d.value.pagination) == null ? void 0 : e.maxVisiblePages, 7);
      }
    ), S = l(
      () => {
        var e;
        return m(s.pageSize, (e = d.value.pagination) == null ? void 0 : e.pageSize, 10);
      }
    ), p = V, C = l({
      get: () => s.modelValue,
      set: (e) => {
        p("update:modelValue", e), p("change", e);
      }
    }), { totalPages: z, visiblePages: L, changePage: b, prevPage: c, nextPage: v, isPrevDisabled: N, isNextDisabled: B } = F({
      modelValue: C,
      total: l(() => s.total),
      pageSize: l(() => S.value),
      maxVisiblePages: l(() => y.value),
      disabled: l(() => s.disabled)
    }), T = l(() => [
      "nm-pagination",
      `nm-pagination--${x.value}`,
      { "nm-pagination--disabled": s.disabled }
    ]);
    function J(e) {
      b(Number(e.target.value));
    }
    const { t: g } = E();
    return (e, t) => (r(), u("nav", {
      class: f(T.value),
      role: "navigation",
      "aria-label": i(g)("paginationLabel")
    }, [
      k.value ? (r(), u("span", G, h(i(g)("paginationTotal", { total: o.total })), 1)) : P("", !0),
      n("ul", H, [
        n("li", null, [
          n("button", {
            class: "nm-pagination__btn",
            disabled: i(N),
            "aria-label": o.prevLabel,
            type: "button",
            onClick: t[0] || (t[0] = //@ts-ignore
            (...a) => i(c) && i(c)(...a))
          }, [...t[2] || (t[2] = [
            n("svg", {
              width: "16",
              height: "16",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              "stroke-width": "2"
            }, [
              n("path", { d: "M15 18l-6-6 6-6" })
            ], -1)
          ])], 8, K)
        ]),
        (r(!0), u(M, null, $(i(L), (a) => j(e.$slots, "page-item", {
          key: String(a),
          page: a,
          active: a === o.modelValue
        }, () => [
          n("li", null, [
            typeof a == "string" ? (r(), u("span", O, "...")) : (r(), u("button", {
              key: 1,
              class: f(["nm-pagination__btn", { "nm-pagination__btn--active": a === o.modelValue }]),
              "aria-label": i(g)("paginationPageLabel", { page: a }),
              "aria-current": a === o.modelValue ? "page" : void 0,
              type: "button",
              onClick: (Y) => i(b)(a)
            }, h(a), 11, Q))
          ])
        ], !0)), 128)),
        n("li", null, [
          n("button", {
            class: "nm-pagination__btn",
            disabled: i(B),
            "aria-label": o.nextLabel,
            type: "button",
            onClick: t[1] || (t[1] = //@ts-ignore
            (...a) => i(v) && i(v)(...a))
          }, [...t[3] || (t[3] = [
            n("svg", {
              width: "16",
              height: "16",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              "stroke-width": "2"
            }, [
              n("path", { d: "M9 18l6-6-6-6" })
            ], -1)
          ])], 8, R)
        ])
      ]),
      w.value ? (r(), u("div", U, [
        t[4] || (t[4] = _(" 跳至 ", -1)),
        n("input", {
          class: "nm-pagination__jumper-input",
          type: "number",
          min: 1,
          max: i(z),
          value: o.modelValue,
          disabled: o.disabled,
          onChange: J
        }, null, 40, W),
        t[5] || (t[5] = _(" 页 ", -1))
      ])) : P("", !0)
    ], 10, A));
  }
}), le = /* @__PURE__ */ q(X, [["__scopeId", "data-v-a88fe372"]]);
export {
  le as N
};

import { defineComponent as I, computed as n, openBlock as r, createElementBlock as u, unref as o, normalizeClass as h, toDisplayString as c, createCommentVNode as P, createElementVNode as l, createVNode as V, Fragment as F, renderList as M, renderSlot as q, createTextVNode as x } from "vue";
import { useLocale as A } from "../composables/useLocale.js";
import { usePagination as G } from "../composables/usePagination.js";
import { u as H } from "./createComponent-jnXBYqCm.js";
import { N as y } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as K } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismPagination.css';const O = ["aria-label"], Q = {
  key: 0,
  class: "nm-pagination__total"
}, R = { class: "nm-pagination__list" }, U = ["disabled", "aria-label"], W = {
  key: 0,
  class: "nm-pagination__ellipsis",
  "aria-hidden": "true"
}, X = ["aria-label", "aria-current", "onClick"], Y = ["disabled", "aria-label"], Z = {
  key: 1,
  class: "nm-pagination__jumper"
}, ee = ["max", "value", "disabled"], ae = /* @__PURE__ */ I({
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
  setup(i, { emit: S }) {
    const a = i, { config: m, resolveProp: d } = H(), z = n(
      () => {
        var e;
        return d(a.size, (e = m.value.pagination) == null ? void 0 : e.size, "medium");
      }
    ), L = n(
      () => {
        var e;
        return d(a.showTotal, (e = m.value.pagination) == null ? void 0 : e.showTotal, !1);
      }
    ), N = n(
      () => {
        var e;
        return d(a.showJumper, (e = m.value.pagination) == null ? void 0 : e.showJumper, !1);
      }
    ), k = n(
      () => {
        var e;
        return d(a.maxVisiblePages, (e = m.value.pagination) == null ? void 0 : e.maxVisiblePages, 7);
      }
    ), C = n(
      () => {
        var e;
        return d(a.pageSize, (e = m.value.pagination) == null ? void 0 : e.pageSize, 10);
      }
    ), g = S, w = n({
      get: () => a.modelValue,
      set: (e) => {
        g("update:modelValue", e), g("change", e);
      }
    }), { totalPages: T, visiblePages: J, changePage: b, prevPage: v, nextPage: f, isPrevDisabled: B, isNextDisabled: j } = G({
      modelValue: w,
      total: n(() => a.total),
      pageSize: n(() => C.value),
      maxVisiblePages: n(() => k.value),
      disabled: n(() => a.disabled)
    }), D = n(() => [
      "nm-pagination",
      `nm-pagination--${z.value}`,
      { "nm-pagination--disabled": a.disabled }
    ]);
    function $(e) {
      b(Number(e.target.value));
    }
    const { t: p } = A(), E = n(() => a.totalLabel ? a.totalLabel.replace(/\{total\}/g, String(a.total)) : p("paginationTotal", { total: a.total })), _ = n(() => {
      const [e = "", s = ""] = p("paginationJumper").split("{input}");
      return { pre: e.trim(), post: s.trim() };
    });
    return (e, s) => (r(), u("nav", {
      class: h(D.value),
      role: "navigation",
      "aria-label": o(p)("paginationLabel")
    }, [
      L.value ? (r(), u("span", Q, c(E.value), 1)) : P("", !0),
      l("ul", R, [
        l("li", null, [
          l("button", {
            class: "nm-pagination__btn",
            disabled: o(B),
            "aria-label": i.prevLabel,
            type: "button",
            onClick: s[0] || (s[0] = //@ts-ignore
            (...t) => o(v) && o(v)(...t))
          }, [
            V(y, {
              name: "chevron-left",
              size: "md"
            })
          ], 8, U)
        ]),
        (r(!0), u(F, null, M(o(J), (t) => q(e.$slots, "page-item", {
          key: String(t),
          page: t,
          active: t === i.modelValue
        }, () => [
          l("li", null, [
            typeof t == "string" ? (r(), u("span", W, "...")) : (r(), u("button", {
              key: 1,
              class: h(["nm-pagination__btn", { "nm-pagination__btn--active": t === i.modelValue }]),
              "aria-label": o(p)("paginationPageLabel", { page: t }),
              "aria-current": t === i.modelValue ? "page" : void 0,
              type: "button",
              onClick: (te) => o(b)(t)
            }, c(t), 11, X))
          ])
        ], !0)), 128)),
        l("li", null, [
          l("button", {
            class: "nm-pagination__btn",
            disabled: o(j),
            "aria-label": i.nextLabel,
            type: "button",
            onClick: s[1] || (s[1] = //@ts-ignore
            (...t) => o(f) && o(f)(...t))
          }, [
            V(y, {
              name: "chevron-right",
              size: "md"
            })
          ], 8, Y)
        ])
      ]),
      N.value ? (r(), u("div", Z, [
        x(c(_.value.pre) + " ", 1),
        l("input", {
          class: "nm-pagination__jumper-input",
          type: "number",
          min: 1,
          max: o(T),
          value: i.modelValue,
          disabled: i.disabled,
          onChange: $
        }, null, 40, ee),
        x(" " + c(_.value.post), 1)
      ])) : P("", !0)
    ], 10, O));
  }
}), ue = /* @__PURE__ */ K(ae, [["__scopeId", "data-v-166b2ff6"]]);
export {
  ue as N
};

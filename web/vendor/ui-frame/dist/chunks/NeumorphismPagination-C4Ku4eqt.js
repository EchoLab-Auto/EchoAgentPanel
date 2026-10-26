import { defineComponent as F, computed as a, openBlock as u, createElementBlock as m, unref as i, normalizeStyle as G, normalizeClass as P, toDisplayString as c, createCommentVNode as z, createElementVNode as s, createVNode as S, Fragment as M, renderList as O, renderSlot as U, createTextVNode as y } from "vue";
import { useLocale as X } from "../composables/useLocale.js";
import { usePagination as Z } from "../composables/usePagination.js";
import { u as q } from "./createComponent-jnXBYqCm.js";
import { n as H, r as K, P as Q } from "./controlScales-CPj0Htdh.js";
import { N as V } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as R } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismPagination.css';const W = ["aria-label"], Y = {
  key: 0,
  class: "nm-pagination__total"
}, ee = { class: "nm-pagination__list" }, ae = ["disabled", "aria-label"], te = {
  key: 0,
  class: "nm-pagination__ellipsis",
  "aria-hidden": "true"
}, oe = ["aria-label", "aria-current", "onClick"], ne = ["disabled", "aria-label"], ie = {
  key: 1,
  class: "nm-pagination__jumper"
}, le = ["max", "value", "disabled"], se = 38, re = /* @__PURE__ */ F({
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
  setup(l, { emit: x }) {
    const t = l, { config: r, resolveProp: d } = q(), g = a(() => {
      var n;
      const e = t.size ?? ((n = r.value.pagination) == null ? void 0 : n.size);
      return typeof e == "number" ? H(e, se) : void 0;
    }), N = a(() => {
      var n;
      const e = t.size ?? ((n = r.value.pagination) == null ? void 0 : n.size);
      return typeof e == "string" ? e : "medium";
    }), L = a(
      () => g.value === void 0 ? void 0 : K(Q, g.value)
    ), k = a(
      () => {
        var e;
        return d(t.showTotal, (e = r.value.pagination) == null ? void 0 : e.showTotal, !1);
      }
    ), C = a(
      () => {
        var e;
        return d(t.showJumper, (e = r.value.pagination) == null ? void 0 : e.showJumper, !1);
      }
    ), w = a(
      () => {
        var e;
        return d(t.maxVisiblePages, (e = r.value.pagination) == null ? void 0 : e.maxVisiblePages, 7);
      }
    ), T = a(
      () => {
        var e;
        return d(t.pageSize, (e = r.value.pagination) == null ? void 0 : e.pageSize, 10);
      }
    ), v = x, J = a({
      get: () => t.modelValue,
      set: (e) => {
        v("update:modelValue", e), v("change", e);
      }
    }), { totalPages: B, visiblePages: E, changePage: b, prevPage: _, nextPage: f, isPrevDisabled: I, isNextDisabled: A } = Z({
      modelValue: J,
      total: a(() => t.total),
      pageSize: a(() => T.value),
      maxVisiblePages: a(() => w.value),
      disabled: a(() => t.disabled)
    }), D = a(() => [
      "nm-pagination",
      g.value === void 0 ? `nm-pagination--${N.value}` : "nm-pagination--sized",
      { "nm-pagination--disabled": t.disabled }
    ]);
    function j(e) {
      b(Number(e.target.value));
    }
    const { t: p } = X(), $ = a(() => t.totalLabel ? t.totalLabel.replace(/\{total\}/g, String(t.total)) : p("paginationTotal", { total: t.total })), h = a(() => {
      const [e = "", n = ""] = p("paginationJumper").split("{input}");
      return { pre: e.trim(), post: n.trim() };
    });
    return (e, n) => (u(), m("nav", {
      class: P(D.value),
      style: G(L.value),
      role: "navigation",
      "aria-label": i(p)("paginationLabel")
    }, [
      k.value ? (u(), m("span", Y, c($.value), 1)) : z("", !0),
      s("ul", ee, [
        s("li", null, [
          s("button", {
            class: "nm-pagination__btn",
            disabled: i(I),
            "aria-label": l.prevLabel,
            type: "button",
            onClick: n[0] || (n[0] = //@ts-ignore
            (...o) => i(_) && i(_)(...o))
          }, [
            S(V, {
              name: "chevron-left",
              size: "md"
            })
          ], 8, ae)
        ]),
        (u(!0), m(M, null, O(i(E), (o) => U(e.$slots, "page-item", {
          key: String(o),
          page: o,
          active: o === l.modelValue
        }, () => [
          s("li", null, [
            typeof o == "string" ? (u(), m("span", te, "...")) : (u(), m("button", {
              key: 1,
              class: P(["nm-pagination__btn", { "nm-pagination__btn--active": o === l.modelValue }]),
              "aria-label": i(p)("paginationPageLabel", { page: o }),
              "aria-current": o === l.modelValue ? "page" : void 0,
              type: "button",
              onClick: (ue) => i(b)(o)
            }, c(o), 11, oe))
          ])
        ], !0)), 128)),
        s("li", null, [
          s("button", {
            class: "nm-pagination__btn",
            disabled: i(A),
            "aria-label": l.nextLabel,
            type: "button",
            onClick: n[1] || (n[1] = //@ts-ignore
            (...o) => i(f) && i(f)(...o))
          }, [
            S(V, {
              name: "chevron-right",
              size: "md"
            })
          ], 8, ne)
        ])
      ]),
      C.value ? (u(), m("div", ie, [
        y(c(h.value.pre) + " ", 1),
        s("input", {
          class: "nm-pagination__jumper-input",
          type: "number",
          min: 1,
          max: i(B),
          value: l.modelValue,
          disabled: l.disabled,
          onChange: j
        }, null, 40, le),
        y(" " + c(h.value.post), 1)
      ])) : z("", !0)
    ], 14, W));
  }
}), _e = /* @__PURE__ */ R(re, [["__scopeId", "data-v-d97835fe"]]);
export {
  _e as N
};

import { defineComponent as T, useSlots as V, computed as l, openBlock as i, createElementBlock as n, unref as d, normalizeStyle as A, normalizeClass as k, renderSlot as m, createCommentVNode as S, createElementVNode as f, toDisplayString as y, Fragment as D, renderList as F, withKeys as z, withModifiers as P, createTextVNode as H } from "vue";
import { useLocale as M } from "../composables/useLocale.js";
import { u as U } from "./createComponent-jnXBYqCm.js";
import { n as X, r as Z, L as j } from "./controlScales-CPj0Htdh.js";
import { _ as q } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismList.css';const G = ["aria-label"], J = {
  key: 0,
  class: "nm-list__header"
}, O = {
  key: 1,
  class: "nm-list__loading"
}, Q = { class: "nm-list__loading-text" }, R = {
  key: 2,
  class: "nm-list__empty"
}, W = { class: "nm-list__empty-text" }, Y = ["tabindex", "onClick", "onKeydown"], x = {
  key: 4,
  class: "nm-list__footer"
}, ee = 14, te = /* @__PURE__ */ T({
  __name: "NeumorphismList",
  props: {
    items: { default: () => [] },
    bordered: { type: Boolean, default: void 0 },
    split: { type: Boolean, default: void 0 },
    size: {},
    hoverable: { type: Boolean, default: void 0 },
    loading: { type: Boolean, default: !1 }
  },
  emits: ["item-click"],
  setup(u, { emit: L }) {
    const o = u, h = V(), { config: r, resolveProp: c } = U(), v = l(() => {
      var s;
      const e = o.size ?? ((s = r.value.list) == null ? void 0 : s.size);
      return typeof e == "number" ? X(e, ee) : void 0;
    }), $ = l(() => {
      var s;
      const e = o.size ?? ((s = r.value.list) == null ? void 0 : s.size);
      return typeof e == "string" ? e : "medium";
    }), C = l(
      () => v.value === void 0 ? void 0 : Z(j, v.value)
    ), N = l(
      () => {
        var e;
        return c(o.bordered, (e = r.value.list) == null ? void 0 : e.bordered, !0);
      }
    ), B = l(() => {
      var e;
      return c(o.split, (e = r.value.list) == null ? void 0 : e.split, !0);
    }), E = l(
      () => {
        var e;
        return c(o.hoverable, (e = r.value.list) == null ? void 0 : e.hoverable, !0);
      }
    ), { t: p } = M(), w = L, b = l(() => !o.loading && o.items.length === 0), I = l(() => [
      "nm-list",
      v.value === void 0 ? `nm-list--${$.value}` : "nm-list--sized",
      {
        "nm-list--bordered": N.value,
        "nm-list--split": B.value,
        "nm-list--hoverable": E.value,
        "nm-list--loading": o.loading,
        "nm-list--empty": b.value
      }
    ]);
    function _(e, s) {
      w("item-click", e, s);
    }
    function K(e, s) {
      const t = e;
      return (t == null ? void 0 : t.id) ?? (t == null ? void 0 : t.key) ?? s;
    }
    return (e, s) => (i(), n("div", {
      class: k(I.value),
      style: A(C.value),
      role: "list",
      "aria-label": d(p)("listLabel")
    }, [
      e.$slots.header ? (i(), n("div", J, [
        m(e.$slots, "header", {}, void 0, !0)
      ])) : S("", !0),
      u.loading ? (i(), n("div", O, [
        m(e.$slots, "loading", {}, () => [
          s[0] || (s[0] = f("span", {
            class: "nm-list__spinner",
            "aria-hidden": "true"
          }, null, -1)),
          f("span", Q, y(d(p)("listLoading")), 1)
        ], !0)
      ])) : b.value ? (i(), n("div", R, [
        m(e.$slots, "empty", {}, () => [
          f("span", W, y(d(p)("listEmpty")), 1)
        ], !0)
      ])) : (i(!0), n(D, { key: 3 }, F(u.items, (t, a) => (i(), n("div", {
        key: K(t, a),
        class: k(["nm-list__item", {
          "nm-list__item--last": a === u.items.length - 1,
          "nm-list__item--clickable": !!d(h).default
        }]),
        role: "listitem",
        tabindex: d(h).default ? 0 : void 0,
        onClick: (g) => _(t, a),
        onKeydown: [
          z((g) => _(t, a), ["enter"]),
          z(P((g) => _(t, a), ["prevent"]), ["space"])
        ]
      }, [
        m(e.$slots, "default", {
          item: t,
          index: a
        }, () => [
          H(y(t), 1)
        ], !0)
      ], 42, Y))), 128)),
      e.$slots.footer ? (i(), n("div", x, [
        m(e.$slots, "footer", {}, void 0, !0)
      ])) : S("", !0)
    ], 14, G));
  }
}), ae = /* @__PURE__ */ q(te, [["__scopeId", "data-v-a7753cac"]]);
export {
  ae as N
};

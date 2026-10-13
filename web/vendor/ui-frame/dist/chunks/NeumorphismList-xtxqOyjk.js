import { defineComponent as K, useSlots as I, computed as a, openBlock as l, createElementBlock as o, unref as r, normalizeClass as g, renderSlot as d, createCommentVNode as k, createElementVNode as _, toDisplayString as f, Fragment as V, renderList as D, withKeys as $, withModifiers as F, createTextVNode as H } from "vue";
import { useLocale as M } from "../composables/useLocale.js";
import { u as P } from "./createComponent-jnXBYqCm.js";
import { _ as T } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismList.css';const j = ["aria-label"], q = {
  key: 0,
  class: "nm-list__header"
}, A = {
  key: 1,
  class: "nm-list__loading"
}, G = { class: "nm-list__loading-text" }, J = {
  key: 2,
  class: "nm-list__empty"
}, O = { class: "nm-list__empty-text" }, Q = ["tabindex", "onClick", "onKeydown"], R = {
  key: 4,
  class: "nm-list__footer"
}, U = /* @__PURE__ */ K({
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
  setup(m, { emit: B }) {
    const s = m, h = I(), { config: u, resolveProp: c } = P(), L = a(() => {
      var e;
      return c(s.size, (e = u.value.list) == null ? void 0 : e.size, "medium");
    }), N = a(
      () => {
        var e;
        return c(s.bordered, (e = u.value.list) == null ? void 0 : e.bordered, !0);
      }
    ), C = a(() => {
      var e;
      return c(s.split, (e = u.value.list) == null ? void 0 : e.split, !0);
    }), S = a(
      () => {
        var e;
        return c(s.hoverable, (e = u.value.list) == null ? void 0 : e.hoverable, !0);
      }
    ), { t: v } = M(), z = B, y = a(() => !s.loading && s.items.length === 0), w = a(() => [
      "nm-list",
      `nm-list--${L.value}`,
      {
        "nm-list--bordered": N.value,
        "nm-list--split": C.value,
        "nm-list--hoverable": S.value,
        "nm-list--loading": s.loading,
        "nm-list--empty": y.value
      }
    ]);
    function p(e, i) {
      z("item-click", e, i);
    }
    function E(e, i) {
      const t = e;
      return (t == null ? void 0 : t.id) ?? (t == null ? void 0 : t.key) ?? i;
    }
    return (e, i) => (l(), o("div", {
      class: g(w.value),
      role: "list",
      "aria-label": r(v)("listLabel")
    }, [
      e.$slots.header ? (l(), o("div", q, [
        d(e.$slots, "header", {}, void 0, !0)
      ])) : k("", !0),
      m.loading ? (l(), o("div", A, [
        d(e.$slots, "loading", {}, () => [
          i[0] || (i[0] = _("span", {
            class: "nm-list__spinner",
            "aria-hidden": "true"
          }, null, -1)),
          _("span", G, f(r(v)("listLoading")), 1)
        ], !0)
      ])) : y.value ? (l(), o("div", J, [
        d(e.$slots, "empty", {}, () => [
          _("span", O, f(r(v)("listEmpty")), 1)
        ], !0)
      ])) : (l(!0), o(V, { key: 3 }, D(m.items, (t, n) => (l(), o("div", {
        key: E(t, n),
        class: g(["nm-list__item", {
          "nm-list__item--last": n === m.items.length - 1,
          "nm-list__item--clickable": !!r(h).default
        }]),
        role: "listitem",
        tabindex: r(h).default ? 0 : void 0,
        onClick: (b) => p(t, n),
        onKeydown: [
          $((b) => p(t, n), ["enter"]),
          $(F((b) => p(t, n), ["prevent"]), ["space"])
        ]
      }, [
        d(e.$slots, "default", {
          item: t,
          index: n
        }, () => [
          H(f(t), 1)
        ], !0)
      ], 42, Q))), 128)),
      e.$slots.footer ? (l(), o("div", R, [
        d(e.$slots, "footer", {}, void 0, !0)
      ])) : k("", !0)
    ], 10, j));
  }
}), x = /* @__PURE__ */ T(U, [["__scopeId", "data-v-b698265c"]]);
export {
  x as N
};

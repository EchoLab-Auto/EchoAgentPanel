import { defineComponent as E, useSlots as I, computed as n, openBlock as l, createElementBlock as o, unref as c, normalizeClass as h, renderSlot as a, createCommentVNode as y, createElementVNode as v, toDisplayString as _, Fragment as V, renderList as D, createTextVNode as F } from "vue";
import { useLocale as H } from "../composables/useLocale.js";
import { u as K } from "./createComponent-jnXBYqCm.js";
import { _ as P } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismList.css';const T = ["aria-label"], j = {
  key: 0,
  class: "nm-list__header"
}, q = {
  key: 1,
  class: "nm-list__loading"
}, w = { class: "nm-list__loading-text" }, A = {
  key: 2,
  class: "nm-list__empty"
}, G = { class: "nm-list__empty-text" }, J = ["onClick"], M = {
  key: 4,
  class: "nm-list__footer"
}, O = /* @__PURE__ */ E({
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
  setup(r, { emit: g }) {
    const s = r, k = I(), { config: m, resolveProp: d } = K(), b = n(() => {
      var e;
      return d(s.size, (e = m.value.list) == null ? void 0 : e.size, "medium");
    }), $ = n(
      () => {
        var e;
        return d(s.bordered, (e = m.value.list) == null ? void 0 : e.bordered, !0);
      }
    ), B = n(() => {
      var e;
      return d(s.split, (e = m.value.list) == null ? void 0 : e.split, !0);
    }), L = n(
      () => {
        var e;
        return d(s.hoverable, (e = m.value.list) == null ? void 0 : e.hoverable, !0);
      }
    ), { t: p } = H(), N = g, f = n(() => !s.loading && s.items.length === 0), C = n(() => [
      "nm-list",
      `nm-list--${b.value}`,
      {
        "nm-list--bordered": $.value,
        "nm-list--split": B.value,
        "nm-list--hoverable": L.value,
        "nm-list--loading": s.loading,
        "nm-list--empty": f.value
      }
    ]);
    function S(e, i) {
      N("item-click", e, i);
    }
    function z(e, i) {
      const t = e;
      return (t == null ? void 0 : t.id) ?? (t == null ? void 0 : t.key) ?? i;
    }
    return (e, i) => (l(), o("div", {
      class: h(C.value),
      role: "list",
      "aria-label": c(p)("listLabel")
    }, [
      e.$slots.header ? (l(), o("div", j, [
        a(e.$slots, "header", {}, void 0, !0)
      ])) : y("", !0),
      r.loading ? (l(), o("div", q, [
        a(e.$slots, "loading", {}, () => [
          i[0] || (i[0] = v("span", {
            class: "nm-list__spinner",
            "aria-hidden": "true"
          }, null, -1)),
          v("span", w, _(c(p)("listLoading")), 1)
        ], !0)
      ])) : f.value ? (l(), o("div", A, [
        a(e.$slots, "empty", {}, () => [
          v("span", G, _(c(p)("listEmpty")), 1)
        ], !0)
      ])) : (l(!0), o(V, { key: 3 }, D(r.items, (t, u) => (l(), o("div", {
        key: z(t, u),
        class: h(["nm-list__item", {
          "nm-list__item--last": u === r.items.length - 1,
          "nm-list__item--clickable": !!c(k).default
        }]),
        role: "listitem",
        onClick: (Q) => S(t, u)
      }, [
        a(e.$slots, "default", {
          item: t,
          index: u
        }, () => [
          F(_(t), 1)
        ], !0)
      ], 10, J))), 128)),
      e.$slots.footer ? (l(), o("div", M, [
        a(e.$slots, "footer", {}, void 0, !0)
      ])) : y("", !0)
    ], 10, T));
  }
}), Y = /* @__PURE__ */ P(O, [["__scopeId", "data-v-9592fb74"]]);
export {
  Y as N
};

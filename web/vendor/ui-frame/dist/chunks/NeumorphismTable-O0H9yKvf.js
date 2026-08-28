import { defineComponent as O, computed as o, openBlock as a, createElementBlock as n, normalizeClass as v, createElementVNode as i, createVNode as N, unref as d, createCommentVNode as u, Fragment as p, renderList as g, normalizeStyle as T, renderSlot as h, createTextVNode as B, toDisplayString as _ } from "vue";
import { useTable as P } from "../composables/useTable.js";
import { useConfig as Q } from "../composables/useConfig.js";
import { useLocale as U } from "../composables/useLocale.js";
import { N as A } from "./NeumorphismCheckbox-ZN_HeVOw.js";
import { _ as X } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismTable.css';const Y = { class: "nm-table__wrapper" }, Z = { class: "nm-table__inner" }, ee = {
  key: 0,
  class: "nm-table__head"
}, te = {
  key: 0,
  class: "nm-table__th nm-table__th--selection"
}, le = ["onClick"], se = { class: "nm-table__th-content" }, ae = {
  key: 0,
  class: "nm-table__sort-icon",
  "aria-hidden": "true"
}, ne = { class: "nm-table__body" }, oe = ["onClick"], ie = {
  key: 0,
  class: "nm-table__td nm-table__td--selection"
}, de = {
  key: 0,
  class: "nm-table__empty"
}, re = { class: "nm-table__empty-text" }, ce = {
  key: 1,
  class: "nm-table__loading"
}, ue = { class: "nm-table__loading-text" }, me = /* @__PURE__ */ O({
  __name: "NeumorphismTable",
  props: {
    data: { default: () => [] },
    columns: { default: () => [] },
    rowKey: { default: "key" },
    selectable: { type: [Boolean, String], default: !1 },
    selectedKeys: { default: () => [] },
    loading: { type: Boolean, default: !1 },
    emptyText: { default: "暂无数据" },
    size: {},
    striped: { type: Boolean, default: void 0 },
    hoverable: { type: Boolean, default: void 0 },
    showHeader: { type: Boolean, default: !0 }
  },
  emits: ["update:selectedKeys", "select", "selectAll", "sort"],
  setup(r, { emit: W }) {
    const l = r, m = W, { t: f } = U(), b = Q(), z = o(() => {
      var e;
      return l.size ?? ((e = b.value.table) == null ? void 0 : e.size) ?? "medium";
    }), V = o(() => {
      var e;
      return l.striped ?? ((e = b.value.table) == null ? void 0 : e.striped) ?? !1;
    }), E = o(() => {
      var e;
      return l.hoverable ?? ((e = b.value.table) == null ? void 0 : e.hoverable) ?? !0;
    }), L = o(() => l.emptyText || f("tableEmpty")), H = o({
      get: () => l.selectedKeys,
      set: (e) => m("update:selectedKeys", e)
    }), {
      resolvedColumns: k,
      displayData: S,
      sortState: C,
      toggleSort: D,
      isSelected: K,
      toggleSelect: j,
      selectAll: F,
      isAllSelected: w,
      isIndeterminate: I
    } = P({
      data: o(() => l.data),
      columns: o(() => l.columns),
      rowKey: o(() => l.rowKey),
      selectable: o(() => l.selectable),
      selectedKeys: H
    });
    function M(e) {
      D(e), m("sort", e, C.value.direction);
    }
    function x(e) {
      const s = String(e[l.rowKey] ?? "");
      j(s), m("select", s, e);
    }
    function R() {
      F(), m("selectAll", w.value);
    }
    function q(e, s) {
      const t = e[s.key];
      return t == null ? "" : String(t);
    }
    function G(e) {
      if (!e.width && !e.minWidth) return;
      const s = {};
      return e.width && (s.width = typeof e.width == "number" ? `${e.width}px` : e.width), e.minWidth && (s.minWidth = typeof e.minWidth == "number" ? `${e.minWidth}px` : e.minWidth), s;
    }
    const J = o(() => [
      "nm-table",
      `nm-table--${z.value}`,
      {
        "nm-table--striped": V.value,
        "nm-table--hoverable": E.value,
        "nm-table--loading": l.loading
      }
    ]), $ = o(
      () => l.selectable === !0 || l.selectable === "multiple"
    );
    return (e, s) => (a(), n("div", {
      class: v(J.value)
    }, [
      i("div", Y, [
        i("table", Z, [
          r.showHeader ? (a(), n("thead", ee, [
            i("tr", null, [
              $.value ? (a(), n("th", te, [
                N(A, {
                  "model-value": d(w),
                  indeterminate: d(I),
                  onChange: R
                }, null, 8, ["model-value", "indeterminate"])
              ])) : u("", !0),
              (a(!0), n(p, null, g(d(k), (t) => (a(), n("th", {
                key: t.key,
                class: v(["nm-table__th", {
                  "nm-table__th--sortable": t.sortable,
                  "nm-table__th--active": d(C).key === t.key
                }]),
                style: T([G(t), { textAlign: t.align }]),
                onClick: (y) => t.sortable ? M(t.key) : void 0
              }, [
                i("span", se, [
                  h(e.$slots, "header", { column: t }, () => [
                    B(_(t.label), 1)
                  ], !0),
                  t.sortable ? (a(), n("span", ae, [...s[0] || (s[0] = [
                    i("svg", {
                      width: "10",
                      height: "10",
                      viewBox: "0 0 24 24",
                      fill: "none",
                      stroke: "currentColor",
                      "stroke-width": "3",
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round"
                    }, [
                      i("path", { d: "M18 15l-6-6-6 6" })
                    ], -1)
                  ])])) : u("", !0)
                ])
              ], 14, le))), 128))
            ])
          ])) : u("", !0),
          i("tbody", ne, [
            (a(!0), n(p, null, g(d(S), (t, y) => (a(), n("tr", {
              key: String(t[r.rowKey] ?? y),
              class: v(["nm-table__tr", {
                "nm-table__tr--selected": d(K)(String(t[r.rowKey] ?? ""))
              }]),
              onClick: (c) => r.selectable === "single" ? x(t) : void 0
            }, [
              $.value ? (a(), n("td", ie, [
                N(A, {
                  "model-value": d(K)(String(t[r.rowKey] ?? "")),
                  onChange: (c) => x(t)
                }, null, 8, ["model-value", "onChange"])
              ])) : u("", !0),
              (a(!0), n(p, null, g(d(k), (c) => (a(), n("td", {
                key: c.key,
                class: "nm-table__td",
                style: T({ textAlign: c.align })
              }, [
                h(e.$slots, `cell-${c.key}`, {
                  row: t,
                  column: c,
                  value: t[c.key],
                  index: y
                }, () => [
                  B(_(q(t, c)), 1)
                ], !0)
              ], 4))), 128))
            ], 10, oe))), 128))
          ])
        ]),
        d(S).length === 0 && !r.loading ? (a(), n("div", de, [
          h(e.$slots, "empty", {}, () => [
            i("span", re, _(L.value), 1)
          ], !0)
        ])) : u("", !0),
        r.loading ? (a(), n("div", ce, [
          h(e.$slots, "loading", {}, () => [
            s[1] || (s[1] = i("span", { class: "nm-table__loading-spinner" }, null, -1)),
            i("span", ue, _(d(f)("tableLoading")), 1)
          ], !0)
        ])) : u("", !0)
      ])
    ], 2));
  }
}), ge = /* @__PURE__ */ X(me, [["__scopeId", "data-v-0b007791"]]);
export {
  ge as N
};

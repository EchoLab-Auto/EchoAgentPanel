import { defineComponent as P, computed as i, openBlock as a, createElementBlock as n, normalizeClass as p, createElementVNode as d, createVNode as T, unref as o, createCommentVNode as b, Fragment as f, renderList as k, withKeys as B, withModifiers as Q, normalizeStyle as A, renderSlot as y, createTextVNode as W, toDisplayString as _ } from "vue";
import { useTable as U } from "../composables/useTable.js";
import { useConfig as X } from "../composables/useConfig.js";
import { useLocale as Y } from "../composables/useLocale.js";
import { N as z } from "./NeumorphismCheckbox-YoI_8c5H.js";
import { _ as Z } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismTable.css';const ee = { class: "nm-table__wrapper" }, te = { class: "nm-table__inner" }, le = {
  key: 0,
  class: "nm-table__head"
}, se = {
  key: 0,
  class: "nm-table__th nm-table__th--selection"
}, ae = ["tabindex", "aria-sort", "onClick", "onKeydown"], ne = { class: "nm-table__th-content" }, oe = {
  key: 0,
  class: "nm-table__sort-icon",
  "aria-hidden": "true"
}, ie = { class: "nm-table__body" }, de = ["onClick"], re = {
  key: 0,
  class: "nm-table__td nm-table__td--selection"
}, ce = {
  key: 0,
  class: "nm-table__empty"
}, be = { class: "nm-table__empty-text" }, ue = {
  key: 1,
  class: "nm-table__loading"
}, he = { class: "nm-table__loading-text" }, me = /* @__PURE__ */ P({
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
  setup(r, { emit: V }) {
    const l = r, h = V, { t: S } = Y(), v = X(), E = i(() => {
      var e;
      return l.size ?? ((e = v.value.table) == null ? void 0 : e.size) ?? "medium";
    }), L = i(() => {
      var e;
      return l.striped ?? ((e = v.value.table) == null ? void 0 : e.striped) ?? !1;
    }), H = i(() => {
      var e;
      return l.hoverable ?? ((e = v.value.table) == null ? void 0 : e.hoverable) ?? !0;
    }), D = i(() => l.emptyText || S("tableEmpty")), M = i({
      get: () => l.selectedKeys,
      set: (e) => h("update:selectedKeys", e)
    }), {
      resolvedColumns: C,
      displayData: K,
      sortState: m,
      toggleSort: j,
      isSelected: w,
      toggleSelect: F,
      selectAll: I,
      isAllSelected: x,
      isIndeterminate: R
    } = U({
      data: i(() => l.data),
      columns: i(() => l.columns),
      rowKey: i(() => l.rowKey),
      selectable: i(() => l.selectable),
      selectedKeys: M
    });
    function g(e) {
      j(e), h("sort", e, m.value.direction);
    }
    function $(e) {
      const s = String(e[l.rowKey] ?? "");
      F(s), h("select", s, e);
    }
    function q() {
      I(), h("selectAll", x.value);
    }
    function G(e, s) {
      const t = e[s.key];
      return t == null ? "" : String(t);
    }
    function J(e) {
      if (!e.width && !e.minWidth) return;
      const s = {};
      return e.width && (s.width = typeof e.width == "number" ? `${e.width}px` : e.width), e.minWidth && (s.minWidth = typeof e.minWidth == "number" ? `${e.minWidth}px` : e.minWidth), s;
    }
    const O = i(() => [
      "nm-table",
      `nm-table--${E.value}`,
      {
        "nm-table--striped": L.value,
        "nm-table--hoverable": H.value,
        "nm-table--loading": l.loading
      }
    ]), N = i(
      () => l.selectable === !0 || l.selectable === "multiple"
    );
    return (e, s) => (a(), n("div", {
      class: p(O.value)
    }, [
      d("div", ee, [
        d("table", te, [
          r.showHeader ? (a(), n("thead", le, [
            d("tr", null, [
              N.value ? (a(), n("th", se, [
                T(z, {
                  "model-value": o(x),
                  indeterminate: o(R),
                  onChange: q
                }, null, 8, ["model-value", "indeterminate"])
              ])) : b("", !0),
              (a(!0), n(f, null, k(o(C), (t) => (a(), n("th", {
                key: t.key,
                class: p(["nm-table__th", {
                  "nm-table__th--sortable": t.sortable,
                  "nm-table__th--active": o(m).key === t.key
                }]),
                style: A([J(t), { textAlign: t.align }]),
                tabindex: t.sortable ? 0 : void 0,
                "aria-sort": t.sortable ? o(m).key === t.key ? o(m).direction === "ascend" ? "ascending" : "descending" : "none" : void 0,
                onClick: (u) => t.sortable ? g(t.key) : void 0,
                onKeydown: [
                  B((u) => t.sortable ? g(t.key) : void 0, ["enter"]),
                  B(Q((u) => t.sortable ? g(t.key) : void 0, ["prevent"]), ["space"])
                ]
              }, [
                d("span", ne, [
                  y(e.$slots, "header", { column: t }, () => [
                    W(_(t.label), 1)
                  ], !0),
                  t.sortable ? (a(), n("span", oe, [...s[0] || (s[0] = [
                    d("svg", {
                      width: "12",
                      height: "12",
                      viewBox: "0 0 24 24",
                      fill: "none",
                      stroke: "currentColor",
                      "stroke-width": "2.5",
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round"
                    }, [
                      d("path", { d: "M18 15l-6-6-6 6" })
                    ], -1)
                  ])])) : b("", !0)
                ])
              ], 46, ae))), 128))
            ])
          ])) : b("", !0),
          d("tbody", ie, [
            (a(!0), n(f, null, k(o(K), (t, u) => (a(), n("tr", {
              key: String(t[r.rowKey] ?? u),
              class: p(["nm-table__tr", {
                "nm-table__tr--selected": o(w)(String(t[r.rowKey] ?? "")),
                "nm-table__tr--clickable": r.selectable === "single"
              }]),
              onClick: (c) => r.selectable === "single" ? $(t) : void 0
            }, [
              N.value ? (a(), n("td", re, [
                T(z, {
                  "model-value": o(w)(String(t[r.rowKey] ?? "")),
                  onChange: (c) => $(t)
                }, null, 8, ["model-value", "onChange"])
              ])) : b("", !0),
              (a(!0), n(f, null, k(o(C), (c) => (a(), n("td", {
                key: c.key,
                class: "nm-table__td",
                style: A({ textAlign: c.align })
              }, [
                y(e.$slots, `cell-${c.key}`, {
                  row: t,
                  column: c,
                  value: t[c.key],
                  index: u
                }, () => [
                  W(_(G(t, c)), 1)
                ], !0)
              ], 4))), 128))
            ], 10, de))), 128))
          ])
        ]),
        o(K).length === 0 && !r.loading ? (a(), n("div", ce, [
          y(e.$slots, "empty", {}, () => [
            d("span", be, _(D.value), 1)
          ], !0)
        ])) : b("", !0),
        r.loading ? (a(), n("div", ue, [
          y(e.$slots, "loading", {}, () => [
            s[1] || (s[1] = d("span", { class: "nm-table__loading-spinner" }, null, -1)),
            d("span", he, _(o(S)("tableLoading")), 1)
          ], !0)
        ])) : b("", !0)
      ])
    ], 2));
  }
}), ke = /* @__PURE__ */ Z(me, [["__scopeId", "data-v-8d1f554a"]]);
export {
  ke as N
};

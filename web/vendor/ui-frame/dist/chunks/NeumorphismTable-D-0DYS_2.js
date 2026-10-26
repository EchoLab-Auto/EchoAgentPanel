import { defineComponent as J, computed as a, openBlock as n, createElementBlock as o, normalizeStyle as g, normalizeClass as k, createElementVNode as c, createVNode as S, unref as i, createCommentVNode as m, Fragment as C, renderList as K, withKeys as B, withModifiers as O, renderSlot as h, createTextVNode as E, toDisplayString as v } from "vue";
import { useTable as Q } from "../composables/useTable.js";
import { useConfig as Y } from "../composables/useConfig.js";
import { useLocale as ee } from "../composables/useLocale.js";
import { n as te, r as le, h as se } from "./controlScales-CPj0Htdh.js";
import { N as L } from "./NeumorphismCheckbox-B5UkOay2.js";
import { N as ae } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as ne } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismTable.css';const oe = { class: "nm-table__wrapper" }, ie = { class: "nm-table__inner" }, re = {
  key: 0,
  class: "nm-table__head"
}, de = {
  key: 0,
  class: "nm-table__th nm-table__th--selection"
}, ce = ["tabindex", "aria-sort", "onClick", "onKeydown"], me = { class: "nm-table__th-content" }, ue = {
  key: 0,
  class: "nm-table__sort-icon",
  "aria-hidden": "true"
}, be = { class: "nm-table__body" }, ye = ["onClick"], _e = {
  key: 0,
  class: "nm-table__td nm-table__td--selection"
}, he = {
  key: 0,
  class: "nm-table__empty"
}, ve = { class: "nm-table__empty-text" }, pe = {
  key: 1,
  class: "nm-table__loading"
}, fe = { class: "nm-table__loading-text" }, ge = 12, ke = /* @__PURE__ */ J({
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
    const s = r, b = W, { t: w } = ee(), y = Y(), p = a(() => {
      var l;
      const e = s.size ?? ((l = y.value.table) == null ? void 0 : l.size);
      return typeof e == "number" ? te(e, ge) : void 0;
    }), V = a(() => {
      var l;
      const e = s.size ?? ((l = y.value.table) == null ? void 0 : l.size);
      return typeof e == "string" ? e : "medium";
    }), D = a(
      () => p.value === void 0 ? void 0 : le(se, p.value)
    ), H = a(() => {
      var e;
      return s.striped ?? ((e = y.value.table) == null ? void 0 : e.striped) ?? !1;
    }), I = a(() => {
      var e;
      return s.hoverable ?? ((e = y.value.table) == null ? void 0 : e.hoverable) ?? !0;
    }), F = a(() => s.emptyText || w("tableEmpty")), M = a({
      get: () => s.selectedKeys,
      set: (e) => b("update:selectedKeys", e)
    }), {
      resolvedColumns: z,
      displayData: x,
      sortState: _,
      toggleSort: P,
      isSelected: $,
      toggleSelect: R,
      selectAll: U,
      isAllSelected: N,
      isIndeterminate: X
    } = Q({
      data: a(() => s.data),
      columns: a(() => s.columns),
      rowKey: a(() => s.rowKey),
      selectable: a(() => s.selectable),
      selectedKeys: M
    });
    function f(e) {
      P(e), b("sort", e, _.value.direction);
    }
    function T(e) {
      const l = String(e[s.rowKey] ?? "");
      R(l), b("select", l, e);
    }
    function Z() {
      U(), b("selectAll", N.value);
    }
    function j(e, l) {
      const t = e[l.key];
      return t == null ? "" : String(t);
    }
    function q(e) {
      if (!e.width && !e.minWidth) return;
      const l = {};
      return e.width && (l.width = typeof e.width == "number" ? `${e.width}px` : e.width), e.minWidth && (l.minWidth = typeof e.minWidth == "number" ? `${e.minWidth}px` : e.minWidth), l;
    }
    const G = a(() => [
      "nm-table",
      p.value === void 0 ? `nm-table--${V.value}` : "nm-table--sized",
      {
        "nm-table--striped": H.value,
        "nm-table--hoverable": I.value,
        "nm-table--loading": s.loading
      }
    ]), A = a(
      () => s.selectable === !0 || s.selectable === "multiple"
    );
    return (e, l) => (n(), o("div", {
      class: k(G.value),
      style: g(D.value)
    }, [
      c("div", oe, [
        c("table", ie, [
          r.showHeader ? (n(), o("thead", re, [
            c("tr", null, [
              A.value ? (n(), o("th", de, [
                S(L, {
                  "model-value": i(N),
                  indeterminate: i(X),
                  onChange: Z
                }, null, 8, ["model-value", "indeterminate"])
              ])) : m("", !0),
              (n(!0), o(C, null, K(i(z), (t) => (n(), o("th", {
                key: t.key,
                class: k(["nm-table__th", {
                  "nm-table__th--sortable": t.sortable,
                  "nm-table__th--active": i(_).key === t.key
                }]),
                style: g([q(t), { textAlign: t.align }]),
                tabindex: t.sortable ? 0 : void 0,
                "aria-sort": t.sortable ? i(_).key === t.key ? i(_).direction === "ascend" ? "ascending" : "descending" : "none" : void 0,
                onClick: (u) => t.sortable ? f(t.key) : void 0,
                onKeydown: [
                  B((u) => t.sortable ? f(t.key) : void 0, ["enter"]),
                  B(O((u) => t.sortable ? f(t.key) : void 0, ["prevent"]), ["space"])
                ]
              }, [
                c("span", me, [
                  h(e.$slots, "header", { column: t }, () => [
                    E(v(t.label), 1)
                  ], !0),
                  t.sortable ? (n(), o("span", ue, [
                    S(ae, {
                      name: "chevron-up",
                      size: "xs"
                    })
                  ])) : m("", !0)
                ])
              ], 46, ce))), 128))
            ])
          ])) : m("", !0),
          c("tbody", be, [
            (n(!0), o(C, null, K(i(x), (t, u) => (n(), o("tr", {
              key: String(t[r.rowKey] ?? u),
              class: k(["nm-table__tr", {
                "nm-table__tr--selected": i($)(String(t[r.rowKey] ?? "")),
                "nm-table__tr--clickable": r.selectable === "single"
              }]),
              onClick: (d) => r.selectable === "single" ? T(t) : void 0
            }, [
              A.value ? (n(), o("td", _e, [
                S(L, {
                  "model-value": i($)(String(t[r.rowKey] ?? "")),
                  onChange: (d) => T(t)
                }, null, 8, ["model-value", "onChange"])
              ])) : m("", !0),
              (n(!0), o(C, null, K(i(z), (d) => (n(), o("td", {
                key: d.key,
                class: "nm-table__td",
                style: g({ textAlign: d.align })
              }, [
                h(e.$slots, `cell-${d.key}`, {
                  row: t,
                  column: d,
                  value: t[d.key],
                  index: u
                }, () => [
                  E(v(j(t, d)), 1)
                ], !0)
              ], 4))), 128))
            ], 10, ye))), 128))
          ])
        ]),
        i(x).length === 0 && !r.loading ? (n(), o("div", he, [
          h(e.$slots, "empty", {}, () => [
            c("span", ve, v(F.value), 1)
          ], !0)
        ])) : m("", !0),
        r.loading ? (n(), o("div", pe, [
          h(e.$slots, "loading", {}, () => [
            l[0] || (l[0] = c("span", { class: "nm-table__loading-spinner" }, null, -1)),
            c("span", fe, v(i(w)("tableLoading")), 1)
          ], !0)
        ])) : m("", !0)
      ])
    ], 6));
  }
}), Te = /* @__PURE__ */ ne(ke, [["__scopeId", "data-v-e0c8a6ff"]]);
export {
  Te as N
};

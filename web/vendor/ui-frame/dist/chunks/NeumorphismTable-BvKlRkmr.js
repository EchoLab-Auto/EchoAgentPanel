import { defineComponent as P, computed as i, openBlock as s, createElementBlock as a, normalizeClass as f, createElementVNode as c, createVNode as g, unref as n, createCommentVNode as b, Fragment as k, renderList as S, withKeys as z, withModifiers as Q, normalizeStyle as A, renderSlot as h, createTextVNode as B, toDisplayString as y } from "vue";
import { useTable as U } from "../composables/useTable.js";
import { useConfig as X } from "../composables/useConfig.js";
import { useLocale as Y } from "../composables/useLocale.js";
import { N as W } from "./NeumorphismCheckbox-CLyqAgEc.js";
import { N as Z } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as ee } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismTable.css';const te = { class: "nm-table__wrapper" }, le = { class: "nm-table__inner" }, se = {
  key: 0,
  class: "nm-table__head"
}, ae = {
  key: 0,
  class: "nm-table__th nm-table__th--selection"
}, ne = ["tabindex", "aria-sort", "onClick", "onKeydown"], oe = { class: "nm-table__th-content" }, ie = {
  key: 0,
  class: "nm-table__sort-icon",
  "aria-hidden": "true"
}, de = { class: "nm-table__body" }, re = ["onClick"], ce = {
  key: 0,
  class: "nm-table__td nm-table__td--selection"
}, be = {
  key: 0,
  class: "nm-table__empty"
}, me = { class: "nm-table__empty-text" }, ue = {
  key: 1,
  class: "nm-table__loading"
}, _e = { class: "nm-table__loading-text" }, he = /* @__PURE__ */ P({
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
  setup(d, { emit: V }) {
    const l = d, u = V, { t: K } = Y(), v = X(), E = i(() => {
      var e;
      return l.size ?? ((e = v.value.table) == null ? void 0 : e.size) ?? "medium";
    }), L = i(() => {
      var e;
      return l.striped ?? ((e = v.value.table) == null ? void 0 : e.striped) ?? !1;
    }), H = i(() => {
      var e;
      return l.hoverable ?? ((e = v.value.table) == null ? void 0 : e.hoverable) ?? !0;
    }), D = i(() => l.emptyText || K("tableEmpty")), I = i({
      get: () => l.selectedKeys,
      set: (e) => u("update:selectedKeys", e)
    }), {
      resolvedColumns: C,
      displayData: x,
      sortState: _,
      toggleSort: F,
      isSelected: $,
      toggleSelect: M,
      selectAll: R,
      isAllSelected: w,
      isIndeterminate: j
    } = U({
      data: i(() => l.data),
      columns: i(() => l.columns),
      rowKey: i(() => l.rowKey),
      selectable: i(() => l.selectable),
      selectedKeys: I
    });
    function p(e) {
      F(e), u("sort", e, _.value.direction);
    }
    function N(e) {
      const o = String(e[l.rowKey] ?? "");
      M(o), u("select", o, e);
    }
    function q() {
      R(), u("selectAll", w.value);
    }
    function G(e, o) {
      const t = e[o.key];
      return t == null ? "" : String(t);
    }
    function J(e) {
      if (!e.width && !e.minWidth) return;
      const o = {};
      return e.width && (o.width = typeof e.width == "number" ? `${e.width}px` : e.width), e.minWidth && (o.minWidth = typeof e.minWidth == "number" ? `${e.minWidth}px` : e.minWidth), o;
    }
    const O = i(() => [
      "nm-table",
      `nm-table--${E.value}`,
      {
        "nm-table--striped": L.value,
        "nm-table--hoverable": H.value,
        "nm-table--loading": l.loading
      }
    ]), T = i(
      () => l.selectable === !0 || l.selectable === "multiple"
    );
    return (e, o) => (s(), a("div", {
      class: f(O.value)
    }, [
      c("div", te, [
        c("table", le, [
          d.showHeader ? (s(), a("thead", se, [
            c("tr", null, [
              T.value ? (s(), a("th", ae, [
                g(W, {
                  "model-value": n(w),
                  indeterminate: n(j),
                  onChange: q
                }, null, 8, ["model-value", "indeterminate"])
              ])) : b("", !0),
              (s(!0), a(k, null, S(n(C), (t) => (s(), a("th", {
                key: t.key,
                class: f(["nm-table__th", {
                  "nm-table__th--sortable": t.sortable,
                  "nm-table__th--active": n(_).key === t.key
                }]),
                style: A([J(t), { textAlign: t.align }]),
                tabindex: t.sortable ? 0 : void 0,
                "aria-sort": t.sortable ? n(_).key === t.key ? n(_).direction === "ascend" ? "ascending" : "descending" : "none" : void 0,
                onClick: (m) => t.sortable ? p(t.key) : void 0,
                onKeydown: [
                  z((m) => t.sortable ? p(t.key) : void 0, ["enter"]),
                  z(Q((m) => t.sortable ? p(t.key) : void 0, ["prevent"]), ["space"])
                ]
              }, [
                c("span", oe, [
                  h(e.$slots, "header", { column: t }, () => [
                    B(y(t.label), 1)
                  ], !0),
                  t.sortable ? (s(), a("span", ie, [
                    g(Z, {
                      name: "chevron-up",
                      size: "xs"
                    })
                  ])) : b("", !0)
                ])
              ], 46, ne))), 128))
            ])
          ])) : b("", !0),
          c("tbody", de, [
            (s(!0), a(k, null, S(n(x), (t, m) => (s(), a("tr", {
              key: String(t[d.rowKey] ?? m),
              class: f(["nm-table__tr", {
                "nm-table__tr--selected": n($)(String(t[d.rowKey] ?? "")),
                "nm-table__tr--clickable": d.selectable === "single"
              }]),
              onClick: (r) => d.selectable === "single" ? N(t) : void 0
            }, [
              T.value ? (s(), a("td", ce, [
                g(W, {
                  "model-value": n($)(String(t[d.rowKey] ?? "")),
                  onChange: (r) => N(t)
                }, null, 8, ["model-value", "onChange"])
              ])) : b("", !0),
              (s(!0), a(k, null, S(n(C), (r) => (s(), a("td", {
                key: r.key,
                class: "nm-table__td",
                style: A({ textAlign: r.align })
              }, [
                h(e.$slots, `cell-${r.key}`, {
                  row: t,
                  column: r,
                  value: t[r.key],
                  index: m
                }, () => [
                  B(y(G(t, r)), 1)
                ], !0)
              ], 4))), 128))
            ], 10, re))), 128))
          ])
        ]),
        n(x).length === 0 && !d.loading ? (s(), a("div", be, [
          h(e.$slots, "empty", {}, () => [
            c("span", me, y(D.value), 1)
          ], !0)
        ])) : b("", !0),
        d.loading ? (s(), a("div", ue, [
          h(e.$slots, "loading", {}, () => [
            o[0] || (o[0] = c("span", { class: "nm-table__loading-spinner" }, null, -1)),
            c("span", _e, y(n(K)("tableLoading")), 1)
          ], !0)
        ])) : b("", !0)
      ])
    ], 2));
  }
}), Ke = /* @__PURE__ */ ee(he, [["__scopeId", "data-v-f0b44180"]]);
export {
  Ke as N
};

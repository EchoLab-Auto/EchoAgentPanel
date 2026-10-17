import { defineComponent as M, computed as s, openBlock as o, createElementBlock as d, normalizeStyle as te, normalizeClass as g, createElementVNode as f, withModifiers as ne, unref as a, createVNode as z, renderSlot as E, createTextVNode as F, toDisplayString as k, createCommentVNode as x, Fragment as L, renderList as I, createBlock as j, createSlots as q, withCtx as G } from "vue";
import { useLocale as H } from "../composables/useLocale.js";
import { useTree as le } from "../composables/useTree.js";
import { u as ae } from "./createComponent-jnXBYqCm.js";
import { N as R } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as J } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismTree.css';const oe = ["id", "aria-expanded", "aria-selected", "aria-disabled"], se = ["aria-label"], de = {
  key: 1,
  class: "nm-tree-node__toggle-placeholder"
}, re = {
  key: 2,
  class: "nm-tree-node__icon"
}, ce = { class: "nm-tree-node__label" }, ie = { class: "nm-tree-node__children-wrapper" }, ue = /* @__PURE__ */ M({
  __name: "NeumorphismTreeNode",
  props: {
    node: {},
    selectedKeys: {},
    expandedKeys: {},
    searchText: {},
    focusedKey: {},
    level: { default: 0 }
  },
  emits: ["toggle-expand", "select"],
  setup(t, { emit: P }) {
    const e = t, p = P, u = s(() => e.expandedKeys.includes(e.node.key)), b = s(() => e.selectedKeys.includes(e.node.key)), A = s(() => e.focusedKey === e.node.key), y = s(() => {
      var n;
      return !!((n = e.node.children) != null && n.length);
    }), r = s(() => e.searchText.toLowerCase().trim());
    function $(n, c) {
      var m;
      return n.label.toLowerCase().includes(c) ? !0 : ((m = n.children) == null ? void 0 : m.some((i) => $(i, c))) ?? !1;
    }
    const { t: T } = H(), _ = s(() => {
      var n;
      return !r.value || e.node.label.toLowerCase().includes(r.value) ? !0 : ((n = e.node.children) == null ? void 0 : n.some((c) => $(c, r.value))) ?? !1;
    }), C = s(() => {
      if (!e.searchText.trim()) return null;
      const n = e.searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return e.node.label.split(new RegExp(`(${n})`, "gi")).filter(Boolean);
    });
    function w() {
      y.value && p("toggle-expand", e.node.key);
    }
    function K(n) {
      n == null || n.stopPropagation(), w();
    }
    function N() {
      e.node.disabled || p("select", e.node.key);
    }
    return (n, c) => _.value ? (o(), d("li", {
      key: 0,
      id: `nm-tree-node-${t.node.key}`,
      class: g(["nm-tree-node", {
        "nm-tree-node--selected": b.value,
        "nm-tree-node--disabled": t.node.disabled,
        "nm-tree-node--leaf": !y.value,
        "nm-tree-node--expanded": u.value,
        "nm-tree-node--focused": A.value
      }]),
      style: te({
        paddingLeft: `calc(${t.level} * var(--nm-tree-node-indent, var(--nm-spacing-sm)) + var(--nm-spacing-xs))`
      }),
      role: "treeitem",
      tabindex: "-1",
      "aria-expanded": y.value ? u.value : void 0,
      "aria-selected": b.value,
      "aria-disabled": t.node.disabled
    }, [
      f("div", {
        class: g(["nm-tree-node__row", { "nm-tree-node__row--clickable": !t.node.disabled }]),
        onClick: N
      }, [
        y.value ? (o(), d("button", {
          key: 0,
          type: "button",
          class: g(["nm-tree-node__toggle", { "nm-tree-node__toggle--expanded": u.value }]),
          "aria-label": u.value ? a(T)("treeCollapse") : a(T)("treeExpand"),
          onClick: ne(w, ["stop"])
        }, [
          z(R, {
            name: "chevron-right",
            size: "sm",
            class: "nm-tree-node__chevron"
          })
        ], 10, se)) : (o(), d("span", de)),
        t.node.icon || n.$slots.icon ? (o(), d("span", re, [
          E(n.$slots, "icon", { node: t.node }, () => [
            F(k(t.node.icon), 1)
          ], !0)
        ])) : x("", !0),
        E(n.$slots, "node-label", {
          node: t.node,
          selected: b.value,
          expanded: u.value,
          level: t.level,
          select: N,
          toggle: K
        }, () => [
          f("span", ce, [
            C.value ? (o(!0), d(L, { key: 0 }, I(C.value, (m, i) => (o(), d("span", {
              key: i,
              class: g({ "nm-tree-node__label--highlight": m.toLowerCase() === r.value })
            }, k(m), 3))), 128)) : (o(), d(L, { key: 1 }, [
              F(k(t.node.label), 1)
            ], 64))
          ])
        ], !0)
      ], 2),
      y.value ? (o(), d("ul", {
        key: 0,
        class: g(["nm-tree-node__children", { "nm-tree-node__children--collapsed": !u.value }])
      }, [
        f("div", ie, [
          (o(!0), d(L, null, I(t.node.children, (m) => (o(), j(O, {
            key: m.key,
            node: m,
            "selected-keys": t.selectedKeys,
            "expanded-keys": t.expandedKeys,
            "search-text": t.searchText,
            "focused-key": t.focusedKey,
            level: t.level + 1,
            onToggleExpand: c[0] || (c[0] = (i) => p("toggle-expand", i)),
            onSelect: c[1] || (c[1] = (i) => p("select", i))
          }, q({ _: 2 }, [
            n.$slots.icon ? {
              name: "icon",
              fn: G(({ node: i }) => [
                E(n.$slots, "icon", { node: i }, void 0, !0)
              ]),
              key: "0"
            } : void 0
          ]), 1032, ["node", "selected-keys", "expanded-keys", "search-text", "focused-key", "level"]))), 128))
        ])
      ], 2)) : x("", !0)
    ], 14, oe)) : x("", !0);
  }
}), O = /* @__PURE__ */ J(ue, [["__scopeId", "data-v-0a3f4ead"]]), me = ["aria-label", "aria-activedescendant"], he = {
  key: 0,
  class: "nm-tree__search"
}, pe = ["placeholder", "value"], ye = ["aria-label"], ve = {
  key: 1,
  class: "nm-tree__actions"
}, fe = {
  class: "nm-tree__list",
  role: "group"
}, xe = {
  key: 2,
  class: "nm-tree__empty"
}, ge = /* @__PURE__ */ M({
  __name: "NeumorphismTree",
  props: {
    data: {},
    selectedKeys: { default: () => [] },
    expandedKeys: { default: () => [] },
    searchPlaceholder: {},
    showSearch: { type: Boolean, default: void 0 },
    multiple: { type: Boolean, default: void 0 }
  },
  emits: ["update:selectedKeys", "update:expandedKeys", "node-click", "node-select"],
  setup(t, { emit: P }) {
    const e = t, { config: p, resolveProp: u } = ae(), b = s(
      () => {
        var l;
        return u(e.showSearch, (l = p.value.tree) == null ? void 0 : l.showSearch, !1);
      }
    ), A = s(
      () => {
        var l;
        return u(e.multiple, (l = p.value.tree) == null ? void 0 : l.multiple, !1);
      }
    ), y = s(
      () => {
        var l;
        return u(e.searchPlaceholder, (l = p.value.tree) == null ? void 0 : l.searchPlaceholder, "搜索...");
      }
    ), r = P, $ = s({
      get: () => e.selectedKeys,
      set: (l) => r("update:selectedKeys", l)
    }), T = s({
      get: () => e.expandedKeys,
      set: (l) => r("update:expandedKeys", l)
    }), {
      localExpandedKeys: _,
      localSelectedKeys: C,
      searchText: w,
      focusedKey: K,
      toggleExpand: N,
      select: n,
      findNode: c,
      expandAll: m,
      collapseAll: i,
      onSearchInput: V,
      handleKeydown: D
    } = le({
      data: s(() => e.data),
      selectedKeys: $,
      expandedKeys: T,
      multiple: s(() => A.value)
    }), B = w;
    function Q(l) {
      n(l), r("node-select", l);
      const h = c(e.data, l);
      h && r("node-click", h);
    }
    const { t: S } = H();
    function U(l) {
      N(l), r("update:expandedKeys", [..._.value]);
    }
    function W() {
      m(), r("update:expandedKeys", [..._.value]);
    }
    function X() {
      i(), r("update:expandedKeys", []);
    }
    const Y = s(
      () => K.value ? `nm-tree-node-${K.value}` : void 0
    ), Z = s(() => ["nm-tree"]);
    return (l, h) => (o(), d("div", {
      class: g(Z.value),
      role: "tree",
      tabindex: "0",
      "aria-label": a(S)("treeLabel"),
      "aria-activedescendant": Y.value,
      onKeydown: h[2] || (h[2] = //@ts-ignore
      (...v) => a(D) && a(D)(...v))
    }, [
      b.value ? (o(), d("div", he, [
        z(R, {
          name: "search",
          size: "md",
          class: "nm-tree__search-icon"
        }),
        f("input", {
          type: "text",
          class: "nm-tree__search-input",
          placeholder: y.value,
          value: a(B),
          onInput: h[0] || (h[0] = (v) => a(V)(v.target.value))
        }, null, 40, pe),
        a(B) ? (o(), d("button", {
          key: 0,
          type: "button",
          class: "nm-tree__search-clear",
          "aria-label": a(S)("treeClearSearch"),
          onClick: h[1] || (h[1] = (v) => a(V)(""))
        }, [
          z(R, {
            name: "close",
            size: "sm"
          })
        ], 8, ye)) : x("", !0)
      ])) : x("", !0),
      t.data.length > 0 ? (o(), d("div", ve, [
        f("button", {
          type: "button",
          class: "nm-tree__action-btn",
          onClick: W
        }, k(a(S)("treeExpandAll")), 1),
        f("button", {
          type: "button",
          class: "nm-tree__action-btn",
          onClick: X
        }, k(a(S)("treeCollapseAll")), 1)
      ])) : x("", !0),
      f("ul", fe, [
        (o(!0), d(L, null, I(t.data, (v) => (o(), j(O, {
          key: v.key,
          node: v,
          "selected-keys": a(C),
          "expanded-keys": a(_),
          "search-text": a(B),
          "focused-key": a(K),
          level: 0,
          onToggleExpand: U,
          onSelect: Q
        }, q({ _: 2 }, [
          l.$slots.icon ? {
            name: "icon",
            fn: G(({ node: ee }) => [
              E(l.$slots, "icon", { node: ee }, void 0, !0)
            ]),
            key: "0"
          } : void 0
        ]), 1032, ["node", "selected-keys", "expanded-keys", "search-text", "focused-key"]))), 128))
      ]),
      t.data.length === 0 ? (o(), d("div", xe, k(a(S)("treeEmpty")), 1)) : x("", !0)
    ], 42, me));
  }
}), Te = /* @__PURE__ */ J(ge, [["__scopeId", "data-v-d7a2318b"]]);
export {
  Te as N,
  O as a
};

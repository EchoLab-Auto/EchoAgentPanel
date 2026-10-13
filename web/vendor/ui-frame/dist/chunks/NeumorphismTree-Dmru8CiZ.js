import { defineComponent as z, computed as a, openBlock as s, createElementBlock as d, normalizeStyle as Z, normalizeClass as x, createElementVNode as c, withModifiers as ee, unref as o, renderSlot as N, createTextVNode as V, toDisplayString as g, createCommentVNode as k, Fragment as L, renderList as M, createBlock as D, createSlots as F, withCtx as j } from "vue";
import { useLocale as q } from "../composables/useLocale.js";
import { useTree as te } from "../composables/useTree.js";
import { u as ne } from "./createComponent-jnXBYqCm.js";
import { _ as G } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismTree.css';const le = ["id", "aria-expanded", "aria-selected", "aria-disabled"], oe = ["aria-label"], se = {
  key: 1,
  class: "nm-tree-node__toggle-placeholder"
}, ae = {
  key: 2,
  class: "nm-tree-node__icon"
}, de = { class: "nm-tree-node__label" }, re = { class: "nm-tree-node__children-wrapper" }, ce = /* @__PURE__ */ z({
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
  setup(t, { emit: B }) {
    const e = t, v = B, p = a(() => e.expandedKeys.includes(e.node.key)), w = a(() => e.selectedKeys.includes(e.node.key)), P = a(() => e.focusedKey === e.node.key), y = a(() => {
      var n;
      return !!((n = e.node.children) != null && n.length);
    }), u = a(() => e.searchText.toLowerCase().trim());
    function C(n, r) {
      var h;
      return n.label.toLowerCase().includes(r) ? !0 : ((h = n.children) == null ? void 0 : h.some((m) => C(m, r))) ?? !1;
    }
    const { t: S } = q(), b = a(() => {
      var n;
      return !u.value || e.node.label.toLowerCase().includes(u.value) ? !0 : ((n = e.node.children) == null ? void 0 : n.some((r) => C(r, u.value))) ?? !1;
    }), $ = a(() => {
      if (!e.searchText.trim()) return null;
      const n = e.searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return e.node.label.split(new RegExp(`(${n})`, "gi")).filter(Boolean);
    });
    function T() {
      y.value && v("toggle-expand", e.node.key);
    }
    function K(n) {
      n == null || n.stopPropagation(), T();
    }
    function E() {
      e.node.disabled || v("select", e.node.key);
    }
    return (n, r) => b.value ? (s(), d("li", {
      key: 0,
      id: `nm-tree-node-${t.node.key}`,
      class: x(["nm-tree-node", {
        "nm-tree-node--selected": w.value,
        "nm-tree-node--disabled": t.node.disabled,
        "nm-tree-node--leaf": !y.value,
        "nm-tree-node--expanded": p.value,
        "nm-tree-node--focused": P.value
      }]),
      style: Z({
        paddingLeft: `calc(${t.level} * var(--nm-tree-node-indent, var(--nm-spacing-sm)) + var(--nm-spacing-xs))`
      }),
      role: "treeitem",
      tabindex: "-1",
      "aria-expanded": y.value ? p.value : void 0,
      "aria-selected": w.value,
      "aria-disabled": t.node.disabled
    }, [
      c("div", {
        class: x(["nm-tree-node__row", { "nm-tree-node__row--clickable": !t.node.disabled }]),
        onClick: E
      }, [
        y.value ? (s(), d("button", {
          key: 0,
          type: "button",
          class: x(["nm-tree-node__toggle", { "nm-tree-node__toggle--expanded": p.value }]),
          "aria-label": p.value ? o(S)("treeCollapse") : o(S)("treeExpand"),
          onClick: ee(T, ["stop"])
        }, [...r[2] || (r[2] = [
          c("svg", {
            class: "nm-tree-node__chevron",
            viewBox: "0 0 24 24",
            fill: "none",
            xmlns: "http://www.w3.org/2000/svg"
          }, [
            c("path", {
              d: "M9 6l6 6-6 6",
              stroke: "currentColor",
              "stroke-width": "2",
              "stroke-linecap": "round",
              "stroke-linejoin": "round"
            })
          ], -1)
        ])], 10, oe)) : (s(), d("span", se)),
        t.node.icon || n.$slots.icon ? (s(), d("span", ae, [
          N(n.$slots, "icon", { node: t.node }, () => [
            V(g(t.node.icon), 1)
          ], !0)
        ])) : k("", !0),
        N(n.$slots, "node-label", {
          node: t.node,
          selected: w.value,
          expanded: p.value,
          level: t.level,
          select: E,
          toggle: K
        }, () => [
          c("span", de, [
            $.value ? (s(!0), d(L, { key: 0 }, M($.value, (h, m) => (s(), d("span", {
              key: m,
              class: x({ "nm-tree-node__label--highlight": h.toLowerCase() === u.value })
            }, g(h), 3))), 128)) : (s(), d(L, { key: 1 }, [
              V(g(t.node.label), 1)
            ], 64))
          ])
        ], !0)
      ], 2),
      y.value ? (s(), d("ul", {
        key: 0,
        class: x(["nm-tree-node__children", { "nm-tree-node__children--collapsed": !p.value }])
      }, [
        c("div", re, [
          (s(!0), d(L, null, M(t.node.children, (h) => (s(), D(H, {
            key: h.key,
            node: h,
            "selected-keys": t.selectedKeys,
            "expanded-keys": t.expandedKeys,
            "search-text": t.searchText,
            "focused-key": t.focusedKey,
            level: t.level + 1,
            onToggleExpand: r[0] || (r[0] = (m) => v("toggle-expand", m)),
            onSelect: r[1] || (r[1] = (m) => v("select", m))
          }, F({ _: 2 }, [
            n.$slots.icon ? {
              name: "icon",
              fn: j(({ node: m }) => [
                N(n.$slots, "icon", { node: m }, void 0, !0)
              ]),
              key: "0"
            } : void 0
          ]), 1032, ["node", "selected-keys", "expanded-keys", "search-text", "focused-key", "level"]))), 128))
        ])
      ], 2)) : k("", !0)
    ], 14, le)) : k("", !0);
  }
}), H = /* @__PURE__ */ G(ce, [["__scopeId", "data-v-f051a512"]]), ie = ["aria-label", "aria-activedescendant"], ue = {
  key: 0,
  class: "nm-tree__search"
}, me = ["placeholder", "value"], pe = ["aria-label"], he = {
  key: 1,
  class: "nm-tree__actions"
}, ve = {
  class: "nm-tree__list",
  role: "group"
}, ye = {
  key: 2,
  class: "nm-tree__empty"
}, fe = /* @__PURE__ */ z({
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
  setup(t, { emit: B }) {
    const e = t, { config: v, resolveProp: p } = ne(), w = a(
      () => {
        var l;
        return p(e.showSearch, (l = v.value.tree) == null ? void 0 : l.showSearch, !1);
      }
    ), P = a(
      () => {
        var l;
        return p(e.multiple, (l = v.value.tree) == null ? void 0 : l.multiple, !1);
      }
    ), y = a(
      () => {
        var l;
        return p(e.searchPlaceholder, (l = v.value.tree) == null ? void 0 : l.searchPlaceholder, "搜索...");
      }
    ), u = B, C = a({
      get: () => e.selectedKeys,
      set: (l) => u("update:selectedKeys", l)
    }), S = a({
      get: () => e.expandedKeys,
      set: (l) => u("update:expandedKeys", l)
    }), {
      localExpandedKeys: b,
      localSelectedKeys: $,
      searchText: T,
      focusedKey: K,
      toggleExpand: E,
      select: n,
      findNode: r,
      expandAll: h,
      collapseAll: m,
      onSearchInput: I,
      handleKeydown: R
    } = te({
      data: a(() => e.data),
      selectedKeys: C,
      expandedKeys: S,
      multiple: a(() => P.value)
    }), A = T;
    function J(l) {
      n(l), u("node-select", l);
      const i = r(e.data, l);
      i && u("node-click", i);
    }
    const { t: _ } = q();
    function O(l) {
      E(l), u("update:expandedKeys", [...b.value]);
    }
    function Q() {
      h(), u("update:expandedKeys", [...b.value]);
    }
    function U() {
      m(), u("update:expandedKeys", []);
    }
    const W = a(
      () => K.value ? `nm-tree-node-${K.value}` : void 0
    ), X = a(() => ["nm-tree"]);
    return (l, i) => (s(), d("div", {
      class: x(X.value),
      role: "tree",
      tabindex: "0",
      "aria-label": o(_)("treeLabel"),
      "aria-activedescendant": W.value,
      onKeydown: i[2] || (i[2] = //@ts-ignore
      (...f) => o(R) && o(R)(...f))
    }, [
      w.value ? (s(), d("div", ue, [
        i[4] || (i[4] = c("svg", {
          class: "nm-tree__search-icon",
          viewBox: "0 0 24 24",
          fill: "none",
          xmlns: "http://www.w3.org/2000/svg"
        }, [
          c("circle", {
            cx: "11",
            cy: "11",
            r: "8",
            stroke: "currentColor",
            "stroke-width": "2"
          }),
          c("path", {
            d: "M21 21l-4.35-4.35",
            stroke: "currentColor",
            "stroke-width": "2",
            "stroke-linecap": "round"
          })
        ], -1)),
        c("input", {
          type: "text",
          class: "nm-tree__search-input",
          placeholder: y.value,
          value: o(A),
          onInput: i[0] || (i[0] = (f) => o(I)(f.target.value))
        }, null, 40, me),
        o(A) ? (s(), d("button", {
          key: 0,
          type: "button",
          class: "nm-tree__search-clear",
          "aria-label": o(_)("treeClearSearch"),
          onClick: i[1] || (i[1] = (f) => o(I)(""))
        }, [...i[3] || (i[3] = [
          c("svg", {
            viewBox: "0 0 24 24",
            fill: "none",
            xmlns: "http://www.w3.org/2000/svg"
          }, [
            c("path", {
              d: "M18 6L6 18M6 6l12 12",
              stroke: "currentColor",
              "stroke-width": "2",
              "stroke-linecap": "round"
            })
          ], -1)
        ])], 8, pe)) : k("", !0)
      ])) : k("", !0),
      t.data.length > 0 ? (s(), d("div", he, [
        c("button", {
          type: "button",
          class: "nm-tree__action-btn",
          onClick: Q
        }, g(o(_)("treeExpandAll")), 1),
        c("button", {
          type: "button",
          class: "nm-tree__action-btn",
          onClick: U
        }, g(o(_)("treeCollapseAll")), 1)
      ])) : k("", !0),
      c("ul", ve, [
        (s(!0), d(L, null, M(t.data, (f) => (s(), D(H, {
          key: f.key,
          node: f,
          "selected-keys": o($),
          "expanded-keys": o(b),
          "search-text": o(A),
          "focused-key": o(K),
          level: 0,
          onToggleExpand: O,
          onSelect: J
        }, F({ _: 2 }, [
          l.$slots.icon ? {
            name: "icon",
            fn: j(({ node: Y }) => [
              N(l.$slots, "icon", { node: Y }, void 0, !0)
            ]),
            key: "0"
          } : void 0
        ]), 1032, ["node", "selected-keys", "expanded-keys", "search-text", "focused-key"]))), 128))
      ]),
      t.data.length === 0 ? (s(), d("div", ye, g(o(_)("treeEmpty")), 1)) : k("", !0)
    ], 42, ie));
  }
}), Ke = /* @__PURE__ */ G(fe, [["__scopeId", "data-v-9f8ff00d"]]);
export {
  Ke as N,
  H as a
};

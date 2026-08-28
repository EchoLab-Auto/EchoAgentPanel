import { defineComponent as R, computed as s, openBlock as a, createElementBlock as d, normalizeStyle as Q, normalizeClass as k, createElementVNode as c, withModifiers as U, unref as o, toDisplayString as g, createCommentVNode as f, renderSlot as W, Fragment as N, renderList as A, createTextVNode as X, createBlock as V } from "vue";
import { useLocale as z } from "../composables/useLocale.js";
import { useTree as Y } from "../composables/useTree.js";
import { u as Z } from "./createComponent-jnXBYqCm.js";
import { _ as D } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismTree.css';const ee = ["id", "aria-expanded", "aria-selected", "aria-disabled"], te = ["aria-label"], le = {
  key: 1,
  class: "nm-tree-node__toggle-placeholder"
}, ne = {
  key: 2,
  class: "nm-tree-node__icon"
}, oe = { class: "nm-tree-node__label" }, ae = { class: "nm-tree-node__children-wrapper" }, se = /* @__PURE__ */ R({
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
  setup(t, { emit: L }) {
    const e = t, y = L, m = s(() => e.expandedKeys.includes(e.node.key)), b = s(() => e.selectedKeys.includes(e.node.key)), B = s(() => e.focusedKey === e.node.key), v = s(() => {
      var n;
      return !!((n = e.node.children) != null && n.length);
    }), u = s(() => e.searchText.toLowerCase().trim());
    function C(n, r) {
      var p;
      return n.label.toLowerCase().includes(r) ? !0 : ((p = n.children) == null ? void 0 : p.some((h) => C(h, r))) ?? !1;
    }
    const { t: S } = z(), w = s(() => {
      var n;
      return !u.value || e.node.label.toLowerCase().includes(u.value) ? !0 : ((n = e.node.children) == null ? void 0 : n.some((r) => C(r, u.value))) ?? !1;
    }), T = s(() => {
      if (!e.searchText.trim()) return null;
      const n = e.searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return e.node.label.split(new RegExp(`(${n})`, "gi")).filter(Boolean);
    });
    function $() {
      v.value && y("toggle-expand", e.node.key);
    }
    function _(n) {
      n == null || n.stopPropagation(), $();
    }
    function E() {
      e.node.disabled || y("select", e.node.key);
    }
    return (n, r) => w.value ? (a(), d("li", {
      key: 0,
      id: `nm-tree-node-${t.node.key}`,
      class: k(["nm-tree-node", {
        "nm-tree-node--selected": b.value,
        "nm-tree-node--disabled": t.node.disabled,
        "nm-tree-node--leaf": !v.value,
        "nm-tree-node--expanded": m.value,
        "nm-tree-node--focused": B.value
      }]),
      style: Q({ paddingLeft: `calc(${t.level} * var(--nm-tree-node-indent, 8px) + 4px)` }),
      role: "treeitem",
      tabindex: "-1",
      "aria-expanded": v.value ? m.value : void 0,
      "aria-selected": b.value,
      "aria-disabled": t.node.disabled
    }, [
      c("div", {
        class: k(["nm-tree-node__row", { "nm-tree-node__row--clickable": !t.node.disabled }]),
        onClick: E
      }, [
        v.value ? (a(), d("button", {
          key: 0,
          type: "button",
          class: k(["nm-tree-node__toggle", { "nm-tree-node__toggle--expanded": m.value }]),
          "aria-label": m.value ? o(S)("treeCollapse") : o(S)("treeExpand"),
          onClick: U($, ["stop"])
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
        ])], 10, te)) : (a(), d("span", le)),
        t.node.icon ? (a(), d("span", ne, g(t.node.icon), 1)) : f("", !0),
        W(n.$slots, "node-label", {
          node: t.node,
          selected: b.value,
          expanded: m.value,
          level: t.level,
          select: E,
          toggle: _
        }, () => [
          c("span", oe, [
            T.value ? (a(!0), d(N, { key: 0 }, A(T.value, (p, h) => (a(), d("span", {
              key: h,
              class: k({ "nm-tree-node__label--highlight": p.toLowerCase() === u.value })
            }, g(p), 3))), 128)) : (a(), d(N, { key: 1 }, [
              X(g(t.node.label), 1)
            ], 64))
          ])
        ], !0)
      ], 2),
      v.value ? (a(), d("ul", {
        key: 0,
        class: k(["nm-tree-node__children", { "nm-tree-node__children--collapsed": !m.value }])
      }, [
        c("div", ae, [
          (a(!0), d(N, null, A(t.node.children, (p) => (a(), V(F, {
            key: p.key,
            node: p,
            "selected-keys": t.selectedKeys,
            "expanded-keys": t.expandedKeys,
            "search-text": t.searchText,
            "focused-key": t.focusedKey,
            level: t.level + 1,
            onToggleExpand: r[0] || (r[0] = (h) => y("toggle-expand", h)),
            onSelect: r[1] || (r[1] = (h) => y("select", h))
          }, null, 8, ["node", "selected-keys", "expanded-keys", "search-text", "focused-key", "level"]))), 128))
        ])
      ], 2)) : f("", !0)
    ], 14, ee)) : f("", !0);
  }
}), F = /* @__PURE__ */ D(se, [["__scopeId", "data-v-94118851"]]), de = ["aria-label", "aria-activedescendant"], re = {
  key: 0,
  class: "nm-tree__search"
}, ce = ["placeholder", "value"], ie = ["aria-label"], ue = {
  key: 1,
  class: "nm-tree__actions"
}, me = {
  class: "nm-tree__list",
  role: "group"
}, pe = {
  key: 2,
  class: "nm-tree__empty"
}, he = /* @__PURE__ */ R({
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
  setup(t, { emit: L }) {
    const e = t, { config: y, resolveProp: m } = Z(), b = s(
      () => {
        var l;
        return m(e.showSearch, (l = y.value.tree) == null ? void 0 : l.showSearch, !1);
      }
    ), B = s(
      () => {
        var l;
        return m(e.multiple, (l = y.value.tree) == null ? void 0 : l.multiple, !1);
      }
    ), v = s(
      () => {
        var l;
        return m(e.searchPlaceholder, (l = y.value.tree) == null ? void 0 : l.searchPlaceholder, "搜索...");
      }
    ), u = L, C = s({
      get: () => e.selectedKeys,
      set: (l) => u("update:selectedKeys", l)
    }), S = s({
      get: () => e.expandedKeys,
      set: (l) => u("update:expandedKeys", l)
    }), {
      localExpandedKeys: w,
      localSelectedKeys: T,
      searchText: $,
      focusedKey: _,
      toggleExpand: E,
      select: n,
      findNode: r,
      expandAll: p,
      collapseAll: h,
      onSearchInput: M,
      handleKeydown: I
    } = Y({
      data: s(() => e.data),
      selectedKeys: C,
      expandedKeys: S,
      multiple: s(() => B.value)
    }), P = $;
    function j(l) {
      n(l), u("node-select", l);
      const i = r(e.data, l);
      i && u("node-click", i);
    }
    const { t: K } = z();
    function q(l) {
      E(l), u("update:expandedKeys", [...w.value]);
    }
    function G() {
      p(), u("update:expandedKeys", [...w.value]);
    }
    function H() {
      h(), u("update:expandedKeys", []);
    }
    const J = s(
      () => _.value ? `nm-tree-node-${_.value}` : void 0
    ), O = s(() => ["nm-tree"]);
    return (l, i) => (a(), d("div", {
      class: k(O.value),
      role: "tree",
      tabindex: "0",
      "aria-label": o(K)("treeLabel"),
      "aria-activedescendant": J.value,
      onKeydown: i[2] || (i[2] = //@ts-ignore
      (...x) => o(I) && o(I)(...x))
    }, [
      b.value ? (a(), d("div", re, [
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
          placeholder: v.value,
          value: o(P),
          onInput: i[0] || (i[0] = (x) => o(M)(x.target.value))
        }, null, 40, ce),
        o(P) ? (a(), d("button", {
          key: 0,
          type: "button",
          class: "nm-tree__search-clear",
          "aria-label": o(K)("treeClearSearch"),
          onClick: i[1] || (i[1] = (x) => o(M)(""))
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
        ])], 8, ie)) : f("", !0)
      ])) : f("", !0),
      t.data.length > 0 ? (a(), d("div", ue, [
        c("button", {
          type: "button",
          class: "nm-tree__action-btn",
          onClick: G
        }, g(o(K)("treeExpandAll")), 1),
        c("button", {
          type: "button",
          class: "nm-tree__action-btn",
          onClick: H
        }, g(o(K)("treeCollapseAll")), 1)
      ])) : f("", !0),
      c("ul", me, [
        (a(!0), d(N, null, A(t.data, (x) => (a(), V(F, {
          key: x.key,
          node: x,
          "selected-keys": o(T),
          "expanded-keys": o(w),
          "search-text": o(P),
          "focused-key": o(_),
          level: 0,
          onToggleExpand: q,
          onSelect: j
        }, null, 8, ["node", "selected-keys", "expanded-keys", "search-text", "focused-key"]))), 128))
      ]),
      t.data.length === 0 ? (a(), d("div", pe, g(o(K)("treeEmpty")), 1)) : f("", !0)
    ], 42, de));
  }
}), ge = /* @__PURE__ */ D(he, [["__scopeId", "data-v-2df4dce4"]]);
export {
  ge as N,
  F as a
};

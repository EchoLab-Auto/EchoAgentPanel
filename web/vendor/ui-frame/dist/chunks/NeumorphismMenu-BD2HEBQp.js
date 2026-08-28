import { defineComponent as Z, computed as c, ref as V, openBlock as o, createElementBlock as s, unref as l, normalizeClass as v, createElementVNode as d, Fragment as h, renderList as z, createCommentVNode as i, withModifiers as N, toDisplayString as k, createBlock as ee } from "vue";
import { useMenu as ne } from "../composables/useMenu.js";
import { u as te } from "./createComponent-jnXBYqCm.js";
import { useTheme as oe } from "../composables/useTheme.js";
import { N as se } from "./NeumorphismTooltip-MKJQObU9.js";
import { _ as ae } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismMenu.css';const le = ["role"], ie = {
  class: "nm-menu__list",
  role: "group"
}, ue = {
  key: 0,
  class: "nm-menu__divider",
  role: "separator",
  "aria-hidden": !0
}, de = ["aria-disabled", "aria-expanded", "aria-haspopup", "tabindex", "onClick", "onMouseenter", "onMouseleave", "onKeydown"], me = { class: "nm-menu__item-content" }, re = {
  key: 0,
  class: "nm-menu__item-icon",
  "aria-hidden": "true"
}, ce = {
  key: 1,
  class: "nm-menu__item-label"
}, _e = {
  width: "12",
  height: "12",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2",
  "stroke-linecap": "round",
  "stroke-linejoin": "round"
}, pe = {
  key: 0,
  d: "M9 18l6-6-6-6"
}, ve = {
  key: 1,
  d: "M6 9l6 6 6-6"
}, he = ["aria-label"], ke = {
  key: 0,
  class: "nm-menu__divider",
  role: "separator"
}, be = ["aria-disabled", "aria-expanded", "aria-haspopup", "tabindex", "onClick", "onMouseenter", "onMouseleave", "onKeydown"], ye = { class: "nm-menu__item-content" }, fe = {
  key: 0,
  class: "nm-menu__item-icon",
  "aria-hidden": "true"
}, xe = { class: "nm-menu__item-label" }, Me = {
  width: "12",
  height: "12",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2",
  "stroke-linecap": "round",
  "stroke-linejoin": "round"
}, we = {
  key: 0,
  d: "M9 18l6-6-6-6"
}, Ce = {
  key: 1,
  d: "M6 9l6 6 6-6"
}, Ke = ["aria-label"], $e = {
  key: 0,
  class: "nm-menu__divider",
  role: "separator"
}, ge = ["aria-disabled", "tabindex", "onClick", "onMouseenter", "onMouseleave", "onKeydown"], ze = { class: "nm-menu__item-content" }, Ne = {
  key: 0,
  class: "nm-menu__item-icon",
  "aria-hidden": "true"
}, Ee = { class: "nm-menu__item-label" }, Ie = {
  key: 0,
  class: "nm-menu__empty"
}, Be = /* @__PURE__ */ Z({
  __name: "NeumorphismMenu",
  props: {
    items: { default: () => [] },
    mode: {},
    defaultActive: { default: void 0 },
    defaultExpanded: { default: () => [] },
    collapsed: { type: Boolean, default: !1 },
    selectable: { type: Boolean, default: void 0 },
    theme: { default: void 0 },
    size: {}
  },
  emits: ["select", "item-click"],
  setup(m, { emit: F }) {
    const u = m, E = F, { config: f, resolveProp: x } = te(), { isDark: P } = oe(), q = c(() => u.theme ? u.theme : P.value ? "dark" : "light"), _ = c(() => {
      var n;
      return x(u.mode, (n = f.value.menu) == null ? void 0 : n.mode, "vertical");
    }), G = c(() => {
      var n;
      return x(u.size, (n = f.value.menu) == null ? void 0 : n.size, "medium");
    }), H = c(
      () => {
        var n;
        return x(u.selectable, (n = f.value.menu) == null ? void 0 : n.selectable, !0);
      }
    ), J = V(u.defaultActive ?? null), O = V([...u.defaultExpanded]), {
      handleKeydown: M,
      handleItemClick: w,
      handleItemEnter: Q,
      isExpanded: r,
      isActive: C,
      collapse: U
    } = ne({
      items: c(() => u.items),
      mode: _,
      activeKey: J,
      expandedKeys: O,
      onSelect: (n) => {
        E("select", n), E("item-click", n);
      }
    });
    let b = null;
    function K(n) {
      b && (clearTimeout(b), b = null), Q(n);
    }
    function $(n) {
      var p;
      _.value === "horizontal" && ((p = n.children) != null && p.length) && (b = setTimeout(() => {
        U(n.key);
      }, 200));
    }
    const W = c(() => [
      "nm-menu",
      `nm-menu--${_.value}`,
      `nm-menu--${G.value}`,
      `nm-menu--theme-${q.value}`,
      {
        "nm-menu--collapsed": u.collapsed,
        "nm-menu--selectable": H.value
      }
    ]), X = c(() => _.value === "horizontal" ? "menubar" : "menu");
    function Y(n) {
      return [
        "nm-menu__item",
        {
          "nm-menu__item--active": C(n.key),
          "nm-menu__item--disabled": n.disabled,
          "nm-menu__item--divided": n.divided,
          "nm-menu__item--has-children": n.children && n.children.length > 0,
          "nm-menu__item--expanded": r(n.key)
        }
      ];
    }
    function g(n, p) {
      p.disabled || M(n);
    }
    const I = c(() => [
      "nm-menu__expand-icon",
      {
        "nm-menu__expand-icon--expanded": !1,
        "nm-menu__expand-icon--horizontal": _.value === "horizontal"
      }
    ]);
    return (n, p) => (o(), s("nav", {
      class: v(W.value),
      role: X.value,
      "aria-label": "Menu",
      onKeydown: p[0] || (p[0] = //@ts-ignore
      (...t) => l(M) && l(M)(...t))
    }, [
      d("ul", ie, [
        (o(!0), s(h, null, z(m.items, (t) => {
          var B, S, T, A;
          return o(), s(h, {
            key: t.key
          }, [
            t.divided ? (o(), s("li", ue)) : i("", !0),
            d("li", {
              class: v(Y(t)),
              role: "menuitem",
              "aria-disabled": t.disabled ?? !1,
              "aria-expanded": (B = t.children) != null && B.length ? l(r)(t.key) : void 0,
              "aria-haspopup": (S = t.children) != null && S.length ? "menu" : void 0,
              tabindex: t.disabled ? -1 : 0,
              onClick: N((e) => l(w)(t), ["stop"]),
              onMouseenter: (e) => K(t),
              onMouseleave: (e) => $(t),
              onKeydown: (e) => g(e, t)
            }, [
              d("div", me, [
                t.icon ? (o(), s("span", re, k(t.icon), 1)) : i("", !0),
                !m.collapsed || !t.icon ? (o(), s("span", ce, k(t.label), 1)) : i("", !0),
                (T = t.children) != null && T.length && !m.collapsed ? (o(), s("span", {
                  key: 2,
                  class: v([
                    ...I.value,
                    { "nm-menu__expand-icon--expanded": l(r)(t.key) }
                  ]),
                  "aria-hidden": "true"
                }, [
                  (o(), s("svg", _e, [
                    _.value === "vertical" ? (o(), s("path", pe)) : (o(), s("path", ve))
                  ]))
                ], 2)) : i("", !0)
              ]),
              (A = t.children) != null && A.length && l(r)(t.key) && !m.collapsed ? (o(), s("ul", {
                key: 0,
                class: "nm-menu__submenu",
                role: "menu",
                "aria-label": t.label
              }, [
                (o(!0), s(h, null, z(t.children, (e) => {
                  var L, R, j, D;
                  return o(), s(h, {
                    key: e.key
                  }, [
                    e.divided ? (o(), s("li", ke)) : i("", !0),
                    d("li", {
                      class: v([
                        "nm-menu__item",
                        "nm-menu__item--sub",
                        {
                          "nm-menu__item--active": l(C)(e.key),
                          "nm-menu__item--disabled": e.disabled,
                          "nm-menu__item--has-children": e.children && e.children.length > 0,
                          "nm-menu__item--expanded": l(r)(e.key)
                        }
                      ]),
                      role: "menuitem",
                      "aria-disabled": e.disabled ?? !1,
                      "aria-expanded": (L = e.children) != null && L.length ? l(r)(e.key) : void 0,
                      "aria-haspopup": (R = e.children) != null && R.length ? "menu" : void 0,
                      tabindex: e.disabled ? -1 : 0,
                      onClick: N((a) => l(w)(e), ["stop"]),
                      onMouseenter: (a) => K(e),
                      onMouseleave: (a) => $(e),
                      onKeydown: (a) => g(a, e)
                    }, [
                      d("div", ye, [
                        e.icon ? (o(), s("span", fe, k(e.icon), 1)) : i("", !0),
                        d("span", xe, k(e.label), 1),
                        (j = e.children) != null && j.length ? (o(), s("span", {
                          key: 1,
                          class: v([
                            ...I.value,
                            { "nm-menu__expand-icon--expanded": l(r)(e.key) }
                          ]),
                          "aria-hidden": "true"
                        }, [
                          (o(), s("svg", Me, [
                            _.value === "vertical" ? (o(), s("path", we)) : (o(), s("path", Ce))
                          ]))
                        ], 2)) : i("", !0)
                      ]),
                      (D = e.children) != null && D.length && l(r)(e.key) ? (o(), s("ul", {
                        key: 0,
                        class: "nm-menu__submenu",
                        role: "menu",
                        "aria-label": e.label
                      }, [
                        (o(!0), s(h, null, z(e.children, (a) => (o(), s(h, {
                          key: a.key
                        }, [
                          a.divided ? (o(), s("li", $e)) : i("", !0),
                          d("li", {
                            class: v([
                              "nm-menu__item",
                              "nm-menu__item--sub",
                              "nm-menu__item--sub-deep",
                              {
                                "nm-menu__item--active": l(C)(a.key),
                                "nm-menu__item--disabled": a.disabled
                              }
                            ]),
                            role: "menuitem",
                            "aria-disabled": a.disabled ?? !1,
                            tabindex: a.disabled ? -1 : 0,
                            onClick: N((y) => l(w)(a), ["stop"]),
                            onMouseenter: (y) => K(a),
                            onMouseleave: (y) => $(a),
                            onKeydown: (y) => g(y, a)
                          }, [
                            d("div", ze, [
                              a.icon ? (o(), s("span", Ne, k(a.icon), 1)) : i("", !0),
                              d("span", Ee, k(a.label), 1)
                            ])
                          ], 42, ge)
                        ], 64))), 128))
                      ], 8, Ke)) : i("", !0)
                    ], 42, be)
                  ], 64);
                }), 128))
              ], 8, he)) : i("", !0),
              m.collapsed && t.icon ? (o(), ee(se, {
                key: 1,
                content: t.label,
                position: "right",
                delay: 300,
                disabled: !m.collapsed
              }, null, 8, ["content", "disabled"])) : i("", !0)
            ], 42, de)
          ], 64);
        }), 128)),
        m.items.length === 0 ? (o(), s("li", Ie, "No menu items")) : i("", !0)
      ])
    ], 42, le));
  }
}), De = /* @__PURE__ */ ae(Be, [["__scopeId", "data-v-3ccbf985"]]);
export {
  De as N
};

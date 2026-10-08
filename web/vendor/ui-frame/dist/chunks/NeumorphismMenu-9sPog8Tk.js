import { defineComponent as ue, computed as c, ref as R, watch as de, onBeforeUnmount as re, openBlock as t, createElementBlock as s, unref as i, normalizeClass as f, createElementVNode as _, Fragment as y, renderList as T, createCommentVNode as d, withModifiers as A, toDisplayString as k, createBlock as J, Teleport as me, normalizeStyle as ce } from "vue";
import { useMenu as _e } from "../composables/useMenu.js";
import { u as pe } from "./createComponent-jnXBYqCm.js";
import { useTheme as ve } from "../composables/useTheme.js";
import { N as fe } from "./NeumorphismTooltip-tL7Y4HYZ.js";
import { _ as he } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismMenu.css';const be = ["role"], ye = {
  class: "nm-menu__list",
  role: "group"
}, ke = {
  key: 0,
  class: "nm-menu__divider",
  role: "separator",
  "aria-hidden": !0
}, xe = ["aria-disabled", "aria-expanded", "aria-haspopup", "tabindex", "onClick", "onMouseenter", "onMouseleave", "onKeydown"], Me = { class: "nm-menu__item-content" }, we = {
  key: 0,
  class: "nm-menu__item-icon",
  "aria-hidden": "true"
}, ze = {
  key: 1,
  class: "nm-menu__item-label"
}, ge = {
  width: "12",
  height: "12",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2",
  "stroke-linecap": "round",
  "stroke-linejoin": "round"
}, $e = {
  key: 0,
  d: "M9 18l6-6-6-6"
}, Ce = {
  key: 1,
  d: "M6 9l6 6 6-6"
}, Ke = ["aria-label", "onMouseenter", "onMouseleave"], Ie = {
  key: 0,
  class: "nm-menu__divider",
  role: "separator"
}, Se = ["aria-disabled", "aria-expanded", "aria-haspopup", "tabindex", "onClick", "onMouseenter", "onMouseleave", "onKeydown"], Be = { class: "nm-menu__item-content" }, Ee = {
  key: 0,
  class: "nm-menu__item-icon",
  "aria-hidden": "true"
}, Ne = { class: "nm-menu__item-label" }, Re = {
  width: "12",
  height: "12",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2",
  "stroke-linecap": "round",
  "stroke-linejoin": "round"
}, Te = {
  key: 0,
  d: "M9 18l6-6-6-6"
}, Ae = {
  key: 1,
  d: "M6 9l6 6 6-6"
}, Le = ["aria-label"], je = {
  key: 0,
  class: "nm-menu__divider",
  role: "separator"
}, Fe = ["aria-disabled", "tabindex", "onClick", "onMouseenter", "onMouseleave", "onKeydown"], De = { class: "nm-menu__item-content" }, He = {
  key: 0,
  class: "nm-menu__item-icon",
  "aria-hidden": "true"
}, Oe = { class: "nm-menu__item-label" }, Ve = {
  key: 0,
  class: "nm-menu__empty"
}, qe = /* @__PURE__ */ ue({
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
  setup(p, { emit: Q }) {
    const r = p, L = Q, { config: I, resolveProp: S } = pe(), { isDark: W } = ve(), X = c(() => r.theme ? r.theme : W.value ? "dark" : "light"), u = c(() => {
      var e;
      return S(r.mode, (e = I.value.menu) == null ? void 0 : e.mode, "vertical");
    }), j = c(() => {
      var e;
      return S(r.size, (e = I.value.menu) == null ? void 0 : e.size, "medium");
    }), Y = c(
      () => {
        var e;
        return S(r.selectable, (e = I.value.menu) == null ? void 0 : e.selectable, !0);
      }
    ), Z = R(r.defaultActive ?? null), ee = R([...r.defaultExpanded]), {
      handleKeydown: x,
      handleItemClick: B,
      handleItemEnter: ne,
      isExpanded: m,
      isActive: E,
      collapse: oe
    } = _e({
      items: c(() => r.items),
      mode: u,
      activeKey: Z,
      expandedKeys: ee,
      onSelect: (e) => {
        L("select", e), L("item-click", e);
      }
    });
    let M = null;
    function w(e) {
      M && (clearTimeout(M), M = null), ne(e);
    }
    function z(e) {
      var l;
      u.value === "horizontal" && ((l = e.children) != null && l.length) && (M = setTimeout(() => {
        oe(e.key);
      }, 200));
    }
    const g = /* @__PURE__ */ new Map(), $ = R({});
    function te(e, l) {
      l instanceof HTMLElement ? g.set(e, l) : g.delete(e);
    }
    const F = c(
      () => u.value === "horizontal" && !r.collapsed && r.items.some((e) => {
        var l;
        return ((l = e.children) == null ? void 0 : l.length) && m(e.key);
      })
    );
    let h = null;
    function D() {
      h = null;
      let e = Object.keys($.value).length !== g.size;
      const l = {};
      for (const [n, C] of g) {
        const b = C.getBoundingClientRect();
        l[n] = { top: b.top, bottom: b.bottom, left: b.left };
        const v = $.value[n];
        (!v || v.top !== l[n].top || v.bottom !== l[n].bottom || v.left !== l[n].left) && (e = !0);
      }
      e && ($.value = l), F.value && typeof window < "u" && (h = window.requestAnimationFrame(D));
    }
    function H() {
      h !== null && typeof window < "u" && (window.cancelAnimationFrame(h), h = null);
    }
    de(F, (e) => {
      e ? h === null && D() : H();
    }), re(H);
    function le(e) {
      const l = $.value[e];
      return {
        position: "fixed",
        top: l ? `${l.bottom + 4}px` : "0px",
        left: l ? `${l.left}px` : "0px"
      };
    }
    const se = c(() => [
      "nm-menu",
      `nm-menu--${u.value}`,
      `nm-menu--${j.value}`,
      `nm-menu--theme-${X.value}`,
      {
        "nm-menu--collapsed": r.collapsed,
        "nm-menu--selectable": Y.value
      }
    ]), ae = c(() => u.value === "horizontal" ? "menubar" : "menu");
    function ie(e) {
      return [
        "nm-menu__item",
        {
          "nm-menu__item--active": E(e.key),
          "nm-menu__item--disabled": e.disabled,
          "nm-menu__item--divided": e.divided,
          "nm-menu__item--has-children": e.children && e.children.length > 0,
          "nm-menu__item--expanded": m(e.key)
        }
      ];
    }
    function N(e, l) {
      l.disabled || x(e);
    }
    const O = c(() => [
      "nm-menu__expand-icon",
      {
        "nm-menu__expand-icon--expanded": !1,
        "nm-menu__expand-icon--horizontal": u.value === "horizontal"
      }
    ]);
    return (e, l) => (t(), s("nav", {
      class: f(se.value),
      role: ae.value,
      "aria-label": "Menu",
      onKeydown: l[1] || (l[1] = //@ts-ignore
      (...n) => i(x) && i(x)(...n))
    }, [
      _("ul", ye, [
        (t(!0), s(y, null, T(p.items, (n) => {
          var C, b, v, V;
          return t(), s(y, {
            key: n.key
          }, [
            n.divided ? (t(), s("li", ke)) : d("", !0),
            _("li", {
              ref_for: !0,
              ref: (o) => te(n.key, o),
              class: f(ie(n)),
              role: "menuitem",
              "aria-disabled": n.disabled ?? !1,
              "aria-expanded": (C = n.children) != null && C.length ? i(m)(n.key) : void 0,
              "aria-haspopup": (b = n.children) != null && b.length ? "menu" : void 0,
              tabindex: n.disabled ? -1 : 0,
              onClick: A((o) => i(B)(n), ["stop"]),
              onMouseenter: (o) => w(n),
              onMouseleave: (o) => z(n),
              onKeydown: (o) => N(o, n)
            }, [
              _("div", Me, [
                n.icon ? (t(), s("span", we, k(n.icon), 1)) : d("", !0),
                !p.collapsed || !n.icon ? (t(), s("span", ze, k(n.label), 1)) : d("", !0),
                (v = n.children) != null && v.length && !p.collapsed ? (t(), s("span", {
                  key: 2,
                  class: f([
                    ...O.value,
                    { "nm-menu__expand-icon--expanded": i(m)(n.key) }
                  ]),
                  "aria-hidden": "true"
                }, [
                  (t(), s("svg", ge, [
                    u.value === "vertical" ? (t(), s("path", $e)) : (t(), s("path", Ce))
                  ]))
                ], 2)) : d("", !0)
              ]),
              (t(), J(me, {
                to: "body",
                disabled: u.value !== "horizontal"
              }, [
                (V = n.children) != null && V.length && i(m)(n.key) && !p.collapsed ? (t(), s("ul", {
                  key: 0,
                  class: f([
                    "nm-menu__submenu",
                    u.value === "horizontal" ? [`nm-menu--${j.value}`, "nm-menu__submenu--floating"] : void 0
                  ]),
                  style: ce(u.value === "horizontal" ? le(n.key) : void 0),
                  role: "menu",
                  "aria-label": n.label,
                  onMouseenter: (o) => u.value === "horizontal" ? w(n) : void 0,
                  onMouseleave: (o) => u.value === "horizontal" ? z(n) : void 0,
                  onKeydown: l[0] || (l[0] = (o) => u.value === "horizontal" ? i(x)(o) : void 0)
                }, [
                  (t(!0), s(y, null, T(n.children, (o) => {
                    var q, P, U, G;
                    return t(), s(y, {
                      key: o.key
                    }, [
                      o.divided ? (t(), s("li", Ie)) : d("", !0),
                      _("li", {
                        class: f([
                          "nm-menu__item",
                          "nm-menu__item--sub",
                          {
                            "nm-menu__item--active": i(E)(o.key),
                            "nm-menu__item--disabled": o.disabled,
                            "nm-menu__item--has-children": o.children && o.children.length > 0,
                            "nm-menu__item--expanded": i(m)(o.key)
                          }
                        ]),
                        role: "menuitem",
                        "aria-disabled": o.disabled ?? !1,
                        "aria-expanded": (q = o.children) != null && q.length ? i(m)(o.key) : void 0,
                        "aria-haspopup": (P = o.children) != null && P.length ? "menu" : void 0,
                        tabindex: o.disabled ? -1 : 0,
                        onClick: A((a) => i(B)(o), ["stop"]),
                        onMouseenter: (a) => w(o),
                        onMouseleave: (a) => z(o),
                        onKeydown: (a) => N(a, o)
                      }, [
                        _("div", Be, [
                          o.icon ? (t(), s("span", Ee, k(o.icon), 1)) : d("", !0),
                          _("span", Ne, k(o.label), 1),
                          (U = o.children) != null && U.length ? (t(), s("span", {
                            key: 1,
                            class: f([
                              ...O.value,
                              { "nm-menu__expand-icon--expanded": i(m)(o.key) }
                            ]),
                            "aria-hidden": "true"
                          }, [
                            (t(), s("svg", Re, [
                              u.value === "vertical" ? (t(), s("path", Te)) : (t(), s("path", Ae))
                            ]))
                          ], 2)) : d("", !0)
                        ]),
                        (G = o.children) != null && G.length && i(m)(o.key) ? (t(), s("ul", {
                          key: 0,
                          class: "nm-menu__submenu",
                          role: "menu",
                          "aria-label": o.label
                        }, [
                          (t(!0), s(y, null, T(o.children, (a) => (t(), s(y, {
                            key: a.key
                          }, [
                            a.divided ? (t(), s("li", je)) : d("", !0),
                            _("li", {
                              class: f([
                                "nm-menu__item",
                                "nm-menu__item--sub",
                                "nm-menu__item--sub-deep",
                                {
                                  "nm-menu__item--active": i(E)(a.key),
                                  "nm-menu__item--disabled": a.disabled
                                }
                              ]),
                              role: "menuitem",
                              "aria-disabled": a.disabled ?? !1,
                              tabindex: a.disabled ? -1 : 0,
                              onClick: A((K) => i(B)(a), ["stop"]),
                              onMouseenter: (K) => w(a),
                              onMouseleave: (K) => z(a),
                              onKeydown: (K) => N(K, a)
                            }, [
                              _("div", De, [
                                a.icon ? (t(), s("span", He, k(a.icon), 1)) : d("", !0),
                                _("span", Oe, k(a.label), 1)
                              ])
                            ], 42, Fe)
                          ], 64))), 128))
                        ], 8, Le)) : d("", !0)
                      ], 42, Se)
                    ], 64);
                  }), 128))
                ], 46, Ke)) : d("", !0)
              ], 8, ["disabled"])),
              p.collapsed && n.icon ? (t(), J(fe, {
                key: 0,
                content: n.label,
                position: "right",
                delay: 300,
                disabled: !p.collapsed
              }, null, 8, ["content", "disabled"])) : d("", !0)
            ], 42, xe)
          ], 64);
        }), 128)),
        p.items.length === 0 ? (t(), s("li", Ve, "No menu items")) : d("", !0)
      ])
    ], 42, be));
  }
}), Xe = /* @__PURE__ */ he(qe, [["__scopeId", "data-v-6475f3c4"]]);
export {
  Xe as N
};

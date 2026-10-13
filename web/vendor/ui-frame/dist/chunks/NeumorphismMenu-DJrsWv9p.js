import { defineComponent as me, computed as c, ref as E, watch as ce, onBeforeUnmount as X, onMounted as _e, openBlock as l, createElementBlock as s, unref as i, normalizeClass as h, createElementVNode as _, Fragment as k, renderList as L, createCommentVNode as d, withModifiers as A, toDisplayString as x, createBlock as Y, Teleport as ve, normalizeStyle as pe } from "vue";
import { useMenu as fe } from "../composables/useMenu.js";
import { u as he } from "./createComponent-jnXBYqCm.js";
import { useTheme as be } from "../composables/useTheme.js";
import { N as ye } from "./NeumorphismTooltip-pagvhUIJ.js";
import { _ as ke } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismMenu.css';const xe = ["role"], Me = {
  class: "nm-menu__list",
  role: "group"
}, we = {
  key: 0,
  class: "nm-menu__divider",
  role: "separator",
  "aria-hidden": !0
}, ge = ["aria-disabled", "aria-expanded", "aria-haspopup", "tabindex", "onClick", "onMouseenter", "onMouseleave", "onKeydown"], ze = { class: "nm-menu__item-content" }, $e = {
  key: 0,
  class: "nm-menu__item-icon",
  "aria-hidden": "true"
}, Ce = {
  key: 1,
  class: "nm-menu__item-label"
}, Ke = {
  width: "12",
  height: "12",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2.5",
  "stroke-linecap": "round",
  "stroke-linejoin": "round"
}, Ee = {
  key: 0,
  d: "M9 18l6-6-6-6"
}, Ie = {
  key: 1,
  d: "M6 9l6 6 6-6"
}, Re = ["aria-label", "onMouseenter", "onMouseleave"], Se = {
  key: 0,
  class: "nm-menu__divider",
  role: "separator"
}, Be = ["aria-disabled", "aria-expanded", "aria-haspopup", "tabindex", "onClick", "onMouseenter", "onMouseleave", "onKeydown"], Ne = { class: "nm-menu__item-content" }, Te = {
  key: 0,
  class: "nm-menu__item-icon",
  "aria-hidden": "true"
}, Le = { class: "nm-menu__item-label" }, Ae = {
  width: "12",
  height: "12",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2.5",
  "stroke-linecap": "round",
  "stroke-linejoin": "round"
}, De = {
  key: 0,
  d: "M9 18l6-6-6-6"
}, je = {
  key: 1,
  d: "M6 9l6 6 6-6"
}, Fe = ["aria-label"], He = {
  key: 0,
  class: "nm-menu__divider",
  role: "separator"
}, Oe = ["aria-disabled", "tabindex", "onClick", "onMouseenter", "onMouseleave", "onKeydown"], Pe = { class: "nm-menu__item-content" }, Ve = {
  key: 0,
  class: "nm-menu__item-icon",
  "aria-hidden": "true"
}, qe = { class: "nm-menu__item-label" }, Ue = {
  key: 0,
  class: "nm-menu__empty"
}, Ge = /* @__PURE__ */ me({
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
  setup(v, { emit: Z }) {
    const r = v, D = Z, { config: I, resolveProp: R } = he(), { isDark: ee } = be(), ne = c(() => r.theme ? r.theme : ee.value ? "dark" : "light"), u = c(() => {
      var e;
      return R(r.mode, (e = I.value.menu) == null ? void 0 : e.mode, "vertical");
    }), j = c(() => {
      var e;
      return R(r.size, (e = I.value.menu) == null ? void 0 : e.size, "medium");
    }), oe = c(
      () => {
        var e;
        return R(r.selectable, (e = I.value.menu) == null ? void 0 : e.selectable, !0);
      }
    ), te = E(r.defaultActive ?? null), S = E([...r.defaultExpanded]), {
      handleKeydown: M,
      handleItemClick: B,
      handleItemEnter: le,
      isExpanded: m,
      isActive: N,
      collapse: se
    } = fe({
      items: c(() => r.items),
      mode: u,
      activeKey: te,
      expandedKeys: S,
      onSelect: (e) => {
        D("select", e), D("item-click", e);
      }
    });
    let w = null;
    function g(e) {
      w && (clearTimeout(w), w = null), le(e);
    }
    function z(e) {
      var t;
      u.value === "horizontal" && ((t = e.children) != null && t.length) && (w = setTimeout(() => {
        se(e.key);
      }, 200));
    }
    const $ = /* @__PURE__ */ new Map(), C = E({});
    function ae(e, t) {
      t instanceof HTMLElement ? $.set(e, t) : $.delete(e);
    }
    const F = c(
      () => u.value === "horizontal" && !r.collapsed && r.items.some((e) => {
        var t;
        return ((t = e.children) == null ? void 0 : t.length) && m(e.key);
      })
    );
    let b = null;
    function H() {
      b = null;
      let e = Object.keys(C.value).length !== $.size;
      const t = {};
      for (const [n, p] of $) {
        const y = p.getBoundingClientRect();
        t[n] = { top: y.top, bottom: y.bottom, left: y.left };
        const f = C.value[n];
        (!f || f.top !== t[n].top || f.bottom !== t[n].bottom || f.left !== t[n].left) && (e = !0);
      }
      e && (C.value = t), F.value && typeof window < "u" && (b = window.requestAnimationFrame(H));
    }
    function O() {
      b !== null && typeof window < "u" && (window.cancelAnimationFrame(b), b = null);
    }
    ce(F, (e) => {
      e ? b === null && H() : O();
    }), X(O);
    const P = E();
    function V(e) {
      var n, p;
      const t = e.target;
      (n = P.value) != null && n.contains(t) || (p = t.closest) != null && p.call(t, ".nm-menu__submenu--floating") || S.value.length && S.value.splice(0);
    }
    _e(() => {
      typeof document < "u" && document.addEventListener("pointerdown", V, !0);
    }), X(() => {
      typeof document < "u" && document.removeEventListener("pointerdown", V, !0);
    });
    function ie(e) {
      const t = C.value[e];
      return {
        position: "fixed",
        top: t ? `${t.bottom + 4}px` : "0px",
        left: t ? `${t.left}px` : "0px"
      };
    }
    const ue = c(() => [
      "nm-menu",
      `nm-menu--${u.value}`,
      `nm-menu--${j.value}`,
      `nm-menu--theme-${ne.value}`,
      {
        "nm-menu--collapsed": r.collapsed,
        "nm-menu--selectable": oe.value
      }
    ]), de = c(() => u.value === "horizontal" ? "menubar" : "menu");
    function re(e) {
      return [
        "nm-menu__item",
        {
          "nm-menu__item--active": N(e.key),
          "nm-menu__item--disabled": e.disabled,
          "nm-menu__item--divided": e.divided,
          "nm-menu__item--has-children": e.children && e.children.length > 0,
          "nm-menu__item--expanded": m(e.key)
        }
      ];
    }
    function T(e, t) {
      t.disabled || M(e);
    }
    const q = c(() => [
      "nm-menu__expand-icon",
      {
        "nm-menu__expand-icon--expanded": !1,
        "nm-menu__expand-icon--horizontal": u.value === "horizontal"
      }
    ]);
    return (e, t) => (l(), s("nav", {
      ref_key: "rootRef",
      ref: P,
      class: h(ue.value),
      role: de.value,
      "aria-label": "Menu",
      onKeydown: t[1] || (t[1] = //@ts-ignore
      (...n) => i(M) && i(M)(...n))
    }, [
      _("ul", Me, [
        (l(!0), s(k, null, L(v.items, (n) => {
          var p, y, f, U;
          return l(), s(k, {
            key: n.key
          }, [
            n.divided ? (l(), s("li", we)) : d("", !0),
            _("li", {
              ref_for: !0,
              ref: (o) => ae(n.key, o),
              class: h(re(n)),
              role: "menuitem",
              "aria-disabled": n.disabled ?? !1,
              "aria-expanded": (p = n.children) != null && p.length ? i(m)(n.key) : void 0,
              "aria-haspopup": (y = n.children) != null && y.length ? "menu" : void 0,
              tabindex: n.disabled ? -1 : 0,
              onClick: A((o) => i(B)(n), ["stop"]),
              onMouseenter: (o) => g(n),
              onMouseleave: (o) => z(n),
              onKeydown: (o) => T(o, n)
            }, [
              _("div", ze, [
                n.icon ? (l(), s("span", $e, x(n.icon), 1)) : d("", !0),
                !v.collapsed || !n.icon ? (l(), s("span", Ce, x(n.label), 1)) : d("", !0),
                (f = n.children) != null && f.length && !v.collapsed ? (l(), s("span", {
                  key: 2,
                  class: h([
                    ...q.value,
                    { "nm-menu__expand-icon--expanded": i(m)(n.key) }
                  ]),
                  "aria-hidden": "true"
                }, [
                  (l(), s("svg", Ke, [
                    u.value === "vertical" ? (l(), s("path", Ee)) : (l(), s("path", Ie))
                  ]))
                ], 2)) : d("", !0)
              ]),
              (l(), Y(ve, {
                to: "body",
                disabled: u.value !== "horizontal"
              }, [
                (U = n.children) != null && U.length && i(m)(n.key) && !v.collapsed ? (l(), s("ul", {
                  key: 0,
                  class: h([
                    "nm-menu__submenu",
                    u.value === "horizontal" ? [`nm-menu--${j.value}`, "nm-menu__submenu--floating"] : void 0
                  ]),
                  style: pe(u.value === "horizontal" ? ie(n.key) : void 0),
                  role: "menu",
                  "aria-label": n.label,
                  onMouseenter: (o) => u.value === "horizontal" ? g(n) : void 0,
                  onMouseleave: (o) => u.value === "horizontal" ? z(n) : void 0,
                  onKeydown: t[0] || (t[0] = (o) => u.value === "horizontal" ? i(M)(o) : void 0)
                }, [
                  (l(!0), s(k, null, L(n.children, (o) => {
                    var G, J, Q, W;
                    return l(), s(k, {
                      key: o.key
                    }, [
                      o.divided ? (l(), s("li", Se)) : d("", !0),
                      _("li", {
                        class: h([
                          "nm-menu__item",
                          "nm-menu__item--sub",
                          {
                            "nm-menu__item--active": i(N)(o.key),
                            "nm-menu__item--disabled": o.disabled,
                            "nm-menu__item--has-children": o.children && o.children.length > 0,
                            "nm-menu__item--expanded": i(m)(o.key)
                          }
                        ]),
                        role: "menuitem",
                        "aria-disabled": o.disabled ?? !1,
                        "aria-expanded": (G = o.children) != null && G.length ? i(m)(o.key) : void 0,
                        "aria-haspopup": (J = o.children) != null && J.length ? "menu" : void 0,
                        tabindex: o.disabled ? -1 : 0,
                        onClick: A((a) => i(B)(o), ["stop"]),
                        onMouseenter: (a) => g(o),
                        onMouseleave: (a) => z(o),
                        onKeydown: (a) => T(a, o)
                      }, [
                        _("div", Ne, [
                          o.icon ? (l(), s("span", Te, x(o.icon), 1)) : d("", !0),
                          _("span", Le, x(o.label), 1),
                          (Q = o.children) != null && Q.length ? (l(), s("span", {
                            key: 1,
                            class: h([
                              ...q.value,
                              { "nm-menu__expand-icon--expanded": i(m)(o.key) }
                            ]),
                            "aria-hidden": "true"
                          }, [
                            (l(), s("svg", Ae, [
                              u.value === "vertical" ? (l(), s("path", De)) : (l(), s("path", je))
                            ]))
                          ], 2)) : d("", !0)
                        ]),
                        (W = o.children) != null && W.length && i(m)(o.key) ? (l(), s("ul", {
                          key: 0,
                          class: "nm-menu__submenu",
                          role: "menu",
                          "aria-label": o.label
                        }, [
                          (l(!0), s(k, null, L(o.children, (a) => (l(), s(k, {
                            key: a.key
                          }, [
                            a.divided ? (l(), s("li", He)) : d("", !0),
                            _("li", {
                              class: h([
                                "nm-menu__item",
                                "nm-menu__item--sub",
                                "nm-menu__item--sub-deep",
                                {
                                  "nm-menu__item--active": i(N)(a.key),
                                  "nm-menu__item--disabled": a.disabled
                                }
                              ]),
                              role: "menuitem",
                              "aria-disabled": a.disabled ?? !1,
                              tabindex: a.disabled ? -1 : 0,
                              onClick: A((K) => i(B)(a), ["stop"]),
                              onMouseenter: (K) => g(a),
                              onMouseleave: (K) => z(a),
                              onKeydown: (K) => T(K, a)
                            }, [
                              _("div", Pe, [
                                a.icon ? (l(), s("span", Ve, x(a.icon), 1)) : d("", !0),
                                _("span", qe, x(a.label), 1)
                              ])
                            ], 42, Oe)
                          ], 64))), 128))
                        ], 8, Fe)) : d("", !0)
                      ], 42, Be)
                    ], 64);
                  }), 128))
                ], 46, Re)) : d("", !0)
              ], 8, ["disabled"])),
              v.collapsed && n.icon ? (l(), Y(ye, {
                key: 0,
                content: n.label,
                position: "right",
                delay: 300,
                disabled: !v.collapsed
              }, null, 8, ["content", "disabled"])) : d("", !0)
            ], 42, ge)
          ], 64);
        }), 128)),
        v.items.length === 0 ? (l(), s("li", Ue, "No menu items")) : d("", !0)
      ])
    ], 42, xe));
  }
}), en = /* @__PURE__ */ ke(Ge, [["__scopeId", "data-v-1b04799b"]]);
export {
  en as N
};

import { defineComponent as _e, computed as c, ref as I, watch as ve, onBeforeUnmount as X, onMounted as pe, openBlock as a, createElementBlock as l, unref as i, normalizeClass as b, createElementVNode as _, Fragment as k, renderList as L, createCommentVNode as d, withModifiers as A, toDisplayString as x, createVNode as Y, createBlock as Z, Teleport as fe, normalizeStyle as be } from "vue";
import { useMenu as he } from "../composables/useMenu.js";
import { u as ye } from "./createComponent-jnXBYqCm.js";
import { useTheme as ke } from "../composables/useTheme.js";
import { N as xe } from "./NeumorphismTooltip-pagvhUIJ.js";
import { N as ee } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as Me } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismMenu.css';const we = ["role"], ze = {
  class: "nm-menu__list",
  role: "group"
}, ge = {
  key: 0,
  class: "nm-menu__divider",
  role: "separator",
  "aria-hidden": !0
}, $e = ["aria-disabled", "aria-expanded", "aria-haspopup", "tabindex", "onClick", "onMouseenter", "onMouseleave", "onKeydown"], Ce = { class: "nm-menu__item-content" }, Ke = {
  key: 0,
  class: "nm-menu__item-icon",
  "aria-hidden": "true"
}, Ie = {
  key: 1,
  class: "nm-menu__item-label"
}, Ne = ["aria-label", "onMouseenter", "onMouseleave"], Ee = {
  key: 0,
  class: "nm-menu__divider",
  role: "separator"
}, Re = ["aria-disabled", "aria-expanded", "aria-haspopup", "tabindex", "onClick", "onMouseenter", "onMouseleave", "onKeydown"], Se = { class: "nm-menu__item-content" }, Te = {
  key: 0,
  class: "nm-menu__item-icon",
  "aria-hidden": "true"
}, Be = { class: "nm-menu__item-label" }, Le = ["aria-label"], Ae = {
  key: 0,
  class: "nm-menu__divider",
  role: "separator"
}, De = ["aria-disabled", "tabindex", "onClick", "onMouseenter", "onMouseleave", "onKeydown"], Fe = { class: "nm-menu__item-content" }, Ve = {
  key: 0,
  class: "nm-menu__item-icon",
  "aria-hidden": "true"
}, He = { class: "nm-menu__item-label" }, Oe = {
  key: 0,
  class: "nm-menu__empty"
}, Pe = /* @__PURE__ */ _e({
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
  setup(v, { emit: ne }) {
    const m = v, D = ne, { config: N, resolveProp: E } = ye(), { isDark: oe } = ke(), te = c(() => m.theme ? m.theme : oe.value ? "dark" : "light"), u = c(() => {
      var e;
      return E(m.mode, (e = N.value.menu) == null ? void 0 : e.mode, "vertical");
    }), F = c(() => {
      var e;
      return E(m.size, (e = N.value.menu) == null ? void 0 : e.size, "medium");
    }), ae = c(
      () => {
        var e;
        return E(m.selectable, (e = N.value.menu) == null ? void 0 : e.selectable, !0);
      }
    ), le = I(m.defaultActive ?? null), R = I([...m.defaultExpanded]), {
      handleKeydown: M,
      handleItemClick: S,
      handleItemEnter: se,
      isExpanded: r,
      isActive: T,
      collapse: ie
    } = he({
      items: c(() => m.items),
      mode: u,
      activeKey: le,
      expandedKeys: R,
      onSelect: (e) => {
        D("select", e), D("item-click", e);
      }
    });
    let w = null;
    function z(e) {
      w && (clearTimeout(w), w = null), se(e);
    }
    function g(e) {
      var t;
      u.value === "horizontal" && ((t = e.children) != null && t.length) && (w = setTimeout(() => {
        ie(e.key);
      }, 200));
    }
    const $ = /* @__PURE__ */ new Map(), C = I({});
    function ue(e, t) {
      t instanceof HTMLElement ? $.set(e, t) : $.delete(e);
    }
    const V = c(
      () => u.value === "horizontal" && !m.collapsed && m.items.some((e) => {
        var t;
        return ((t = e.children) == null ? void 0 : t.length) && r(e.key);
      })
    );
    let h = null;
    function H() {
      h = null;
      let e = Object.keys(C.value).length !== $.size;
      const t = {};
      for (const [n, p] of $) {
        const y = p.getBoundingClientRect();
        t[n] = { top: y.top, bottom: y.bottom, left: y.left };
        const f = C.value[n];
        (!f || f.top !== t[n].top || f.bottom !== t[n].bottom || f.left !== t[n].left) && (e = !0);
      }
      e && (C.value = t), V.value && typeof window < "u" && (h = window.requestAnimationFrame(H));
    }
    function O() {
      h !== null && typeof window < "u" && (window.cancelAnimationFrame(h), h = null);
    }
    ve(V, (e) => {
      e ? h === null && H() : O();
    }), X(O);
    const P = I();
    function j(e) {
      var n, p;
      const t = e.target;
      (n = P.value) != null && n.contains(t) || (p = t.closest) != null && p.call(t, ".nm-menu__submenu--floating") || R.value.length && R.value.splice(0);
    }
    pe(() => {
      typeof document < "u" && document.addEventListener("pointerdown", j, !0);
    }), X(() => {
      typeof document < "u" && document.removeEventListener("pointerdown", j, !0);
    });
    function de(e) {
      const t = C.value[e];
      return {
        position: "fixed",
        top: t ? `${t.bottom + 4}px` : "0px",
        left: t ? `${t.left}px` : "0px"
      };
    }
    const me = c(() => [
      "nm-menu",
      `nm-menu--${u.value}`,
      `nm-menu--${F.value}`,
      `nm-menu--theme-${te.value}`,
      {
        "nm-menu--collapsed": m.collapsed,
        "nm-menu--selectable": ae.value
      }
    ]), re = c(() => u.value === "horizontal" ? "menubar" : "menu");
    function ce(e) {
      return [
        "nm-menu__item",
        {
          "nm-menu__item--active": T(e.key),
          "nm-menu__item--disabled": e.disabled,
          "nm-menu__item--divided": e.divided,
          "nm-menu__item--has-children": e.children && e.children.length > 0,
          "nm-menu__item--expanded": r(e.key)
        }
      ];
    }
    function B(e, t) {
      t.disabled || M(e);
    }
    const q = c(() => [
      "nm-menu__expand-icon",
      {
        "nm-menu__expand-icon--expanded": !1,
        "nm-menu__expand-icon--horizontal": u.value === "horizontal"
      }
    ]);
    return (e, t) => (a(), l("nav", {
      ref_key: "rootRef",
      ref: P,
      class: b(me.value),
      role: re.value,
      "aria-label": "Menu",
      onKeydown: t[1] || (t[1] = //@ts-ignore
      (...n) => i(M) && i(M)(...n))
    }, [
      _("ul", ze, [
        (a(!0), l(k, null, L(v.items, (n) => {
          var p, y, f, U;
          return a(), l(k, {
            key: n.key
          }, [
            n.divided ? (a(), l("li", ge)) : d("", !0),
            _("li", {
              ref_for: !0,
              ref: (o) => ue(n.key, o),
              class: b(ce(n)),
              role: "menuitem",
              "aria-disabled": n.disabled ?? !1,
              "aria-expanded": (p = n.children) != null && p.length ? i(r)(n.key) : void 0,
              "aria-haspopup": (y = n.children) != null && y.length ? "menu" : void 0,
              tabindex: n.disabled ? -1 : 0,
              onClick: A((o) => i(S)(n), ["stop"]),
              onMouseenter: (o) => z(n),
              onMouseleave: (o) => g(n),
              onKeydown: (o) => B(o, n)
            }, [
              _("div", Ce, [
                n.icon ? (a(), l("span", Ke, x(n.icon), 1)) : d("", !0),
                !v.collapsed || !n.icon ? (a(), l("span", Ie, x(n.label), 1)) : d("", !0),
                (f = n.children) != null && f.length && !v.collapsed ? (a(), l("span", {
                  key: 2,
                  class: b([
                    ...q.value,
                    { "nm-menu__expand-icon--expanded": i(r)(n.key) }
                  ]),
                  "aria-hidden": "true"
                }, [
                  Y(ee, {
                    name: u.value === "vertical" ? "chevron-right" : "chevron-down",
                    size: "xs"
                  }, null, 8, ["name"])
                ], 2)) : d("", !0)
              ]),
              (a(), Z(fe, {
                to: "body",
                disabled: u.value !== "horizontal"
              }, [
                (U = n.children) != null && U.length && i(r)(n.key) && !v.collapsed ? (a(), l("ul", {
                  key: 0,
                  class: b([
                    "nm-menu__submenu",
                    u.value === "horizontal" ? [`nm-menu--${F.value}`, "nm-menu__submenu--floating"] : void 0
                  ]),
                  style: be(u.value === "horizontal" ? de(n.key) : void 0),
                  role: "menu",
                  "aria-label": n.label,
                  onMouseenter: (o) => u.value === "horizontal" ? z(n) : void 0,
                  onMouseleave: (o) => u.value === "horizontal" ? g(n) : void 0,
                  onKeydown: t[0] || (t[0] = (o) => u.value === "horizontal" ? i(M)(o) : void 0)
                }, [
                  (a(!0), l(k, null, L(n.children, (o) => {
                    var G, J, Q, W;
                    return a(), l(k, {
                      key: o.key
                    }, [
                      o.divided ? (a(), l("li", Ee)) : d("", !0),
                      _("li", {
                        class: b([
                          "nm-menu__item",
                          "nm-menu__item--sub",
                          {
                            "nm-menu__item--active": i(T)(o.key),
                            "nm-menu__item--disabled": o.disabled,
                            "nm-menu__item--has-children": o.children && o.children.length > 0,
                            "nm-menu__item--expanded": i(r)(o.key)
                          }
                        ]),
                        role: "menuitem",
                        "aria-disabled": o.disabled ?? !1,
                        "aria-expanded": (G = o.children) != null && G.length ? i(r)(o.key) : void 0,
                        "aria-haspopup": (J = o.children) != null && J.length ? "menu" : void 0,
                        tabindex: o.disabled ? -1 : 0,
                        onClick: A((s) => i(S)(o), ["stop"]),
                        onMouseenter: (s) => z(o),
                        onMouseleave: (s) => g(o),
                        onKeydown: (s) => B(s, o)
                      }, [
                        _("div", Se, [
                          o.icon ? (a(), l("span", Te, x(o.icon), 1)) : d("", !0),
                          _("span", Be, x(o.label), 1),
                          (Q = o.children) != null && Q.length ? (a(), l("span", {
                            key: 1,
                            class: b([
                              ...q.value,
                              { "nm-menu__expand-icon--expanded": i(r)(o.key) }
                            ]),
                            "aria-hidden": "true"
                          }, [
                            Y(ee, {
                              name: u.value === "vertical" ? "chevron-right" : "chevron-down",
                              size: "xs"
                            }, null, 8, ["name"])
                          ], 2)) : d("", !0)
                        ]),
                        (W = o.children) != null && W.length && i(r)(o.key) ? (a(), l("ul", {
                          key: 0,
                          class: "nm-menu__submenu",
                          role: "menu",
                          "aria-label": o.label
                        }, [
                          (a(!0), l(k, null, L(o.children, (s) => (a(), l(k, {
                            key: s.key
                          }, [
                            s.divided ? (a(), l("li", Ae)) : d("", !0),
                            _("li", {
                              class: b([
                                "nm-menu__item",
                                "nm-menu__item--sub",
                                "nm-menu__item--sub-deep",
                                {
                                  "nm-menu__item--active": i(T)(s.key),
                                  "nm-menu__item--disabled": s.disabled
                                }
                              ]),
                              role: "menuitem",
                              "aria-disabled": s.disabled ?? !1,
                              tabindex: s.disabled ? -1 : 0,
                              onClick: A((K) => i(S)(s), ["stop"]),
                              onMouseenter: (K) => z(s),
                              onMouseleave: (K) => g(s),
                              onKeydown: (K) => B(K, s)
                            }, [
                              _("div", Fe, [
                                s.icon ? (a(), l("span", Ve, x(s.icon), 1)) : d("", !0),
                                _("span", He, x(s.label), 1)
                              ])
                            ], 42, De)
                          ], 64))), 128))
                        ], 8, Le)) : d("", !0)
                      ], 42, Re)
                    ], 64);
                  }), 128))
                ], 46, Ne)) : d("", !0)
              ], 8, ["disabled"])),
              v.collapsed && n.icon ? (a(), Z(xe, {
                key: 0,
                content: n.label,
                position: "right",
                delay: 300,
                disabled: !v.collapsed
              }, null, 8, ["content", "disabled"])) : d("", !0)
            ], 42, $e)
          ], 64);
        }), 128)),
        v.items.length === 0 ? (a(), l("li", Oe, "No menu items")) : d("", !0)
      ])
    ], 42, we));
  }
}), Xe = /* @__PURE__ */ Me(Pe, [["__scopeId", "data-v-c909ab93"]]);
export {
  Xe as N
};

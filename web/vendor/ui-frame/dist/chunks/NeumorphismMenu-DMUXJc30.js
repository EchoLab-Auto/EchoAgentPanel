import { defineComponent as be, computed as d, ref as N, watch as ye, onBeforeUnmount as ee, onMounted as he, openBlock as a, createElementBlock as l, unref as i, normalizeStyle as ne, normalizeClass as b, createElementVNode as v, Fragment as k, renderList as D, createCommentVNode as m, withModifiers as F, toDisplayString as x, createVNode as oe, createBlock as te, Teleport as ke } from "vue";
import { useMenu as xe } from "../composables/useMenu.js";
import { u as Me } from "./createComponent-jnXBYqCm.js";
import { n as ze, r as we, M as ge } from "./controlScales-CPj0Htdh.js";
import { useTheme as Se } from "../composables/useTheme.js";
import { N as $e } from "./NeumorphismTooltip-pagvhUIJ.js";
import { N as ae } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as Ce } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismMenu.css';const Ee = ["role"], Ke = {
  class: "nm-menu__list",
  role: "group"
}, Ne = {
  key: 0,
  class: "nm-menu__divider",
  role: "separator",
  "aria-hidden": !0
}, Ie = ["aria-disabled", "aria-expanded", "aria-haspopup", "tabindex", "onClick", "onMouseenter", "onMouseleave", "onKeydown"], Re = { class: "nm-menu__item-content" }, Te = {
  key: 0,
  class: "nm-menu__item-icon",
  "aria-hidden": "true"
}, Le = {
  key: 1,
  class: "nm-menu__item-label"
}, Ae = ["aria-label", "onMouseenter", "onMouseleave"], Be = {
  key: 0,
  class: "nm-menu__divider",
  role: "separator"
}, De = ["aria-disabled", "aria-expanded", "aria-haspopup", "tabindex", "onClick", "onMouseenter", "onMouseleave", "onKeydown"], Fe = { class: "nm-menu__item-content" }, Pe = {
  key: 0,
  class: "nm-menu__item-icon",
  "aria-hidden": "true"
}, Ue = { class: "nm-menu__item-label" }, Ve = ["aria-label"], He = {
  key: 0,
  class: "nm-menu__divider",
  role: "separator"
}, Oe = ["aria-disabled", "tabindex", "onClick", "onMouseenter", "onMouseleave", "onKeydown"], je = { class: "nm-menu__item-content" }, qe = {
  key: 0,
  class: "nm-menu__item-icon",
  "aria-hidden": "true"
}, Xe = { class: "nm-menu__item-label" }, Ze = {
  key: 0,
  class: "nm-menu__empty"
}, Ge = 14, Je = /* @__PURE__ */ be({
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
  setup(_, { emit: le }) {
    const r = _, P = le, { config: I, resolveProp: R } = Me(), { isDark: se } = Se(), ie = d(() => r.theme ? r.theme : se.value ? "dark" : "light"), u = d(() => {
      var e;
      return R(r.mode, (e = I.value.menu) == null ? void 0 : e.mode, "vertical");
    }), M = d(() => {
      var e;
      return R(r.size, (e = I.value.menu) == null ? void 0 : e.size, "medium");
    }), z = d(
      () => typeof M.value == "number" ? ze(M.value, Ge) : void 0
    ), U = d(
      () => typeof M.value == "string" ? M.value : "medium"
    ), V = d(
      () => z.value === void 0 ? void 0 : we(ge, z.value)
    ), ue = d(
      () => {
        var e;
        return R(r.selectable, (e = I.value.menu) == null ? void 0 : e.selectable, !0);
      }
    ), me = N(r.defaultActive ?? null), T = N([...r.defaultExpanded]), {
      handleKeydown: w,
      handleItemClick: L,
      handleItemEnter: de,
      isExpanded: c,
      isActive: A,
      collapse: re
    } = xe({
      items: d(() => r.items),
      mode: u,
      activeKey: me,
      expandedKeys: T,
      onSelect: (e) => {
        P("select", e), P("item-click", e);
      }
    });
    let g = null;
    function S(e) {
      g && (clearTimeout(g), g = null), de(e);
    }
    function $(e) {
      var t;
      u.value === "horizontal" && ((t = e.children) != null && t.length) && (g = setTimeout(() => {
        re(e.key);
      }, 200));
    }
    const C = /* @__PURE__ */ new Map(), E = N({});
    function ce(e, t) {
      t instanceof HTMLElement ? C.set(e, t) : C.delete(e);
    }
    const H = d(
      () => u.value === "horizontal" && !r.collapsed && r.items.some((e) => {
        var t;
        return ((t = e.children) == null ? void 0 : t.length) && c(e.key);
      })
    );
    let y = null;
    function O() {
      y = null;
      let e = Object.keys(E.value).length !== C.size;
      const t = {};
      for (const [n, p] of C) {
        const h = p.getBoundingClientRect();
        t[n] = { top: h.top, bottom: h.bottom, left: h.left };
        const f = E.value[n];
        (!f || f.top !== t[n].top || f.bottom !== t[n].bottom || f.left !== t[n].left) && (e = !0);
      }
      e && (E.value = t), H.value && typeof window < "u" && (y = window.requestAnimationFrame(O));
    }
    function j() {
      y !== null && typeof window < "u" && (window.cancelAnimationFrame(y), y = null);
    }
    ye(H, (e) => {
      e ? y === null && O() : j();
    }), ee(j);
    const q = N();
    function X(e) {
      var n, p;
      const t = e.target;
      (n = q.value) != null && n.contains(t) || (p = t.closest) != null && p.call(t, ".nm-menu__submenu--floating") || T.value.length && T.value.splice(0);
    }
    he(() => {
      typeof document < "u" && document.addEventListener("pointerdown", X, !0);
    }), ee(() => {
      typeof document < "u" && document.removeEventListener("pointerdown", X, !0);
    });
    function ve(e) {
      const t = E.value[e];
      return {
        position: "fixed",
        top: t ? `${t.bottom + 4}px` : "0px",
        left: t ? `${t.left}px` : "0px",
        ...V.value ?? {}
      };
    }
    const _e = d(() => [
      "nm-menu",
      `nm-menu--${u.value}`,
      // 数字与档位互斥：数字走 `--sized`（变量来自内联样式），字符串走档位类
      z.value === void 0 ? `nm-menu--${U.value}` : "nm-menu--sized",
      `nm-menu--theme-${ie.value}`,
      {
        "nm-menu--collapsed": r.collapsed,
        "nm-menu--selectable": ue.value
      }
    ]), pe = d(() => u.value === "horizontal" ? "menubar" : "menu");
    function fe(e) {
      return [
        "nm-menu__item",
        {
          "nm-menu__item--active": A(e.key),
          "nm-menu__item--disabled": e.disabled,
          "nm-menu__item--divided": e.divided,
          "nm-menu__item--has-children": e.children && e.children.length > 0,
          "nm-menu__item--expanded": c(e.key)
        }
      ];
    }
    function B(e, t) {
      t.disabled || w(e);
    }
    const Z = d(() => [
      "nm-menu__expand-icon",
      {
        "nm-menu__expand-icon--expanded": !1,
        "nm-menu__expand-icon--horizontal": u.value === "horizontal"
      }
    ]);
    return (e, t) => (a(), l("nav", {
      ref_key: "rootRef",
      ref: q,
      class: b(_e.value),
      style: ne(V.value),
      role: pe.value,
      "aria-label": "Menu",
      onKeydown: t[1] || (t[1] = //@ts-ignore
      (...n) => i(w) && i(w)(...n))
    }, [
      v("ul", Ke, [
        (a(!0), l(k, null, D(_.items, (n) => {
          var p, h, f, G;
          return a(), l(k, {
            key: n.key
          }, [
            n.divided ? (a(), l("li", Ne)) : m("", !0),
            v("li", {
              ref_for: !0,
              ref: (o) => ce(n.key, o),
              class: b(fe(n)),
              role: "menuitem",
              "aria-disabled": n.disabled ?? !1,
              "aria-expanded": (p = n.children) != null && p.length ? i(c)(n.key) : void 0,
              "aria-haspopup": (h = n.children) != null && h.length ? "menu" : void 0,
              tabindex: n.disabled ? -1 : 0,
              onClick: F((o) => i(L)(n), ["stop"]),
              onMouseenter: (o) => S(n),
              onMouseleave: (o) => $(n),
              onKeydown: (o) => B(o, n)
            }, [
              v("div", Re, [
                n.icon ? (a(), l("span", Te, x(n.icon), 1)) : m("", !0),
                !_.collapsed || !n.icon ? (a(), l("span", Le, x(n.label), 1)) : m("", !0),
                (f = n.children) != null && f.length && !_.collapsed ? (a(), l("span", {
                  key: 2,
                  class: b([
                    ...Z.value,
                    { "nm-menu__expand-icon--expanded": i(c)(n.key) }
                  ]),
                  "aria-hidden": "true"
                }, [
                  oe(ae, {
                    name: u.value === "vertical" ? "chevron-right" : "chevron-down",
                    size: "xs"
                  }, null, 8, ["name"])
                ], 2)) : m("", !0)
              ]),
              (a(), te(ke, {
                to: "body",
                disabled: u.value !== "horizontal"
              }, [
                (G = n.children) != null && G.length && i(c)(n.key) && !_.collapsed ? (a(), l("ul", {
                  key: 0,
                  class: b([
                    "nm-menu__submenu",
                    u.value === "horizontal" ? [
                      z.value === void 0 ? `nm-menu--${U.value}` : "nm-menu--sized",
                      "nm-menu__submenu--floating"
                    ] : void 0
                  ]),
                  style: ne(u.value === "horizontal" ? ve(n.key) : void 0),
                  role: "menu",
                  "aria-label": n.label,
                  onMouseenter: (o) => u.value === "horizontal" ? S(n) : void 0,
                  onMouseleave: (o) => u.value === "horizontal" ? $(n) : void 0,
                  onKeydown: t[0] || (t[0] = (o) => u.value === "horizontal" ? i(w)(o) : void 0)
                }, [
                  (a(!0), l(k, null, D(n.children, (o) => {
                    var J, Q, W, Y;
                    return a(), l(k, {
                      key: o.key
                    }, [
                      o.divided ? (a(), l("li", Be)) : m("", !0),
                      v("li", {
                        class: b([
                          "nm-menu__item",
                          "nm-menu__item--sub",
                          {
                            "nm-menu__item--active": i(A)(o.key),
                            "nm-menu__item--disabled": o.disabled,
                            "nm-menu__item--has-children": o.children && o.children.length > 0,
                            "nm-menu__item--expanded": i(c)(o.key)
                          }
                        ]),
                        role: "menuitem",
                        "aria-disabled": o.disabled ?? !1,
                        "aria-expanded": (J = o.children) != null && J.length ? i(c)(o.key) : void 0,
                        "aria-haspopup": (Q = o.children) != null && Q.length ? "menu" : void 0,
                        tabindex: o.disabled ? -1 : 0,
                        onClick: F((s) => i(L)(o), ["stop"]),
                        onMouseenter: (s) => S(o),
                        onMouseleave: (s) => $(o),
                        onKeydown: (s) => B(s, o)
                      }, [
                        v("div", Fe, [
                          o.icon ? (a(), l("span", Pe, x(o.icon), 1)) : m("", !0),
                          v("span", Ue, x(o.label), 1),
                          (W = o.children) != null && W.length ? (a(), l("span", {
                            key: 1,
                            class: b([
                              ...Z.value,
                              { "nm-menu__expand-icon--expanded": i(c)(o.key) }
                            ]),
                            "aria-hidden": "true"
                          }, [
                            oe(ae, {
                              name: u.value === "vertical" ? "chevron-right" : "chevron-down",
                              size: "xs"
                            }, null, 8, ["name"])
                          ], 2)) : m("", !0)
                        ]),
                        (Y = o.children) != null && Y.length && i(c)(o.key) ? (a(), l("ul", {
                          key: 0,
                          class: "nm-menu__submenu",
                          role: "menu",
                          "aria-label": o.label
                        }, [
                          (a(!0), l(k, null, D(o.children, (s) => (a(), l(k, {
                            key: s.key
                          }, [
                            s.divided ? (a(), l("li", He)) : m("", !0),
                            v("li", {
                              class: b([
                                "nm-menu__item",
                                "nm-menu__item--sub",
                                "nm-menu__item--sub-deep",
                                {
                                  "nm-menu__item--active": i(A)(s.key),
                                  "nm-menu__item--disabled": s.disabled
                                }
                              ]),
                              role: "menuitem",
                              "aria-disabled": s.disabled ?? !1,
                              tabindex: s.disabled ? -1 : 0,
                              onClick: F((K) => i(L)(s), ["stop"]),
                              onMouseenter: (K) => S(s),
                              onMouseleave: (K) => $(s),
                              onKeydown: (K) => B(K, s)
                            }, [
                              v("div", je, [
                                s.icon ? (a(), l("span", qe, x(s.icon), 1)) : m("", !0),
                                v("span", Xe, x(s.label), 1)
                              ])
                            ], 42, Oe)
                          ], 64))), 128))
                        ], 8, Ve)) : m("", !0)
                      ], 42, De)
                    ], 64);
                  }), 128))
                ], 46, Ae)) : m("", !0)
              ], 8, ["disabled"])),
              _.collapsed && n.icon ? (a(), te($e, {
                key: 0,
                content: n.label,
                position: "right",
                delay: 300,
                disabled: !_.collapsed
              }, null, 8, ["content", "disabled"])) : m("", !0)
            ], 42, Ie)
          ], 64);
        }), 128)),
        _.items.length === 0 ? (a(), l("li", Ze, "No menu items")) : m("", !0)
      ])
    ], 46, Ee));
  }
}), ln = /* @__PURE__ */ Ce(Je, [["__scopeId", "data-v-028da44e"]]);
export {
  ln as N
};

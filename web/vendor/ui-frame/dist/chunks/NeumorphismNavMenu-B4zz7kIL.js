import { defineComponent as re, computed as u, ref as g, onMounted as le, onBeforeUnmount as de, openBlock as a, createElementBlock as s, unref as t, normalizeStyle as ue, normalizeClass as h, createElementVNode as l, Fragment as k, renderList as L, createCommentVNode as r, createBlock as me, withCtx as j, withModifiers as x, toDisplayString as v, createVNode as q } from "vue";
import { useMenu as ve } from "../composables/useMenu.js";
import { u as ce } from "./createComponent-jnXBYqCm.js";
import { n as _e, r as pe, N as he } from "./controlScales-CPj0Htdh.js";
import { useTheme as fe } from "../composables/useTheme.js";
import { N as be } from "./NeumorphismPopover-m8EjDIRe.js";
import { N as G } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as ye } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismNavMenu.css';const ke = ["aria-orientation"], Me = {
  key: 0,
  class: "nm-nav-menu__divider",
  role: "separator"
}, we = ["aria-disabled", "aria-expanded", "tabindex", "onClick", "onMouseenter", "onMouseleave"], ge = { class: "nm-nav-menu__item-content" }, xe = {
  key: 0,
  class: "nm-nav-menu__item-icon",
  "aria-hidden": "true"
}, Ce = { class: "nm-nav-menu__item-label" }, Ne = {
  class: "nm-nav-menu__dropdown-arrow",
  "aria-hidden": "true"
}, ze = {
  key: 0,
  class: "nm-nav-menu__indicator",
  "aria-hidden": "true"
}, Se = ["aria-label", "onMouseleave"], $e = {
  key: 0,
  class: "nm-nav-menu__dropdown-divider",
  role: "separator"
}, Ee = ["aria-disabled", "tabindex", "onClick", "onMouseenter"], Ie = {
  key: 0,
  class: "nm-nav-menu__dropdown-item-icon",
  "aria-hidden": "true"
}, Ke = { class: "nm-nav-menu__dropdown-item-label" }, Le = ["aria-disabled", "aria-haspopup", "aria-expanded", "tabindex", "onClick", "onMouseenter", "onMouseleave"], Te = { class: "nm-nav-menu__item-content" }, Ve = {
  key: 0,
  class: "nm-nav-menu__item-icon",
  "aria-hidden": "true"
}, Ae = { class: "nm-nav-menu__item-label" }, Pe = {
  key: 0,
  class: "nm-nav-menu__indicator",
  "aria-hidden": "true"
}, Re = ["aria-label"], Be = ["aria-disabled", "tabindex", "onClick", "onMouseenter"], De = { class: "nm-nav-menu__item-content" }, Ue = {
  key: 0,
  class: "nm-nav-menu__item-icon",
  "aria-hidden": "true"
}, Fe = { class: "nm-nav-menu__item-label" }, Xe = {
  key: 0,
  class: "nm-nav-menu__empty"
}, Ze = 14, je = /* @__PURE__ */ re({
  __name: "NeumorphismNavMenu",
  props: {
    items: { default: () => [] },
    defaultActive: { default: void 0 },
    mode: {},
    showIndicator: { type: Boolean, default: void 0 },
    theme: { default: void 0 },
    size: {}
  },
  emits: ["select", "item-click"],
  setup(C, { emit: H }) {
    const c = C, T = H, { config: N, resolveProp: z } = ce(), { isDark: J } = fe(), O = u(() => c.theme ? c.theme : J.value ? "dark" : "light"), d = u(
      () => {
        var o;
        return z(c.mode, (o = N.value.navMenu) == null ? void 0 : o.mode, "horizontal");
      }
    ), M = u(
      () => {
        var o;
        return z(c.size, (o = N.value.navMenu) == null ? void 0 : o.size, "medium");
      }
    ), S = u(
      () => typeof M.value == "number" ? _e(M.value, Ze) : void 0
    ), Q = u(
      () => typeof M.value == "string" ? M.value : "medium"
    ), W = u(
      () => S.value === void 0 ? void 0 : pe(he, S.value)
    ), $ = u(
      () => {
        var o;
        return z(c.showIndicator, (o = N.value.navMenu) == null ? void 0 : o.showIndicator, !0);
      }
    ), Y = g(c.defaultActive ?? null), E = g([]), {
      handleKeydown: _,
      handleItemClick: w,
      handleItemEnter: I,
      isExpanded: f,
      isActive: b,
      expand: ee,
      collapse: K
    } = ve({
      items: u(() => c.items),
      mode: d,
      activeKey: Y,
      expandedKeys: E,
      onSelect: (o) => {
        T("select", o), T("item-click", o);
      }
    }), V = g();
    function A(o) {
      var e, y;
      const i = o.target;
      (e = V.value) != null && e.contains(i) || (y = i.closest) != null && y.call(i, ".nm-popover") || E.value.length && E.value.splice(0);
    }
    le(() => {
      typeof document < "u" && document.addEventListener("pointerdown", A, !0);
    }), de(() => {
      typeof document < "u" && document.removeEventListener("pointerdown", A, !0);
    });
    let m = null;
    function P(o) {
      m && (clearTimeout(m), m = null), I(o);
    }
    function R(o) {
      var i;
      d.value === "horizontal" && ((i = o.children) != null && i.length) && (m = setTimeout(() => {
        K(o.key);
      }, 250));
    }
    function ne() {
      m && (clearTimeout(m), m = null);
    }
    function oe(o) {
      m = setTimeout(() => {
        K(o.key);
      }, 250);
    }
    const ae = g({});
    function te(o, i) {
      ae.value[o] = i;
    }
    function se(o, i) {
      i ? ee(o.key) : K(o.key);
    }
    const ie = u(() => [
      "nm-nav-menu",
      `nm-nav-menu--${d.value}`,
      // 数字与档位互斥：数字走 `--sized`（变量来自内联样式），字符串走档位类
      S.value === void 0 ? `nm-nav-menu--${Q.value}` : "nm-nav-menu--sized",
      `nm-nav-menu--theme-${O.value}`,
      {
        "nm-nav-menu--indicator": $.value
      }
    ]);
    function B(o) {
      return [
        "nm-nav-menu__item",
        {
          "nm-nav-menu__item--active": b(o.key),
          "nm-nav-menu__item--disabled": o.disabled,
          "nm-nav-menu__item--divided": o.divided,
          "nm-nav-menu__item--has-children": o.children && o.children.length > 0,
          "nm-nav-menu__item--expanded": f(o.key)
        }
      ];
    }
    return (o, i) => (a(), s("nav", {
      ref_key: "rootRef",
      ref: V,
      class: h(ie.value),
      style: ue(W.value),
      role: "navigation",
      "aria-label": "Navigation menu",
      onKeydown: i[2] || (i[2] = //@ts-ignore
      (...e) => t(_) && t(_)(...e))
    }, [
      l("ul", {
        class: "nm-nav-menu__list",
        role: "menubar",
        "aria-orientation": d.value
      }, [
        (a(!0), s(k, null, L(C.items, (e) => {
          var y, D, U, F, X, Z;
          return a(), s(k, {
            key: e.key
          }, [
            e.divided && d.value === "vertical" ? (a(), s("li", Me)) : r("", !0),
            (y = e.children) != null && y.length && d.value === "horizontal" ? (a(), me(be, {
              key: `${e.key}-popover`,
              ref_for: !0,
              ref: (n) => te(e.key, n),
              position: "bottom",
              trigger: "hover",
              offset: 4,
              "show-arrow": !1,
              disabled: e.disabled,
              onVisibleChange: (n) => se(e, n)
            }, {
              content: j(() => [
                l("div", {
                  class: "nm-nav-menu__dropdown",
                  role: "menu",
                  "aria-label": e.label,
                  onMouseenter: ne,
                  onMouseleave: (n) => oe(e),
                  onKeydown: i[0] || (i[0] = //@ts-ignore
                  (...n) => t(_) && t(_)(...n))
                }, [
                  (a(!0), s(k, null, L(e.children, (n) => (a(), s(k, {
                    key: n.key
                  }, [
                    n.divided ? (a(), s("div", $e)) : r("", !0),
                    l("div", {
                      class: h([
                        "nm-nav-menu__dropdown-item",
                        {
                          "nm-nav-menu__dropdown-item--active": t(b)(n.key),
                          "nm-nav-menu__dropdown-item--disabled": n.disabled,
                          "nm-nav-menu__dropdown-item--divided": n.divided
                        }
                      ]),
                      role: "menuitem",
                      "aria-disabled": n.disabled ?? !1,
                      tabindex: n.disabled ? -1 : 0,
                      onClick: x((p) => t(w)(n), ["stop"]),
                      onMouseenter: (p) => t(I)(n)
                    }, [
                      n.icon ? (a(), s("span", Ie, v(n.icon), 1)) : r("", !0),
                      l("span", Ke, v(n.label), 1)
                    ], 42, Ee)
                  ], 64))), 128))
                ], 40, Se)
              ]),
              default: j(() => [
                l("li", {
                  class: h(B(e)),
                  role: "menuitem",
                  "aria-disabled": e.disabled ?? !1,
                  "aria-haspopup": "menu",
                  "aria-expanded": t(f)(e.key),
                  tabindex: e.disabled ? -1 : 0,
                  onClick: x((n) => {
                    var p;
                    return (p = e.children) != null && p.length ? void 0 : t(w)(e);
                  }, ["stop"]),
                  onMouseenter: (n) => P(e),
                  onMouseleave: (n) => R(e)
                }, [
                  l("div", ge, [
                    e.icon ? (a(), s("span", xe, v(e.icon), 1)) : r("", !0),
                    l("span", Ce, v(e.label), 1),
                    l("span", Ne, [
                      q(G, {
                        name: "chevron-down",
                        size: "xs"
                      })
                    ])
                  ]),
                  $.value && t(b)(e.key) ? (a(), s("span", ze)) : r("", !0)
                ], 42, we)
              ]),
              _: 2
            }, 1032, ["disabled", "onVisibleChange"])) : r("", !0),
            !((D = e.children) != null && D.length) || d.value === "vertical" ? (a(), s("li", {
              key: 2,
              class: h(B(e)),
              role: "menuitem",
              "aria-disabled": e.disabled ?? !1,
              "aria-haspopup": (U = e.children) != null && U.length ? "menu" : void 0,
              "aria-expanded": (F = e.children) != null && F.length ? t(f)(e.key) : void 0,
              tabindex: e.disabled ? -1 : 0,
              onClick: x((n) => t(w)(e), ["stop"]),
              onMouseenter: (n) => P(e),
              onMouseleave: (n) => R(e),
              onKeydown: i[1] || (i[1] = //@ts-ignore
              (...n) => t(_) && t(_)(...n))
            }, [
              l("div", Te, [
                e.icon ? (a(), s("span", Ve, v(e.icon), 1)) : r("", !0),
                l("span", Ae, v(e.label), 1),
                (X = e.children) != null && X.length && d.value === "vertical" ? (a(), s("span", {
                  key: 1,
                  class: h(["nm-nav-menu__expand-icon", { "nm-nav-menu__expand-icon--expanded": t(f)(e.key) }]),
                  "aria-hidden": "true"
                }, [
                  q(G, {
                    name: "chevron-right",
                    size: "xs"
                  })
                ], 2)) : r("", !0)
              ]),
              $.value && d.value === "horizontal" && t(b)(e.key) ? (a(), s("span", Pe)) : r("", !0),
              (Z = e.children) != null && Z.length && d.value === "vertical" && t(f)(e.key) ? (a(), s("ul", {
                key: 1,
                class: "nm-nav-menu__submenu",
                role: "menu",
                "aria-label": e.label
              }, [
                (a(!0), s(k, null, L(e.children, (n) => (a(), s("li", {
                  key: n.key,
                  class: h(["nm-nav-menu__item nm-nav-menu__item--sub", {
                    "nm-nav-menu__item--active": t(b)(n.key),
                    "nm-nav-menu__item--disabled": n.disabled
                  }]),
                  role: "menuitem",
                  "aria-disabled": n.disabled ?? !1,
                  tabindex: n.disabled ? -1 : 0,
                  onClick: x((p) => t(w)(n), ["stop"]),
                  onMouseenter: (p) => t(I)(n)
                }, [
                  l("div", De, [
                    n.icon ? (a(), s("span", Ue, v(n.icon), 1)) : r("", !0),
                    l("span", Fe, v(n.label), 1)
                  ])
                ], 42, Be))), 128))
              ], 8, Re)) : r("", !0)
            ], 42, Le)) : r("", !0)
          ], 64);
        }), 128)),
        C.items.length === 0 ? (a(), s("li", Xe, "No navigation items")) : r("", !0)
      ], 8, ke)
    ], 38));
  }
}), en = /* @__PURE__ */ ye(je, [["__scopeId", "data-v-40989822"]]);
export {
  en as N
};

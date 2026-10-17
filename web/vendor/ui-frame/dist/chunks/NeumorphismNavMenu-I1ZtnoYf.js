import { defineComponent as te, computed as p, ref as w, onMounted as se, onBeforeUnmount as ie, openBlock as a, createElementBlock as s, unref as t, normalizeClass as h, createElementVNode as d, Fragment as y, renderList as K, createCommentVNode as r, createBlock as re, withCtx as j, withModifiers as x, toDisplayString as m, createVNode as q } from "vue";
import { useMenu as de } from "../composables/useMenu.js";
import { u as le } from "./createComponent-jnXBYqCm.js";
import { useTheme as ue } from "../composables/useTheme.js";
import { N as me } from "./NeumorphismPopover-m8EjDIRe.js";
import { N as G } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as ce } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismNavMenu.css';const ve = ["aria-orientation"], _e = {
  key: 0,
  class: "nm-nav-menu__divider",
  role: "separator"
}, pe = ["aria-disabled", "aria-expanded", "tabindex", "onClick", "onMouseenter", "onMouseleave"], he = { class: "nm-nav-menu__item-content" }, fe = {
  key: 0,
  class: "nm-nav-menu__item-icon",
  "aria-hidden": "true"
}, be = { class: "nm-nav-menu__item-label" }, ke = {
  class: "nm-nav-menu__dropdown-arrow",
  "aria-hidden": "true"
}, ye = {
  key: 0,
  class: "nm-nav-menu__indicator",
  "aria-hidden": "true"
}, Me = ["aria-label", "onMouseleave"], we = {
  key: 0,
  class: "nm-nav-menu__dropdown-divider",
  role: "separator"
}, xe = ["aria-disabled", "tabindex", "onClick", "onMouseenter"], ge = {
  key: 0,
  class: "nm-nav-menu__dropdown-item-icon",
  "aria-hidden": "true"
}, Ce = { class: "nm-nav-menu__dropdown-item-label" }, Ne = ["aria-disabled", "aria-haspopup", "aria-expanded", "tabindex", "onClick", "onMouseenter", "onMouseleave"], $e = { class: "nm-nav-menu__item-content" }, ze = {
  key: 0,
  class: "nm-nav-menu__item-icon",
  "aria-hidden": "true"
}, Ie = { class: "nm-nav-menu__item-label" }, Ee = {
  key: 0,
  class: "nm-nav-menu__indicator",
  "aria-hidden": "true"
}, Ke = ["aria-label"], Se = ["aria-disabled", "tabindex", "onClick", "onMouseenter"], Te = { class: "nm-nav-menu__item-content" }, Le = {
  key: 0,
  class: "nm-nav-menu__item-icon",
  "aria-hidden": "true"
}, Re = { class: "nm-nav-menu__item-label" }, Ve = {
  key: 0,
  class: "nm-nav-menu__empty"
}, Be = /* @__PURE__ */ te({
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
  setup(g, { emit: H }) {
    const c = g, S = H, { config: C, resolveProp: N } = le(), { isDark: J } = ue(), O = p(() => c.theme ? c.theme : J.value ? "dark" : "light"), l = p(
      () => {
        var o;
        return N(c.mode, (o = C.value.navMenu) == null ? void 0 : o.mode, "horizontal");
      }
    ), Q = p(() => {
      var o;
      return N(c.size, (o = C.value.navMenu) == null ? void 0 : o.size, "medium");
    }), $ = p(
      () => {
        var o;
        return N(c.showIndicator, (o = C.value.navMenu) == null ? void 0 : o.showIndicator, !0);
      }
    ), W = w(c.defaultActive ?? null), z = w([]), {
      handleKeydown: v,
      handleItemClick: M,
      handleItemEnter: I,
      isExpanded: f,
      isActive: b,
      expand: X,
      collapse: E
    } = de({
      items: p(() => c.items),
      mode: l,
      activeKey: W,
      expandedKeys: z,
      onSelect: (o) => {
        S("select", o), S("item-click", o);
      }
    }), T = w();
    function L(o) {
      var e, k;
      const i = o.target;
      (e = T.value) != null && e.contains(i) || (k = i.closest) != null && k.call(i, ".nm-popover") || z.value.length && z.value.splice(0);
    }
    se(() => {
      typeof document < "u" && document.addEventListener("pointerdown", L, !0);
    }), ie(() => {
      typeof document < "u" && document.removeEventListener("pointerdown", L, !0);
    });
    let u = null;
    function R(o) {
      u && (clearTimeout(u), u = null), I(o);
    }
    function V(o) {
      var i;
      l.value === "horizontal" && ((i = o.children) != null && i.length) && (u = setTimeout(() => {
        E(o.key);
      }, 250));
    }
    function Y() {
      u && (clearTimeout(u), u = null);
    }
    function Z(o) {
      u = setTimeout(() => {
        E(o.key);
      }, 250);
    }
    const ee = w({});
    function ne(o, i) {
      ee.value[o] = i;
    }
    function oe(o, i) {
      i ? X(o.key) : E(o.key);
    }
    const ae = p(() => [
      "nm-nav-menu",
      `nm-nav-menu--${l.value}`,
      `nm-nav-menu--${Q.value}`,
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
      ref: T,
      class: h(ae.value),
      role: "navigation",
      "aria-label": "Navigation menu",
      onKeydown: i[2] || (i[2] = //@ts-ignore
      (...e) => t(v) && t(v)(...e))
    }, [
      d("ul", {
        class: "nm-nav-menu__list",
        role: "menubar",
        "aria-orientation": l.value
      }, [
        (a(!0), s(y, null, K(g.items, (e) => {
          var k, P, D, A, F, U;
          return a(), s(y, {
            key: e.key
          }, [
            e.divided && l.value === "vertical" ? (a(), s("li", _e)) : r("", !0),
            (k = e.children) != null && k.length && l.value === "horizontal" ? (a(), re(me, {
              key: `${e.key}-popover`,
              ref_for: !0,
              ref: (n) => ne(e.key, n),
              position: "bottom",
              trigger: "hover",
              offset: 4,
              "show-arrow": !1,
              disabled: e.disabled,
              onVisibleChange: (n) => oe(e, n)
            }, {
              content: j(() => [
                d("div", {
                  class: "nm-nav-menu__dropdown",
                  role: "menu",
                  "aria-label": e.label,
                  onMouseenter: Y,
                  onMouseleave: (n) => Z(e),
                  onKeydown: i[0] || (i[0] = //@ts-ignore
                  (...n) => t(v) && t(v)(...n))
                }, [
                  (a(!0), s(y, null, K(e.children, (n) => (a(), s(y, {
                    key: n.key
                  }, [
                    n.divided ? (a(), s("div", we)) : r("", !0),
                    d("div", {
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
                      onClick: x((_) => t(M)(n), ["stop"]),
                      onMouseenter: (_) => t(I)(n)
                    }, [
                      n.icon ? (a(), s("span", ge, m(n.icon), 1)) : r("", !0),
                      d("span", Ce, m(n.label), 1)
                    ], 42, xe)
                  ], 64))), 128))
                ], 40, Me)
              ]),
              default: j(() => [
                d("li", {
                  class: h(B(e)),
                  role: "menuitem",
                  "aria-disabled": e.disabled ?? !1,
                  "aria-haspopup": "menu",
                  "aria-expanded": t(f)(e.key),
                  tabindex: e.disabled ? -1 : 0,
                  onClick: x((n) => {
                    var _;
                    return (_ = e.children) != null && _.length ? void 0 : t(M)(e);
                  }, ["stop"]),
                  onMouseenter: (n) => R(e),
                  onMouseleave: (n) => V(e)
                }, [
                  d("div", he, [
                    e.icon ? (a(), s("span", fe, m(e.icon), 1)) : r("", !0),
                    d("span", be, m(e.label), 1),
                    d("span", ke, [
                      q(G, {
                        name: "chevron-down",
                        size: "xs"
                      })
                    ])
                  ]),
                  $.value && t(b)(e.key) ? (a(), s("span", ye)) : r("", !0)
                ], 42, pe)
              ]),
              _: 2
            }, 1032, ["disabled", "onVisibleChange"])) : r("", !0),
            !((P = e.children) != null && P.length) || l.value === "vertical" ? (a(), s("li", {
              key: 2,
              class: h(B(e)),
              role: "menuitem",
              "aria-disabled": e.disabled ?? !1,
              "aria-haspopup": (D = e.children) != null && D.length ? "menu" : void 0,
              "aria-expanded": (A = e.children) != null && A.length ? t(f)(e.key) : void 0,
              tabindex: e.disabled ? -1 : 0,
              onClick: x((n) => t(M)(e), ["stop"]),
              onMouseenter: (n) => R(e),
              onMouseleave: (n) => V(e),
              onKeydown: i[1] || (i[1] = //@ts-ignore
              (...n) => t(v) && t(v)(...n))
            }, [
              d("div", $e, [
                e.icon ? (a(), s("span", ze, m(e.icon), 1)) : r("", !0),
                d("span", Ie, m(e.label), 1),
                (F = e.children) != null && F.length && l.value === "vertical" ? (a(), s("span", {
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
              $.value && l.value === "horizontal" && t(b)(e.key) ? (a(), s("span", Ee)) : r("", !0),
              (U = e.children) != null && U.length && l.value === "vertical" && t(f)(e.key) ? (a(), s("ul", {
                key: 1,
                class: "nm-nav-menu__submenu",
                role: "menu",
                "aria-label": e.label
              }, [
                (a(!0), s(y, null, K(e.children, (n) => (a(), s("li", {
                  key: n.key,
                  class: h(["nm-nav-menu__item nm-nav-menu__item--sub", {
                    "nm-nav-menu__item--active": t(b)(n.key),
                    "nm-nav-menu__item--disabled": n.disabled
                  }]),
                  role: "menuitem",
                  "aria-disabled": n.disabled ?? !1,
                  tabindex: n.disabled ? -1 : 0,
                  onClick: x((_) => t(M)(n), ["stop"]),
                  onMouseenter: (_) => t(I)(n)
                }, [
                  d("div", Te, [
                    n.icon ? (a(), s("span", Le, m(n.icon), 1)) : r("", !0),
                    d("span", Re, m(n.label), 1)
                  ])
                ], 42, Se))), 128))
              ], 8, Ke)) : r("", !0)
            ], 42, Ne)) : r("", !0)
          ], 64);
        }), 128)),
        g.items.length === 0 ? (a(), s("li", Ve, "No navigation items")) : r("", !0)
      ], 8, ve)
    ], 34));
  }
}), Ge = /* @__PURE__ */ ce(Be, [["__scopeId", "data-v-378c0983"]]);
export {
  Ge as N
};

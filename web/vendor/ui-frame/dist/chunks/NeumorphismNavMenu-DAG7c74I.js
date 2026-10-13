import { defineComponent as oe, computed as p, ref as M, onMounted as ae, onBeforeUnmount as te, openBlock as t, createElementBlock as i, unref as s, normalizeClass as h, createElementVNode as r, Fragment as y, renderList as K, createCommentVNode as d, createBlock as se, withCtx as U, withModifiers as g, toDisplayString as m } from "vue";
import { useMenu as ie } from "../composables/useMenu.js";
import { u as re } from "./createComponent-jnXBYqCm.js";
import { useTheme as de } from "../composables/useTheme.js";
import { N as le } from "./NeumorphismPopover-m8EjDIRe.js";
import { _ as ue } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismNavMenu.css';const me = ["aria-orientation"], ve = {
  key: 0,
  class: "nm-nav-menu__divider",
  role: "separator"
}, ce = ["aria-disabled", "aria-expanded", "tabindex", "onClick", "onMouseenter", "onMouseleave"], _e = { class: "nm-nav-menu__item-content" }, pe = {
  key: 0,
  class: "nm-nav-menu__item-icon",
  "aria-hidden": "true"
}, he = { class: "nm-nav-menu__item-label" }, fe = {
  key: 0,
  class: "nm-nav-menu__indicator",
  "aria-hidden": "true"
}, ke = ["aria-label", "onMouseleave"], be = {
  key: 0,
  class: "nm-nav-menu__dropdown-divider",
  role: "separator"
}, ye = ["aria-disabled", "tabindex", "onClick", "onMouseenter"], we = {
  key: 0,
  class: "nm-nav-menu__dropdown-item-icon",
  "aria-hidden": "true"
}, Me = { class: "nm-nav-menu__dropdown-item-label" }, ge = ["aria-disabled", "aria-haspopup", "aria-expanded", "tabindex", "onClick", "onMouseenter", "onMouseleave"], xe = { class: "nm-nav-menu__item-content" }, Ce = {
  key: 0,
  class: "nm-nav-menu__item-icon",
  "aria-hidden": "true"
}, $e = { class: "nm-nav-menu__item-label" }, Ne = {
  key: 0,
  class: "nm-nav-menu__indicator",
  "aria-hidden": "true"
}, Ie = ["aria-label"], ze = ["aria-disabled", "tabindex", "onClick", "onMouseenter"], Ee = { class: "nm-nav-menu__item-content" }, Ke = {
  key: 0,
  class: "nm-nav-menu__item-icon",
  "aria-hidden": "true"
}, Be = { class: "nm-nav-menu__item-label" }, Se = {
  key: 0,
  class: "nm-nav-menu__empty"
}, Te = /* @__PURE__ */ oe({
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
  setup(x, { emit: q }) {
    const v = x, B = q, { config: C, resolveProp: $ } = re(), { isDark: G } = de(), H = p(() => v.theme ? v.theme : G.value ? "dark" : "light"), l = p(
      () => {
        var o;
        return $(v.mode, (o = C.value.navMenu) == null ? void 0 : o.mode, "horizontal");
      }
    ), J = p(() => {
      var o;
      return $(v.size, (o = C.value.navMenu) == null ? void 0 : o.size, "medium");
    }), N = p(
      () => {
        var o;
        return $(v.showIndicator, (o = C.value.navMenu) == null ? void 0 : o.showIndicator, !0);
      }
    ), O = M(v.defaultActive ?? null), I = M([]), {
      handleKeydown: c,
      handleItemClick: w,
      handleItemEnter: z,
      isExpanded: f,
      isActive: k,
      expand: Q,
      collapse: E
    } = ie({
      items: p(() => v.items),
      mode: l,
      activeKey: O,
      expandedKeys: I,
      onSelect: (o) => {
        B("select", o), B("item-click", o);
      }
    }), S = M();
    function T(o) {
      var e, b;
      const a = o.target;
      (e = S.value) != null && e.contains(a) || (b = a.closest) != null && b.call(a, ".nm-popover") || I.value.length && I.value.splice(0);
    }
    ae(() => {
      typeof document < "u" && document.addEventListener("pointerdown", T, !0);
    }), te(() => {
      typeof document < "u" && document.removeEventListener("pointerdown", T, !0);
    });
    let u = null;
    function L(o) {
      u && (clearTimeout(u), u = null), z(o);
    }
    function R(o) {
      var a;
      l.value === "horizontal" && ((a = o.children) != null && a.length) && (u = setTimeout(() => {
        E(o.key);
      }, 250));
    }
    function W() {
      u && (clearTimeout(u), u = null);
    }
    function X(o) {
      u = setTimeout(() => {
        E(o.key);
      }, 250);
    }
    const Y = M({});
    function Z(o, a) {
      Y.value[o] = a;
    }
    function ee(o, a) {
      a ? Q(o.key) : E(o.key);
    }
    const ne = p(() => [
      "nm-nav-menu",
      `nm-nav-menu--${l.value}`,
      `nm-nav-menu--${J.value}`,
      `nm-nav-menu--theme-${H.value}`,
      {
        "nm-nav-menu--indicator": N.value
      }
    ]);
    function P(o) {
      return [
        "nm-nav-menu__item",
        {
          "nm-nav-menu__item--active": k(o.key),
          "nm-nav-menu__item--disabled": o.disabled,
          "nm-nav-menu__item--divided": o.divided,
          "nm-nav-menu__item--has-children": o.children && o.children.length > 0,
          "nm-nav-menu__item--expanded": f(o.key)
        }
      ];
    }
    return (o, a) => (t(), i("nav", {
      ref_key: "rootRef",
      ref: S,
      class: h(ne.value),
      role: "navigation",
      "aria-label": "Navigation menu",
      onKeydown: a[2] || (a[2] = //@ts-ignore
      (...e) => s(c) && s(c)(...e))
    }, [
      r("ul", {
        class: "nm-nav-menu__list",
        role: "menubar",
        "aria-orientation": l.value
      }, [
        (t(!0), i(y, null, K(x.items, (e) => {
          var b, V, D, A, j, F;
          return t(), i(y, {
            key: e.key
          }, [
            e.divided && l.value === "vertical" ? (t(), i("li", ve)) : d("", !0),
            (b = e.children) != null && b.length && l.value === "horizontal" ? (t(), se(le, {
              key: `${e.key}-popover`,
              ref_for: !0,
              ref: (n) => Z(e.key, n),
              position: "bottom",
              trigger: "hover",
              offset: 4,
              "show-arrow": !1,
              disabled: e.disabled,
              onVisibleChange: (n) => ee(e, n)
            }, {
              content: U(() => [
                r("div", {
                  class: "nm-nav-menu__dropdown",
                  role: "menu",
                  "aria-label": e.label,
                  onMouseenter: W,
                  onMouseleave: (n) => X(e),
                  onKeydown: a[0] || (a[0] = //@ts-ignore
                  (...n) => s(c) && s(c)(...n))
                }, [
                  (t(!0), i(y, null, K(e.children, (n) => (t(), i(y, {
                    key: n.key
                  }, [
                    n.divided ? (t(), i("div", be)) : d("", !0),
                    r("div", {
                      class: h([
                        "nm-nav-menu__dropdown-item",
                        {
                          "nm-nav-menu__dropdown-item--active": s(k)(n.key),
                          "nm-nav-menu__dropdown-item--disabled": n.disabled,
                          "nm-nav-menu__dropdown-item--divided": n.divided
                        }
                      ]),
                      role: "menuitem",
                      "aria-disabled": n.disabled ?? !1,
                      tabindex: n.disabled ? -1 : 0,
                      onClick: g((_) => s(w)(n), ["stop"]),
                      onMouseenter: (_) => s(z)(n)
                    }, [
                      n.icon ? (t(), i("span", we, m(n.icon), 1)) : d("", !0),
                      r("span", Me, m(n.label), 1)
                    ], 42, ye)
                  ], 64))), 128))
                ], 40, ke)
              ]),
              default: U(() => [
                r("li", {
                  class: h(P(e)),
                  role: "menuitem",
                  "aria-disabled": e.disabled ?? !1,
                  "aria-haspopup": "menu",
                  "aria-expanded": s(f)(e.key),
                  tabindex: e.disabled ? -1 : 0,
                  onClick: g((n) => {
                    var _;
                    return (_ = e.children) != null && _.length ? void 0 : s(w)(e);
                  }, ["stop"]),
                  onMouseenter: (n) => L(e),
                  onMouseleave: (n) => R(e)
                }, [
                  r("div", _e, [
                    e.icon ? (t(), i("span", pe, m(e.icon), 1)) : d("", !0),
                    r("span", he, m(e.label), 1),
                    a[3] || (a[3] = r("span", {
                      class: "nm-nav-menu__dropdown-arrow",
                      "aria-hidden": "true"
                    }, [
                      r("svg", {
                        width: "12",
                        height: "12",
                        viewBox: "0 0 24 24",
                        fill: "none",
                        stroke: "currentColor",
                        "stroke-width": "2.5",
                        "stroke-linecap": "round",
                        "stroke-linejoin": "round"
                      }, [
                        r("path", { d: "M6 9l6 6 6-6" })
                      ])
                    ], -1))
                  ]),
                  N.value && s(k)(e.key) ? (t(), i("span", fe)) : d("", !0)
                ], 42, ce)
              ]),
              _: 2
            }, 1032, ["disabled", "onVisibleChange"])) : d("", !0),
            !((V = e.children) != null && V.length) || l.value === "vertical" ? (t(), i("li", {
              key: 2,
              class: h(P(e)),
              role: "menuitem",
              "aria-disabled": e.disabled ?? !1,
              "aria-haspopup": (D = e.children) != null && D.length ? "menu" : void 0,
              "aria-expanded": (A = e.children) != null && A.length ? s(f)(e.key) : void 0,
              tabindex: e.disabled ? -1 : 0,
              onClick: g((n) => s(w)(e), ["stop"]),
              onMouseenter: (n) => L(e),
              onMouseleave: (n) => R(e),
              onKeydown: a[1] || (a[1] = //@ts-ignore
              (...n) => s(c) && s(c)(...n))
            }, [
              r("div", xe, [
                e.icon ? (t(), i("span", Ce, m(e.icon), 1)) : d("", !0),
                r("span", $e, m(e.label), 1),
                (j = e.children) != null && j.length && l.value === "vertical" ? (t(), i("span", {
                  key: 1,
                  class: h(["nm-nav-menu__expand-icon", { "nm-nav-menu__expand-icon--expanded": s(f)(e.key) }]),
                  "aria-hidden": "true"
                }, [...a[4] || (a[4] = [
                  r("svg", {
                    width: "12",
                    height: "12",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    "stroke-width": "2.5",
                    "stroke-linecap": "round",
                    "stroke-linejoin": "round"
                  }, [
                    r("path", { d: "M9 18l6-6-6-6" })
                  ], -1)
                ])], 2)) : d("", !0)
              ]),
              N.value && l.value === "horizontal" && s(k)(e.key) ? (t(), i("span", Ne)) : d("", !0),
              (F = e.children) != null && F.length && l.value === "vertical" && s(f)(e.key) ? (t(), i("ul", {
                key: 1,
                class: "nm-nav-menu__submenu",
                role: "menu",
                "aria-label": e.label
              }, [
                (t(!0), i(y, null, K(e.children, (n) => (t(), i("li", {
                  key: n.key,
                  class: h(["nm-nav-menu__item nm-nav-menu__item--sub", {
                    "nm-nav-menu__item--active": s(k)(n.key),
                    "nm-nav-menu__item--disabled": n.disabled
                  }]),
                  role: "menuitem",
                  "aria-disabled": n.disabled ?? !1,
                  tabindex: n.disabled ? -1 : 0,
                  onClick: g((_) => s(w)(n), ["stop"]),
                  onMouseenter: (_) => s(z)(n)
                }, [
                  r("div", Ee, [
                    n.icon ? (t(), i("span", Ke, m(n.icon), 1)) : d("", !0),
                    r("span", Be, m(n.label), 1)
                  ])
                ], 42, ze))), 128))
              ], 8, Ie)) : d("", !0)
            ], 42, ge)) : d("", !0)
          ], 64);
        }), 128)),
        x.items.length === 0 ? (t(), i("li", Se, "No navigation items")) : d("", !0)
      ], 8, me)
    ], 34));
  }
}), je = /* @__PURE__ */ ue(Te, [["__scopeId", "data-v-c4cfbbda"]]);
export {
  je as N
};

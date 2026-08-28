import { defineComponent as ee, computed as p, ref as I, openBlock as o, createElementBlock as s, unref as t, normalizeClass as h, createElementVNode as l, Fragment as f, renderList as z, createCommentVNode as d, createBlock as ne, withCtx as j, withModifiers as M, toDisplayString as m } from "vue";
import { useMenu as ae } from "../composables/useMenu.js";
import { u as oe } from "./createComponent-jnXBYqCm.js";
import { useTheme as te } from "../composables/useTheme.js";
import { N as se } from "./NeumorphismPopover-m8EjDIRe.js";
import { _ as ie } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismNavMenu.css';const le = ["aria-orientation"], de = {
  key: 0,
  class: "nm-nav-menu__divider",
  role: "separator"
}, re = ["aria-disabled", "aria-expanded", "tabindex", "onClick", "onMouseenter", "onMouseleave"], ue = { class: "nm-nav-menu__item-content" }, me = {
  key: 0,
  class: "nm-nav-menu__item-icon",
  "aria-hidden": "true"
}, ve = { class: "nm-nav-menu__item-label" }, ce = {
  key: 0,
  class: "nm-nav-menu__indicator",
  "aria-hidden": "true"
}, _e = ["aria-label", "onMouseleave"], pe = {
  key: 0,
  class: "nm-nav-menu__dropdown-divider",
  role: "separator"
}, he = ["aria-disabled", "tabindex", "onClick", "onMouseenter"], ke = {
  key: 0,
  class: "nm-nav-menu__dropdown-item-icon",
  "aria-hidden": "true"
}, be = { class: "nm-nav-menu__dropdown-item-label" }, fe = ["aria-disabled", "aria-haspopup", "aria-expanded", "tabindex", "onClick", "onMouseenter", "onMouseleave"], ye = { class: "nm-nav-menu__item-content" }, Me = {
  key: 0,
  class: "nm-nav-menu__item-icon",
  "aria-hidden": "true"
}, we = { class: "nm-nav-menu__item-label" }, ge = {
  key: 0,
  class: "nm-nav-menu__indicator",
  "aria-hidden": "true"
}, xe = ["aria-label"], Ce = ["aria-disabled", "tabindex", "onClick", "onMouseenter"], $e = { class: "nm-nav-menu__item-content" }, Ne = {
  key: 0,
  class: "nm-nav-menu__item-icon",
  "aria-hidden": "true"
}, Ie = { class: "nm-nav-menu__item-label" }, ze = {
  key: 0,
  class: "nm-nav-menu__empty"
}, Ke = /* @__PURE__ */ ee({
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
  setup(w, { emit: D }) {
    const v = w, K = D, { config: g, resolveProp: x } = oe(), { isDark: F } = te(), q = p(() => v.theme ? v.theme : F.value ? "dark" : "light"), r = p(
      () => {
        var a;
        return x(v.mode, (a = g.value.navMenu) == null ? void 0 : a.mode, "horizontal");
      }
    ), G = p(() => {
      var a;
      return x(v.size, (a = g.value.navMenu) == null ? void 0 : a.size, "medium");
    }), C = p(
      () => {
        var a;
        return x(v.showIndicator, (a = g.value.navMenu) == null ? void 0 : a.showIndicator, !0);
      }
    ), H = I(v.defaultActive ?? null), J = I([]), {
      handleKeydown: c,
      handleItemClick: y,
      handleItemEnter: $,
      isExpanded: k,
      isActive: b,
      expand: O,
      collapse: N
    } = ae({
      items: p(() => v.items),
      mode: r,
      activeKey: H,
      expandedKeys: J,
      onSelect: (a) => {
        K("select", a), K("item-click", a);
      }
    });
    let u = null;
    function E(a) {
      u && (clearTimeout(u), u = null), $(a);
    }
    function S(a) {
      var i;
      r.value === "horizontal" && ((i = a.children) != null && i.length) && (u = setTimeout(() => {
        N(a.key);
      }, 250));
    }
    function Q() {
      u && (clearTimeout(u), u = null);
    }
    function U(a) {
      u = setTimeout(() => {
        N(a.key);
      }, 250);
    }
    const W = I({});
    function X(a, i) {
      W.value[a] = i;
    }
    function Y(a, i) {
      i ? O(a.key) : N(a.key);
    }
    const Z = p(() => [
      "nm-nav-menu",
      `nm-nav-menu--${r.value}`,
      `nm-nav-menu--${G.value}`,
      `nm-nav-menu--theme-${q.value}`,
      {
        "nm-nav-menu--indicator": C.value
      }
    ]);
    function T(a) {
      return [
        "nm-nav-menu__item",
        {
          "nm-nav-menu__item--active": b(a.key),
          "nm-nav-menu__item--disabled": a.disabled,
          "nm-nav-menu__item--divided": a.divided,
          "nm-nav-menu__item--has-children": a.children && a.children.length > 0,
          "nm-nav-menu__item--expanded": k(a.key)
        }
      ];
    }
    return (a, i) => (o(), s("nav", {
      class: h(Z.value),
      role: "navigation",
      "aria-label": "Navigation menu",
      onKeydown: i[2] || (i[2] = //@ts-ignore
      (...e) => t(c) && t(c)(...e))
    }, [
      l("ul", {
        class: "nm-nav-menu__list",
        role: "menubar",
        "aria-orientation": r.value
      }, [
        (o(!0), s(f, null, z(w.items, (e) => {
          var B, V, L, P, R, A;
          return o(), s(f, {
            key: e.key
          }, [
            e.divided && r.value === "vertical" ? (o(), s("li", de)) : d("", !0),
            (B = e.children) != null && B.length && r.value === "horizontal" ? (o(), ne(se, {
              key: `${e.key}-popover`,
              ref_for: !0,
              ref: (n) => X(e.key, n),
              position: "bottom",
              trigger: "hover",
              offset: 4,
              "show-arrow": !1,
              disabled: e.disabled,
              onVisibleChange: (n) => Y(e, n)
            }, {
              content: j(() => [
                l("div", {
                  class: "nm-nav-menu__dropdown",
                  role: "menu",
                  "aria-label": e.label,
                  onMouseenter: Q,
                  onMouseleave: (n) => U(e),
                  onKeydown: i[0] || (i[0] = //@ts-ignore
                  (...n) => t(c) && t(c)(...n))
                }, [
                  (o(!0), s(f, null, z(e.children, (n) => (o(), s(f, {
                    key: n.key
                  }, [
                    n.divided ? (o(), s("div", pe)) : d("", !0),
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
                      onClick: M((_) => t(y)(n), ["stop"]),
                      onMouseenter: (_) => t($)(n)
                    }, [
                      n.icon ? (o(), s("span", ke, m(n.icon), 1)) : d("", !0),
                      l("span", be, m(n.label), 1)
                    ], 42, he)
                  ], 64))), 128))
                ], 40, _e)
              ]),
              default: j(() => [
                l("li", {
                  class: h(T(e)),
                  role: "menuitem",
                  "aria-disabled": e.disabled ?? !1,
                  "aria-haspopup": "menu",
                  "aria-expanded": t(k)(e.key),
                  tabindex: e.disabled ? -1 : 0,
                  onClick: M((n) => {
                    var _;
                    return (_ = e.children) != null && _.length ? void 0 : t(y)(e);
                  }, ["stop"]),
                  onMouseenter: (n) => E(e),
                  onMouseleave: (n) => S(e)
                }, [
                  l("div", ue, [
                    e.icon ? (o(), s("span", me, m(e.icon), 1)) : d("", !0),
                    l("span", ve, m(e.label), 1),
                    i[3] || (i[3] = l("span", {
                      class: "nm-nav-menu__dropdown-arrow",
                      "aria-hidden": "true"
                    }, [
                      l("svg", {
                        width: "10",
                        height: "10",
                        viewBox: "0 0 24 24",
                        fill: "none",
                        stroke: "currentColor",
                        "stroke-width": "2",
                        "stroke-linecap": "round",
                        "stroke-linejoin": "round"
                      }, [
                        l("path", { d: "M6 9l6 6 6-6" })
                      ])
                    ], -1))
                  ]),
                  C.value && t(b)(e.key) ? (o(), s("span", ce)) : d("", !0)
                ], 42, re)
              ]),
              _: 2
            }, 1032, ["disabled", "onVisibleChange"])) : d("", !0),
            !((V = e.children) != null && V.length) || r.value === "vertical" ? (o(), s("li", {
              key: 2,
              class: h(T(e)),
              role: "menuitem",
              "aria-disabled": e.disabled ?? !1,
              "aria-haspopup": (L = e.children) != null && L.length ? "menu" : void 0,
              "aria-expanded": (P = e.children) != null && P.length ? t(k)(e.key) : void 0,
              tabindex: e.disabled ? -1 : 0,
              onClick: M((n) => t(y)(e), ["stop"]),
              onMouseenter: (n) => E(e),
              onMouseleave: (n) => S(e),
              onKeydown: i[1] || (i[1] = //@ts-ignore
              (...n) => t(c) && t(c)(...n))
            }, [
              l("div", ye, [
                e.icon ? (o(), s("span", Me, m(e.icon), 1)) : d("", !0),
                l("span", we, m(e.label), 1),
                (R = e.children) != null && R.length && r.value === "vertical" ? (o(), s("span", {
                  key: 1,
                  class: h(["nm-nav-menu__expand-icon", { "nm-nav-menu__expand-icon--expanded": t(k)(e.key) }]),
                  "aria-hidden": "true"
                }, [...i[4] || (i[4] = [
                  l("svg", {
                    width: "12",
                    height: "12",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    "stroke-width": "2",
                    "stroke-linecap": "round",
                    "stroke-linejoin": "round"
                  }, [
                    l("path", { d: "M9 18l6-6-6-6" })
                  ], -1)
                ])], 2)) : d("", !0)
              ]),
              C.value && r.value === "horizontal" && t(b)(e.key) ? (o(), s("span", ge)) : d("", !0),
              (A = e.children) != null && A.length && r.value === "vertical" && t(k)(e.key) ? (o(), s("ul", {
                key: 1,
                class: "nm-nav-menu__submenu",
                role: "menu",
                "aria-label": e.label
              }, [
                (o(!0), s(f, null, z(e.children, (n) => (o(), s("li", {
                  key: n.key,
                  class: h(["nm-nav-menu__item nm-nav-menu__item--sub", {
                    "nm-nav-menu__item--active": t(b)(n.key),
                    "nm-nav-menu__item--disabled": n.disabled
                  }]),
                  role: "menuitem",
                  "aria-disabled": n.disabled ?? !1,
                  tabindex: n.disabled ? -1 : 0,
                  onClick: M((_) => t(y)(n), ["stop"]),
                  onMouseenter: (_) => t($)(n)
                }, [
                  l("div", $e, [
                    n.icon ? (o(), s("span", Ne, m(n.icon), 1)) : d("", !0),
                    l("span", Ie, m(n.label), 1)
                  ])
                ], 42, Ce))), 128))
              ], 8, xe)) : d("", !0)
            ], 42, fe)) : d("", !0)
          ], 64);
        }), 128)),
        w.items.length === 0 ? (o(), s("li", ze, "No navigation items")) : d("", !0)
      ], 8, le)
    ], 34));
  }
}), Pe = /* @__PURE__ */ ie(Ke, [["__scopeId", "data-v-8de3e3d9"]]);
export {
  Pe as N
};

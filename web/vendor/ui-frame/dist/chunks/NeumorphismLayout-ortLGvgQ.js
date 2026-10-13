import { defineComponent as q, computed as o, ref as S, openBlock as l, createElementBlock as t, normalizeStyle as g, normalizeClass as $, createElementVNode as n, withModifiers as N, renderSlot as u, createTextVNode as I, toDisplayString as O, unref as r, createCommentVNode as m, createVNode as P, Transition as j, withCtx as F } from "vue";
import { useLocale as G } from "../composables/useLocale.js";
import { useTouchDevice as J } from "../composables/useTouchDevice.js";
import { u as K } from "./createComponent-jnXBYqCm.js";
import { _ as Q } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismLayout.css';const R = {
  key: 0,
  class: "nm-layout__header"
}, U = { class: "nm-layout__header-left" }, X = ["aria-label"], Y = {
  width: "18",
  height: "18",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2"
}, Z = {
  key: 0,
  d: "M16 18l-6-6 6-6"
}, ee = {
  key: 1,
  d: "M8 18l6-6-6-6"
}, oe = { class: "nm-layout__header-center" }, le = { class: "nm-layout__header-right" }, te = { class: "nm-layout__body" }, ae = ["aria-label"], se = { class: "nm-layout__sider-inner" }, ie = {
  key: 1,
  class: "nm-layout__footer"
}, ne = /* @__PURE__ */ q({
  __name: "NeumorphismLayout",
  props: {
    showHeader: { type: Boolean, default: void 0 },
    showSider: { type: Boolean, default: void 0 },
    siderWidth: {},
    collapsible: { type: Boolean, default: void 0 },
    defaultCollapsed: { type: Boolean, default: !1 },
    collapsedWidth: {},
    mobileAutoCollapse: { type: Boolean, default: void 0 },
    height: { default: "100vh" }
  },
  emits: ["collapse"],
  setup(b, { emit: B }) {
    const a = b, { config: d, resolveProp: c } = K(), W = o(
      () => {
        var e;
        return c(a.showHeader, (e = d.value.layout) == null ? void 0 : e.showHeader, !0);
      }
    ), _ = o(
      () => {
        var e;
        return c(a.showSider, (e = d.value.layout) == null ? void 0 : e.showSider, !1);
      }
    ), M = o(
      () => {
        var e;
        return c(a.siderWidth, (e = d.value.layout) == null ? void 0 : e.siderWidth, 240);
      }
    ), L = o(
      () => {
        var e;
        return c(a.collapsible, (e = d.value.layout) == null ? void 0 : e.collapsible, !1);
      }
    ), A = o(
      () => {
        var e;
        return c(a.collapsedWidth, (e = d.value.layout) == null ? void 0 : e.collapsedWidth, 64);
      }
    ), D = o(
      () => {
        var e;
        return c(a.mobileAutoCollapse, (e = d.value.layout) == null ? void 0 : e.mobileAutoCollapse, !0);
      }
    ), H = B, { isMobile: s } = J(), p = S(a.defaultCollapsed), i = S(!1), v = o(() => D.value && s.value ? !0 : p.value);
    function T() {
      s.value ? i.value = !i.value : (p.value = !p.value, H("collapse", p.value));
    }
    const { t: h } = G();
    function C() {
      i.value = !1;
    }
    function V() {
      s.value && i.value && C();
    }
    const E = o(() => [
      "nm-layout",
      {
        "nm-layout--has-sider": _.value,
        "nm-layout--sider-collapsed": v.value,
        "nm-layout--mobile": s.value,
        "nm-layout--drawer-open": i.value
      }
    ]), x = o(() => ({
      width: v.value ? `${A.value}px` : `${M.value}px`
    }));
    return (e, y) => (l(), t("div", {
      class: $(E.value),
      style: g({ "--nm-layout-height": b.height })
    }, [
      n("a", {
        class: "nm-layout__skip-nav",
        href: "#nm-layout-content",
        onClick: y[0] || (y[0] = N(
          (z) => {
            var k, w;
            const f = (w = (k = z.target) == null ? void 0 : k.closest(".nm-layout")) == null ? void 0 : w.querySelector("#nm-layout-content");
            f == null || f.focus();
          },
          ["prevent"]
        ))
      }, [
        u(e.$slots, "skip-nav", {}, () => [
          I(O(r(h)("layoutSkipNav") || "跳转到主内容"), 1)
        ], !0)
      ]),
      W.value ? (l(), t("header", R, [
        n("div", U, [
          _.value && L.value ? (l(), t("button", {
            key: 0,
            class: "nm-layout__collapse-btn",
            type: "button",
            "aria-label": v.value ? r(h)("layoutExpandSider") : r(h)("layoutCollapseSider"),
            onClick: T
          }, [
            (l(), t("svg", Y, [
              v.value ? (l(), t("path", Z)) : (l(), t("path", ee))
            ]))
          ], 8, X)) : m("", !0),
          u(e.$slots, "header-left", {}, void 0, !0)
        ]),
        n("div", oe, [
          u(e.$slots, "header-center", {}, void 0, !0)
        ]),
        n("div", le, [
          u(e.$slots, "header-right", {}, void 0, !0)
        ])
      ])) : m("", !0),
      n("div", te, [
        P(j, { name: "nm-layout-fade" }, {
          default: F(() => [
            r(s) && i.value ? (l(), t("div", {
              key: 0,
              class: "nm-layout__drawer-overlay",
              onClick: C,
              onTouchmove: y[1] || (y[1] = N(() => {
              }, ["prevent"]))
            }, null, 32)) : m("", !0)
          ]),
          _: 1
        }),
        _.value ? (l(), t("aside", {
          key: 0,
          class: $(["nm-layout__sider", {
            "nm-layout__sider--drawer": r(s),
            "nm-layout__sider--open": i.value
          }]),
          role: "navigation",
          "aria-label": r(h)("layoutSiderLabel"),
          style: g(r(s) ? void 0 : x.value)
        }, [
          n("div", se, [
            u(e.$slots, "sider", { collapsed: v.value }, void 0, !0)
          ])
        ], 14, ae)) : m("", !0),
        n("main", {
          id: "nm-layout-content",
          class: "nm-layout__content",
          tabindex: "-1",
          onClick: V
        }, [
          u(e.$slots, "default", {}, void 0, !0)
        ])
      ]),
      e.$slots.footer ? (l(), t("footer", ie, [
        u(e.$slots, "footer", {}, void 0, !0)
      ])) : m("", !0)
    ], 6));
  }
}), me = /* @__PURE__ */ Q(ne, [["__scopeId", "data-v-db7ef064"]]);
export {
  me as N
};

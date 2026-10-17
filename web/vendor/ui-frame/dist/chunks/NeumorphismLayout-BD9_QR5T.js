import { defineComponent as x, computed as o, ref as k, openBlock as d, createElementBlock as c, normalizeStyle as g, normalizeClass as N, createElementVNode as s, withModifiers as $, renderSlot as i, createTextVNode as O, toDisplayString as P, unref as u, createVNode as W, createCommentVNode as m, Transition as j, withCtx as F } from "vue";
import { useLocale as G } from "../composables/useLocale.js";
import { useTouchDevice as J } from "../composables/useTouchDevice.js";
import { u as K } from "./createComponent-jnXBYqCm.js";
import { N as Q } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as R } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismLayout.css';const U = {
  key: 0,
  class: "nm-layout__header"
}, X = { class: "nm-layout__header-left" }, Y = ["aria-label"], Z = { class: "nm-layout__header-center" }, ee = { class: "nm-layout__header-right" }, oe = { class: "nm-layout__body" }, le = ["aria-label"], te = { class: "nm-layout__sider-inner" }, ae = {
  key: 1,
  class: "nm-layout__footer"
}, se = /* @__PURE__ */ x({
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
    const l = b, { config: n, resolveProp: r } = K(), L = o(
      () => {
        var e;
        return r(l.showHeader, (e = n.value.layout) == null ? void 0 : e.showHeader, !0);
      }
    ), f = o(
      () => {
        var e;
        return r(l.showSider, (e = n.value.layout) == null ? void 0 : e.showSider, !1);
      }
    ), A = o(
      () => {
        var e;
        return r(l.siderWidth, (e = n.value.layout) == null ? void 0 : e.siderWidth, 240);
      }
    ), D = o(
      () => {
        var e;
        return r(l.collapsible, (e = n.value.layout) == null ? void 0 : e.collapsible, !1);
      }
    ), H = o(
      () => {
        var e;
        return r(l.collapsedWidth, (e = n.value.layout) == null ? void 0 : e.collapsedWidth, 64);
      }
    ), M = o(
      () => {
        var e;
        return r(l.mobileAutoCollapse, (e = n.value.layout) == null ? void 0 : e.mobileAutoCollapse, !0);
      }
    ), T = B, { isMobile: t } = J(), p = k(l.defaultCollapsed), a = k(!1), v = o(() => M.value && t.value ? !0 : p.value);
    function V() {
      t.value ? a.value = !a.value : (p.value = !p.value, T("collapse", p.value));
    }
    const { t: y } = G();
    function C() {
      a.value = !1;
    }
    function z() {
      t.value && a.value && C();
    }
    const E = o(() => [
      "nm-layout",
      {
        "nm-layout--has-sider": f.value,
        "nm-layout--sider-collapsed": v.value,
        "nm-layout--mobile": t.value,
        "nm-layout--drawer-open": a.value
      }
    ]), I = o(() => ({
      width: v.value ? `${H.value}px` : `${A.value}px`
    }));
    return (e, h) => (d(), c("div", {
      class: N(E.value),
      style: g({ "--nm-layout-height": b.height })
    }, [
      s("a", {
        class: "nm-layout__skip-nav",
        href: "#nm-layout-content",
        onClick: h[0] || (h[0] = $(
          (q) => {
            var S, w;
            const _ = (w = (S = q.target) == null ? void 0 : S.closest(".nm-layout")) == null ? void 0 : w.querySelector("#nm-layout-content");
            _ == null || _.focus();
          },
          ["prevent"]
        ))
      }, [
        i(e.$slots, "skip-nav", {}, () => [
          O(P(u(y)("layoutSkipNav") || "跳转到主内容"), 1)
        ], !0)
      ]),
      L.value ? (d(), c("header", U, [
        s("div", X, [
          f.value && D.value ? (d(), c("button", {
            key: 0,
            class: "nm-layout__collapse-btn",
            type: "button",
            "aria-label": v.value ? u(y)("layoutExpandSider") : u(y)("layoutCollapseSider"),
            onClick: V
          }, [
            W(Q, {
              name: v.value ? "chevron-right" : "chevron-left",
              size: "lg"
            }, null, 8, ["name"])
          ], 8, Y)) : m("", !0),
          i(e.$slots, "header-left", {}, void 0, !0)
        ]),
        s("div", Z, [
          i(e.$slots, "header-center", {}, void 0, !0)
        ]),
        s("div", ee, [
          i(e.$slots, "header-right", {}, void 0, !0)
        ])
      ])) : m("", !0),
      s("div", oe, [
        W(j, { name: "nm-layout-fade" }, {
          default: F(() => [
            u(t) && a.value ? (d(), c("div", {
              key: 0,
              class: "nm-layout__drawer-overlay",
              onClick: C,
              onTouchmove: h[1] || (h[1] = $(() => {
              }, ["prevent"]))
            }, null, 32)) : m("", !0)
          ]),
          _: 1
        }),
        f.value ? (d(), c("aside", {
          key: 0,
          class: N(["nm-layout__sider", {
            "nm-layout__sider--drawer": u(t),
            "nm-layout__sider--open": a.value
          }]),
          role: "navigation",
          "aria-label": u(y)("layoutSiderLabel"),
          style: g(u(t) ? void 0 : I.value)
        }, [
          s("div", te, [
            i(e.$slots, "sider", { collapsed: v.value }, void 0, !0)
          ])
        ], 14, le)) : m("", !0),
        s("main", {
          id: "nm-layout-content",
          class: "nm-layout__content",
          tabindex: "-1",
          onClick: z
        }, [
          i(e.$slots, "default", {}, void 0, !0)
        ])
      ]),
      e.$slots.footer ? (d(), c("footer", ae, [
        i(e.$slots, "footer", {}, void 0, !0)
      ])) : m("", !0)
    ], 6));
  }
}), ve = /* @__PURE__ */ R(se, [["__scopeId", "data-v-006e9573"]]);
export {
  ve as N
};

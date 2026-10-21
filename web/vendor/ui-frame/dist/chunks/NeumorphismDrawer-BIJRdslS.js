import { defineComponent as L, computed as l, ref as H, watch as h, nextTick as P, openBlock as a, createBlock as W, Teleport as Z, createVNode as m, Transition as p, withCtx as b, unref as n, createElementBlock as r, withModifiers as j, normalizeStyle as k, normalizeClass as v, createElementVNode as C, toDisplayString as q, createCommentVNode as s, renderSlot as u } from "vue";
import { useDrawer as A } from "../composables/useDrawer.js";
import { useLocale as F } from "../composables/useLocale.js";
import { generateId as _ } from "../utils/index.js";
import { N as G } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as J } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismDrawer.css';const Q = ["aria-labelledby", "aria-label"], U = { class: "nm-drawer__header" }, X = ["aria-label"], Y = {
  key: 0,
  class: "nm-drawer__footer"
}, ee = /* @__PURE__ */ L({
  __name: "NeumorphismDrawer",
  props: {
    modelValue: { type: Boolean, default: !1 },
    position: { default: "right" },
    title: {},
    width: {},
    maskClosable: { type: Boolean, default: !0 },
    closable: { type: Boolean, default: !0 },
    showClose: { type: Boolean, default: !0 },
    destroyOnClose: { type: Boolean, default: !1 }
  },
  emits: ["update:modelValue", "open", "close"],
  setup(t, { emit: V }) {
    const o = t, i = V, g = l({
      get: () => o.modelValue,
      set: (e) => i("update:modelValue", e)
    }), {
      isOpen: d,
      rendered: x,
      close: B,
      handleKeydown: N,
      handleMaskClick: $,
      focusDrawer: I,
      overlayZIndex: z
    } = A({
      modelValue: g,
      maskClosable: l(() => o.maskClosable),
      closable: l(() => o.closable),
      destroyOnClose: l(() => o.destroyOnClose)
    }), c = H(), f = `nm-drawer-title-${_()}`, w = `nm-drawer-content-${_()}`, { t: D } = F(), y = l(() => D("drawerClose")), K = l(() => {
      if (o.width != null) return O(o.width);
      const e = o.position;
      return e === "left" || e === "right" ? "320px" : "240px";
    });
    function O(e) {
      return typeof e == "number" ? `${e}px` : e;
    }
    h(d, async (e) => {
      e && (await P(), I(c.value));
    }), h(
      () => o.modelValue,
      (e) => {
        i(e ? "open" : "close");
      }
    );
    function S() {
      $();
    }
    function M() {
      B();
    }
    function R(e) {
      N(e, c.value);
    }
    const T = l(() => o.position === "left" || o.position === "right"), E = l(() => {
      const e = K.value;
      return T.value ? { width: e } : { height: e };
    });
    return (e, oe) => (a(), W(Z, { to: "body" }, [
      m(p, { name: "nm-drawer-fade" }, {
        default: b(() => [
          n(x) ? (a(), r("div", {
            key: 0,
            class: v(["nm-drawer__mask", { "nm-drawer__mask--visible": n(d) }]),
            style: k({ zIndex: n(z) }),
            onClick: j(S, ["self"])
          }, [
            m(p, { name: "nm-drawer-slide" }, {
              default: b(() => [
                n(d) ? (a(), r("div", {
                  key: 0,
                  ref_key: "drawerRef",
                  ref: c,
                  class: v(["nm-drawer", `nm-drawer--${t.position}`]),
                  style: k(E.value),
                  role: "dialog",
                  "aria-modal": "true",
                  "aria-labelledby": t.title ? f : void 0,
                  "aria-label": t.title ? void 0 : y.value || "Drawer",
                  "aria-describedby": w,
                  tabindex: "-1",
                  onKeydown: R
                }, [
                  C("div", U, [
                    t.title ? (a(), r("h2", {
                      key: 0,
                      id: f,
                      class: "nm-drawer__title"
                    }, q(t.title), 1)) : s("", !0),
                    u(e.$slots, "header", {}, void 0, !0),
                    t.showClose && t.closable ? (a(), r("button", {
                      key: 1,
                      class: "nm-drawer__close",
                      "aria-label": y.value,
                      type: "button",
                      onClick: M
                    }, [
                      m(G, {
                        name: "close",
                        size: "lg"
                      })
                    ], 8, X)) : s("", !0)
                  ]),
                  C("div", {
                    id: w,
                    class: "nm-drawer__body"
                  }, [
                    u(e.$slots, "default", {}, void 0, !0)
                  ]),
                  e.$slots.footer ? (a(), r("div", Y, [
                    u(e.$slots, "footer", {}, void 0, !0)
                  ])) : s("", !0)
                ], 46, Q)) : s("", !0)
              ]),
              _: 3
            })
          ], 6)) : s("", !0)
        ]),
        _: 3
      })
    ]));
  }
}), ie = /* @__PURE__ */ J(ee, [["__scopeId", "data-v-00425a52"]]);
export {
  ie as N
};

import { defineComponent as H, computed as l, ref as P, watch as p, nextTick as W, openBlock as a, createBlock as Z, Teleport as j, createVNode as b, Transition as k, withCtx as v, unref as s, createElementBlock as r, withModifiers as q, normalizeStyle as C, normalizeClass as _, createElementVNode as i, toDisplayString as A, createCommentVNode as n, renderSlot as m } from "vue";
import { useDrawer as F } from "../composables/useDrawer.js";
import { useLocale as G } from "../composables/useLocale.js";
import { generateId as g } from "../utils/index.js";
import { _ as J } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismDrawer.css';const Q = ["aria-labelledby", "aria-label"], U = { class: "nm-drawer__header" }, X = ["aria-label"], Y = {
  key: 0,
  class: "nm-drawer__footer"
}, ee = /* @__PURE__ */ H({
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
  setup(o, { emit: V }) {
    const t = o, d = V, x = l({
      get: () => t.modelValue,
      set: (e) => d("update:modelValue", e)
    }), {
      isOpen: c,
      rendered: B,
      close: $,
      handleKeydown: D,
      handleMaskClick: I,
      focusDrawer: N,
      overlayZIndex: z
    } = F({
      modelValue: x,
      maskClosable: l(() => t.maskClosable),
      closable: l(() => t.closable),
      destroyOnClose: l(() => t.destroyOnClose)
    }), u = P(), f = `nm-drawer-title-${g()}`, w = `nm-drawer-content-${g()}`, { t: M } = G(), y = l(() => M("drawerClose")), K = l(() => {
      if (t.width != null) return O(t.width);
      const e = t.position;
      return e === "left" || e === "right" ? "320px" : "240px";
    });
    function O(e) {
      return typeof e == "number" ? `${e}px` : e;
    }
    p(c, async (e) => {
      e && (await W(), N(u.value));
    }), p(
      () => t.modelValue,
      (e) => {
        d(e ? "open" : "close");
      }
    );
    function S() {
      I();
    }
    function L() {
      $();
    }
    function R(e) {
      D(e, u.value);
    }
    const T = l(() => t.position === "left" || t.position === "right"), E = l(() => {
      const e = K.value;
      return T.value ? { width: e } : { height: e };
    });
    return (e, h) => (a(), Z(j, { to: "body" }, [
      b(k, { name: "nm-drawer-fade" }, {
        default: v(() => [
          s(B) ? (a(), r("div", {
            key: 0,
            class: _(["nm-drawer__mask", { "nm-drawer__mask--visible": s(c) }]),
            style: C({ zIndex: s(z) }),
            onClick: q(S, ["self"])
          }, [
            b(k, { name: "nm-drawer-slide" }, {
              default: v(() => [
                s(c) ? (a(), r("div", {
                  key: 0,
                  ref_key: "drawerRef",
                  ref: u,
                  class: _(["nm-drawer", `nm-drawer--${o.position}`]),
                  style: C(E.value),
                  role: "dialog",
                  "aria-modal": "true",
                  "aria-labelledby": o.title ? f : void 0,
                  "aria-label": o.title ? void 0 : y.value || "Drawer",
                  "aria-describedby": w,
                  tabindex: "-1",
                  onKeydown: R
                }, [
                  i("div", U, [
                    o.title ? (a(), r("h2", {
                      key: 0,
                      id: f,
                      class: "nm-drawer__title"
                    }, A(o.title), 1)) : n("", !0),
                    m(e.$slots, "header", {}, void 0, !0),
                    o.showClose && o.closable ? (a(), r("button", {
                      key: 1,
                      class: "nm-drawer__close",
                      "aria-label": y.value,
                      type: "button",
                      onClick: L
                    }, [...h[0] || (h[0] = [
                      i("svg", {
                        width: "18",
                        height: "18",
                        viewBox: "0 0 24 24",
                        fill: "none",
                        stroke: "currentColor",
                        "stroke-width": "2"
                      }, [
                        i("path", { d: "M18 6L6 18M6 6l12 12" })
                      ], -1)
                    ])], 8, X)) : n("", !0)
                  ]),
                  i("div", {
                    id: w,
                    class: "nm-drawer__body"
                  }, [
                    m(e.$slots, "default", {}, void 0, !0)
                  ]),
                  e.$slots.footer ? (a(), r("div", Y, [
                    m(e.$slots, "footer", {}, void 0, !0)
                  ])) : n("", !0)
                ], 46, Q)) : n("", !0)
              ]),
              _: 3
            })
          ], 6)) : n("", !0)
        ]),
        _: 3
      })
    ]));
  }
}), ne = /* @__PURE__ */ J(ee, [["__scopeId", "data-v-7674c9b5"]]);
export {
  ne as N
};

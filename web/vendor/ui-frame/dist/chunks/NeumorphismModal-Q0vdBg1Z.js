import { defineComponent as J, computed as o, watch as L, ref as P, nextTick as Q, openBlock as n, createBlock as ee, Teleport as oe, createVNode as y, Transition as x, withCtx as M, unref as c, createElementBlock as i, withModifiers as le, normalizeStyle as B, normalizeClass as I, createElementVNode as r, toDisplayString as _, createCommentVNode as m, renderSlot as C } from "vue";
import { useModal as ae } from "../composables/useModal.js";
import { useConfig as te } from "../composables/useConfig.js";
import { useLocale as ne } from "../composables/useLocale.js";
import { generateId as N } from "../utils/index.js";
import { N as se } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as de } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismModal.css';const ie = ["aria-labelledby", "aria-label"], me = { class: "nm-modal__header" }, ce = ["aria-label"], re = {
  key: 0,
  class: "nm-modal__footer"
}, V = 560, ue = /* @__PURE__ */ J({
  __name: "NeumorphismModal",
  props: {
    modelValue: { type: Boolean, default: !1 },
    title: {},
    size: {},
    closable: { type: Boolean, default: void 0 },
    maskClosable: { type: Boolean, default: void 0 },
    showClose: { type: Boolean, default: void 0 },
    destroyOnClose: { type: Boolean, default: void 0 },
    footer: { type: Boolean, default: !0 },
    closeLabel: {},
    cancelLabel: {},
    confirmLabel: {}
  },
  emits: ["update:modelValue", "open", "close", "confirm", "cancel"],
  setup(a, { emit: z }) {
    const l = a, { t: u } = ne(), s = te(), D = { small: 400, medium: 560, large: 720 }, T = o(() => {
      var w;
      const e = l.size ?? ((w = s.value.modal) == null ? void 0 : w.size) ?? V, d = typeof e == "number" ? e : D[e];
      return Number.isFinite(d) ? Math.max(240, d) : V;
    }), $ = o(() => ({ maxWidth: `${T.value}px` })), f = o(() => {
      var e;
      return l.closable ?? ((e = s.value.modal) == null ? void 0 : e.closable) ?? !0;
    }), O = o(
      () => {
        var e;
        return l.maskClosable ?? ((e = s.value.modal) == null ? void 0 : e.maskClosable) ?? !0;
      }
    ), S = o(() => {
      var e;
      return l.showClose ?? ((e = s.value.modal) == null ? void 0 : e.showClose) ?? !0;
    }), A = o(
      () => {
        var e;
        return l.destroyOnClose ?? ((e = s.value.modal) == null ? void 0 : e.destroyOnClose) ?? !1;
      }
    ), E = o(() => l.closeLabel || u("modalClose")), K = o(() => l.cancelLabel || u("modalCancel")), W = o(() => l.confirmLabel || u("modalConfirm")), t = z, R = o({
      get: () => l.modelValue,
      set: (e) => t("update:modelValue", e)
    });
    L(
      () => l.modelValue,
      (e, d) => {
        e !== d && t(e ? "open" : "close");
      }
    );
    const {
      visible: b,
      rendered: F,
      close: p,
      confirm: H,
      handleKeydown: X,
      focusDialog: G,
      overlayZIndex: U
    } = ae({
      modelValue: R,
      closable: f,
      destroyOnClose: A
    }), v = P(), h = `nm-modal-title-${N()}`, k = `nm-modal-content-${N()}`;
    L(b, async (e) => {
      e && (await Q(), G(v.value));
    });
    function Y() {
      O.value && f.value && (p(), t("cancel"));
    }
    function g() {
      p(), t("cancel");
    }
    function Z() {
      t("confirm"), H();
    }
    function j(e) {
      X(e, v.value);
    }
    const q = o(() => ["nm-modal"]);
    return (e, d) => (n(), ee(oe, { to: "body" }, [
      y(x, { name: "nm-modal-fade" }, {
        default: M(() => [
          c(F) ? (n(), i("div", {
            key: 0,
            class: I(["nm-modal__mask", { "nm-modal__mask--visible": c(b) }]),
            style: B({ zIndex: c(U) }),
            onClick: le(Y, ["self"])
          }, [
            y(x, { name: "nm-modal-scale" }, {
              default: M(() => [
                c(b) ? (n(), i("div", {
                  key: 0,
                  ref_key: "dialogRef",
                  ref: v,
                  class: I(q.value),
                  style: B($.value),
                  role: "dialog",
                  "aria-modal": "true",
                  "aria-labelledby": a.title ? h : void 0,
                  "aria-label": a.title ? void 0 : "Dialog",
                  "aria-describedby": k,
                  tabindex: "-1",
                  onKeydown: j
                }, [
                  r("div", me, [
                    a.title ? (n(), i("h2", {
                      key: 0,
                      id: h,
                      class: "nm-modal__title"
                    }, _(a.title), 1)) : m("", !0),
                    C(e.$slots, "header", {}, void 0, !0),
                    S.value && f.value ? (n(), i("button", {
                      key: 1,
                      class: "nm-modal__close",
                      "aria-label": E.value,
                      type: "button",
                      onClick: g
                    }, [
                      y(se, {
                        name: "close",
                        size: "lg"
                      })
                    ], 8, ce)) : m("", !0)
                  ]),
                  r("div", {
                    id: k,
                    class: "nm-modal__body"
                  }, [
                    C(e.$slots, "default", {}, void 0, !0)
                  ]),
                  a.footer ? (n(), i("div", re, [
                    C(e.$slots, "footer", {}, () => [
                      r("button", {
                        class: "nm-modal__btn nm-modal__btn--cancel",
                        type: "button",
                        onClick: g
                      }, _(K.value), 1),
                      r("button", {
                        class: "nm-modal__btn nm-modal__btn--confirm",
                        type: "button",
                        onClick: Z
                      }, _(W.value), 1)
                    ], !0)
                  ])) : m("", !0)
                ], 46, ie)) : m("", !0)
              ]),
              _: 3
            })
          ], 6)) : m("", !0)
        ]),
        _: 3
      })
    ]));
  }
}), he = /* @__PURE__ */ de(ue, [["__scopeId", "data-v-baa0b3a0"]]);
export {
  he as N
};

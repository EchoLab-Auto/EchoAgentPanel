import { defineComponent as H, computed as l, watch as g, ref as J, nextTick as P, openBlock as n, createBlock as Q, Teleport as U, createVNode as v, Transition as L, withCtx as B, unref as m, createElementBlock as d, withModifiers as W, normalizeStyle as X, normalizeClass as V, createElementVNode as c, toDisplayString as y, createCommentVNode as i, renderSlot as C } from "vue";
import { useModal as Y } from "../composables/useModal.js";
import { useConfig as ee } from "../composables/useConfig.js";
import { useLocale as oe } from "../composables/useLocale.js";
import { generateId as z } from "../utils/index.js";
import { N as le } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as ae } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismModal.css';const te = ["aria-labelledby", "aria-label"], ne = { class: "nm-modal__header" }, se = ["aria-label"], de = {
  key: 0,
  class: "nm-modal__footer"
}, ie = /* @__PURE__ */ H({
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
  setup(a, { emit: N }) {
    const o = a, { t: r } = oe(), s = ee(), I = l(() => {
      var e;
      return o.size ?? ((e = s.value.modal) == null ? void 0 : e.size) ?? "medium";
    }), u = l(() => {
      var e;
      return o.closable ?? ((e = s.value.modal) == null ? void 0 : e.closable) ?? !0;
    }), M = l(
      () => {
        var e;
        return o.maskClosable ?? ((e = s.value.modal) == null ? void 0 : e.maskClosable) ?? !0;
      }
    ), $ = l(() => {
      var e;
      return o.showClose ?? ((e = s.value.modal) == null ? void 0 : e.showClose) ?? !0;
    }), x = l(
      () => {
        var e;
        return o.destroyOnClose ?? ((e = s.value.modal) == null ? void 0 : e.destroyOnClose) ?? !1;
      }
    ), O = l(() => o.closeLabel || r("modalClose")), S = l(() => o.cancelLabel || r("modalCancel")), D = l(() => o.confirmLabel || r("modalConfirm")), t = N, K = l({
      get: () => o.modelValue,
      set: (e) => t("update:modelValue", e)
    });
    g(
      () => o.modelValue,
      (e, w) => {
        e !== w && t(e ? "open" : "close");
      }
    );
    const {
      visible: f,
      rendered: R,
      close: _,
      confirm: T,
      handleKeydown: E,
      focusDialog: Z,
      overlayZIndex: j
    } = Y({
      modelValue: K,
      closable: u,
      destroyOnClose: x
    }), b = J(), p = `nm-modal-title-${z()}`, h = `nm-modal-content-${z()}`;
    g(f, async (e) => {
      e && (await P(), Z(b.value));
    });
    function q() {
      M.value && u.value && (_(), t("cancel"));
    }
    function k() {
      _(), t("cancel");
    }
    function A() {
      t("confirm"), T();
    }
    function F(e) {
      E(e, b.value);
    }
    const G = l(() => ["nm-modal", `nm-modal--${I.value}`]);
    return (e, w) => (n(), Q(U, { to: "body" }, [
      v(L, { name: "nm-modal-fade" }, {
        default: B(() => [
          m(R) ? (n(), d("div", {
            key: 0,
            class: V(["nm-modal__mask", { "nm-modal__mask--visible": m(f) }]),
            style: X({ zIndex: m(j) }),
            onClick: W(q, ["self"])
          }, [
            v(L, { name: "nm-modal-scale" }, {
              default: B(() => [
                m(f) ? (n(), d("div", {
                  key: 0,
                  ref_key: "dialogRef",
                  ref: b,
                  class: V(G.value),
                  role: "dialog",
                  "aria-modal": "true",
                  "aria-labelledby": a.title ? p : void 0,
                  "aria-label": a.title ? void 0 : "Dialog",
                  "aria-describedby": h,
                  tabindex: "-1",
                  onKeydown: F
                }, [
                  c("div", ne, [
                    a.title ? (n(), d("h2", {
                      key: 0,
                      id: p,
                      class: "nm-modal__title"
                    }, y(a.title), 1)) : i("", !0),
                    C(e.$slots, "header", {}, void 0, !0),
                    $.value && u.value ? (n(), d("button", {
                      key: 1,
                      class: "nm-modal__close",
                      "aria-label": O.value,
                      type: "button",
                      onClick: k
                    }, [
                      v(le, {
                        name: "close",
                        size: "lg"
                      })
                    ], 8, se)) : i("", !0)
                  ]),
                  c("div", {
                    id: h,
                    class: "nm-modal__body"
                  }, [
                    C(e.$slots, "default", {}, void 0, !0)
                  ]),
                  a.footer ? (n(), d("div", de, [
                    C(e.$slots, "footer", {}, () => [
                      c("button", {
                        class: "nm-modal__btn nm-modal__btn--cancel",
                        type: "button",
                        onClick: k
                      }, y(S.value), 1),
                      c("button", {
                        class: "nm-modal__btn nm-modal__btn--confirm",
                        type: "button",
                        onClick: A
                      }, y(D.value), 1)
                    ], !0)
                  ])) : i("", !0)
                ], 42, te)) : i("", !0)
              ]),
              _: 3
            })
          ], 6)) : i("", !0)
        ]),
        _: 3
      })
    ]));
  }
}), ye = /* @__PURE__ */ ae(ie, [["__scopeId", "data-v-d41fd722"]]);
export {
  ye as N
};

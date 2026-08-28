import { defineComponent as G, computed as o, ref as H, watch as J, nextTick as P, openBlock as t, createBlock as Q, Teleport as U, createVNode as w, Transition as g, withCtx as L, unref as r, createElementBlock as d, withModifiers as W, normalizeStyle as X, normalizeClass as B, createElementVNode as n, toDisplayString as v, createCommentVNode as i, renderSlot as y } from "vue";
import { useModal as Y } from "../composables/useModal.js";
import { useConfig as ee } from "../composables/useConfig.js";
import { useLocale as oe } from "../composables/useLocale.js";
import { generateId as M } from "../utils/index.js";
import { _ as le } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismModal.css';const ae = ["aria-labelledby", "aria-label"], te = { class: "nm-modal__header" }, ne = ["aria-label"], se = {
  key: 0,
  class: "nm-modal__footer"
}, de = /* @__PURE__ */ G({
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
  setup(a, { emit: V }) {
    const l = a, { t: c } = oe(), s = ee(), z = o(() => {
      var e;
      return l.size ?? ((e = s.value.modal) == null ? void 0 : e.size) ?? "medium";
    }), u = o(() => {
      var e;
      return l.closable ?? ((e = s.value.modal) == null ? void 0 : e.closable) ?? !0;
    }), x = o(
      () => {
        var e;
        return l.maskClosable ?? ((e = s.value.modal) == null ? void 0 : e.maskClosable) ?? !0;
      }
    ), I = o(() => {
      var e;
      return l.showClose ?? ((e = s.value.modal) == null ? void 0 : e.showClose) ?? !0;
    }), N = o(
      () => {
        var e;
        return l.destroyOnClose ?? ((e = s.value.modal) == null ? void 0 : e.destroyOnClose) ?? !1;
      }
    ), $ = o(() => l.closeLabel || c("modalClose")), O = o(() => l.cancelLabel || c("modalCancel")), S = o(() => l.confirmLabel || c("modalConfirm")), m = V, D = o({
      get: () => l.modelValue,
      set: (e) => m("update:modelValue", e)
    }), {
      visible: f,
      rendered: K,
      close: C,
      confirm: R,
      handleKeydown: T,
      focusDialog: E,
      overlayZIndex: Z
    } = Y({
      modelValue: D,
      closable: u,
      destroyOnClose: N
    }), b = H(), _ = `nm-modal-title-${M()}`, h = `nm-modal-content-${M()}`;
    J(f, async (e) => {
      e && (await P(), E(b.value));
    });
    function j() {
      x.value && u.value && (C(), m("cancel"));
    }
    function k() {
      C(), m("cancel");
    }
    function q() {
      m("confirm"), R();
    }
    function A(e) {
      T(e, b.value);
    }
    const F = o(() => ["nm-modal", `nm-modal--${z.value}`]);
    return (e, p) => (t(), Q(U, { to: "body" }, [
      w(g, { name: "nm-modal-fade" }, {
        default: L(() => [
          r(K) ? (t(), d("div", {
            key: 0,
            class: B(["nm-modal__mask", { "nm-modal__mask--visible": r(f) }]),
            style: X({ zIndex: r(Z) }),
            onClick: W(j, ["self"])
          }, [
            w(g, { name: "nm-modal-scale" }, {
              default: L(() => [
                r(f) ? (t(), d("div", {
                  key: 0,
                  ref_key: "dialogRef",
                  ref: b,
                  class: B(F.value),
                  role: "dialog",
                  "aria-modal": "true",
                  "aria-labelledby": a.title ? _ : void 0,
                  "aria-label": a.title ? void 0 : "Dialog",
                  "aria-describedby": h,
                  tabindex: "-1",
                  onKeydown: A
                }, [
                  n("div", te, [
                    a.title ? (t(), d("h2", {
                      key: 0,
                      id: _,
                      class: "nm-modal__title"
                    }, v(a.title), 1)) : i("", !0),
                    y(e.$slots, "header", {}, void 0, !0),
                    I.value && u.value ? (t(), d("button", {
                      key: 1,
                      class: "nm-modal__close",
                      "aria-label": $.value,
                      type: "button",
                      onClick: k
                    }, [...p[0] || (p[0] = [
                      n("svg", {
                        width: "18",
                        height: "18",
                        viewBox: "0 0 24 24",
                        fill: "none",
                        stroke: "currentColor",
                        "stroke-width": "2"
                      }, [
                        n("path", { d: "M18 6L6 18M6 6l12 12" })
                      ], -1)
                    ])], 8, ne)) : i("", !0)
                  ]),
                  n("div", {
                    id: h,
                    class: "nm-modal__body"
                  }, [
                    y(e.$slots, "default", {}, void 0, !0)
                  ]),
                  a.footer ? (t(), d("div", se, [
                    y(e.$slots, "footer", {}, () => [
                      n("button", {
                        class: "nm-modal__btn nm-modal__btn--cancel",
                        type: "button",
                        onClick: k
                      }, v(O.value), 1),
                      n("button", {
                        class: "nm-modal__btn nm-modal__btn--confirm",
                        type: "button",
                        onClick: q
                      }, v(S.value), 1)
                    ], !0)
                  ])) : i("", !0)
                ], 42, ae)) : i("", !0)
              ]),
              _: 3
            })
          ], 6)) : i("", !0)
        ]),
        _: 3
      })
    ]));
  }
}), be = /* @__PURE__ */ le(de, [["__scopeId", "data-v-0396d0ca"]]);
export {
  be as N
};

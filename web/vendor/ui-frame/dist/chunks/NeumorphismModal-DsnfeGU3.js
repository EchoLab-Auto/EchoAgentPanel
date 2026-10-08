import { defineComponent as H, computed as l, watch as w, ref as J, nextTick as P, openBlock as n, createBlock as Q, Teleport as U, createVNode as g, Transition as L, withCtx as B, unref as c, createElementBlock as i, withModifiers as W, normalizeStyle as X, normalizeClass as V, createElementVNode as s, toDisplayString as y, createCommentVNode as m, renderSlot as C } from "vue";
import { useModal as Y } from "../composables/useModal.js";
import { useConfig as ee } from "../composables/useConfig.js";
import { useLocale as oe } from "../composables/useLocale.js";
import { generateId as M } from "../utils/index.js";
import { _ as le } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismModal.css';const ae = ["aria-labelledby", "aria-label"], te = { class: "nm-modal__header" }, ne = ["aria-label"], se = {
  key: 0,
  class: "nm-modal__footer"
}, de = /* @__PURE__ */ H({
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
    const o = a, { t: u } = oe(), d = ee(), x = l(() => {
      var e;
      return o.size ?? ((e = d.value.modal) == null ? void 0 : e.size) ?? "medium";
    }), f = l(() => {
      var e;
      return o.closable ?? ((e = d.value.modal) == null ? void 0 : e.closable) ?? !0;
    }), I = l(
      () => {
        var e;
        return o.maskClosable ?? ((e = d.value.modal) == null ? void 0 : e.maskClosable) ?? !0;
      }
    ), N = l(() => {
      var e;
      return o.showClose ?? ((e = d.value.modal) == null ? void 0 : e.showClose) ?? !0;
    }), $ = l(
      () => {
        var e;
        return o.destroyOnClose ?? ((e = d.value.modal) == null ? void 0 : e.destroyOnClose) ?? !1;
      }
    ), O = l(() => o.closeLabel || u("modalClose")), S = l(() => o.cancelLabel || u("modalCancel")), D = l(() => o.confirmLabel || u("modalConfirm")), t = z, K = l({
      get: () => o.modelValue,
      set: (e) => t("update:modelValue", e)
    });
    w(
      () => o.modelValue,
      (e, r) => {
        e !== r && t(e ? "open" : "close");
      }
    );
    const {
      visible: b,
      rendered: R,
      close: _,
      confirm: T,
      handleKeydown: E,
      focusDialog: Z,
      overlayZIndex: j
    } = Y({
      modelValue: K,
      closable: f,
      destroyOnClose: $
    }), v = J(), h = `nm-modal-title-${M()}`, p = `nm-modal-content-${M()}`;
    w(b, async (e) => {
      e && (await P(), Z(v.value));
    });
    function q() {
      I.value && f.value && (_(), t("cancel"));
    }
    function k() {
      _(), t("cancel");
    }
    function A() {
      t("confirm"), T();
    }
    function F(e) {
      E(e, v.value);
    }
    const G = l(() => ["nm-modal", `nm-modal--${x.value}`]);
    return (e, r) => (n(), Q(U, { to: "body" }, [
      g(L, { name: "nm-modal-fade" }, {
        default: B(() => [
          c(R) ? (n(), i("div", {
            key: 0,
            class: V(["nm-modal__mask", { "nm-modal__mask--visible": c(b) }]),
            style: X({ zIndex: c(j) }),
            onClick: W(q, ["self"])
          }, [
            g(L, { name: "nm-modal-scale" }, {
              default: B(() => [
                c(b) ? (n(), i("div", {
                  key: 0,
                  ref_key: "dialogRef",
                  ref: v,
                  class: V(G.value),
                  role: "dialog",
                  "aria-modal": "true",
                  "aria-labelledby": a.title ? h : void 0,
                  "aria-label": a.title ? void 0 : "Dialog",
                  "aria-describedby": p,
                  tabindex: "-1",
                  onKeydown: F
                }, [
                  s("div", te, [
                    a.title ? (n(), i("h2", {
                      key: 0,
                      id: h,
                      class: "nm-modal__title"
                    }, y(a.title), 1)) : m("", !0),
                    C(e.$slots, "header", {}, void 0, !0),
                    N.value && f.value ? (n(), i("button", {
                      key: 1,
                      class: "nm-modal__close",
                      "aria-label": O.value,
                      type: "button",
                      onClick: k
                    }, [...r[0] || (r[0] = [
                      s("svg", {
                        width: "18",
                        height: "18",
                        viewBox: "0 0 24 24",
                        fill: "none",
                        stroke: "currentColor",
                        "stroke-width": "2"
                      }, [
                        s("path", { d: "M18 6L6 18M6 6l12 12" })
                      ], -1)
                    ])], 8, ne)) : m("", !0)
                  ]),
                  s("div", {
                    id: p,
                    class: "nm-modal__body"
                  }, [
                    C(e.$slots, "default", {}, void 0, !0)
                  ]),
                  a.footer ? (n(), i("div", se, [
                    C(e.$slots, "footer", {}, () => [
                      s("button", {
                        class: "nm-modal__btn nm-modal__btn--cancel",
                        type: "button",
                        onClick: k
                      }, y(S.value), 1),
                      s("button", {
                        class: "nm-modal__btn nm-modal__btn--confirm",
                        type: "button",
                        onClick: A
                      }, y(D.value), 1)
                    ], !0)
                  ])) : m("", !0)
                ], 42, ae)) : m("", !0)
              ]),
              _: 3
            })
          ], 6)) : m("", !0)
        ]),
        _: 3
      })
    ]));
  }
}), be = /* @__PURE__ */ le(de, [["__scopeId", "data-v-7fa701dd"]]);
export {
  be as N
};

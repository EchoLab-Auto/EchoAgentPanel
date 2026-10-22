import { defineComponent as $, computed as n, ref as F, openBlock as s, createElementBlock as i, normalizeClass as w, renderSlot as m, createBlock as _, withCtx as N, createTextVNode as z, toDisplayString as L, createCommentVNode as v, createElementVNode as g, createVNode as C, unref as r, withModifiers as P } from "vue";
import { N as D } from "../chunks/NeumorphismTextarea-BPesp-1r.js";
import { N as S } from "../chunks/NeumorphismButton-C7gkn79g.js";
import { useLocale as I } from "../composables/useLocale.js";
import { useChatInput as M } from "../composables/useChatInput.js";
import { n as U, g as j } from "../chunks/glass-BqY-XLAc.js";
import { _ as x } from "../chunks/_plugin-vue_export-helper-CHgC5LLL.js";
import { N as k } from "../chunks/NeumorphismIcon-CFyBR-Sk.js";
import { useClipboard as q } from "../composables/useClipboard.js";
import '../index.css';const A = {
  key: 0,
  class: "nm-chat-composer__meta"
}, H = { class: "nm-chat-composer__row" }, J = /* @__PURE__ */ $({
  __name: "ChatComposer",
  props: {
    modelValue: { default: "" },
    disabled: { type: Boolean, default: !1 },
    placeholder: { default: "" },
    cancelable: { type: Boolean, default: !1 },
    sendLabel: { default: "" },
    cancelLabel: { default: "" },
    rows: { default: 3 },
    autoResize: { type: Boolean, default: !0 },
    maxlength: { default: void 0 },
    glass: { type: [Boolean, String], default: void 0 },
    focusEffect: { default: "ring" }
  },
  emits: ["update:modelValue", "send", "cancel"],
  setup(e, { emit: p }) {
    const t = e, d = p, { t: c } = I(), l = n(() => t.placeholder || c("chatInputPlaceholder")), f = n(() => t.sendLabel || c("chatSend")), a = n(() => t.cancelLabel || c("chatCancel")), b = n(() => U(t.glass)), E = n(() => {
      const o = t.focusEffect;
      return ["ring", "glow", "inset", "none"].includes(o) ? o : "ring";
    }), y = F(!1);
    function O() {
      y.value = !0;
    }
    function T(o) {
      const u = o.relatedTarget, h = o.currentTarget;
      u && (h != null && h.contains(u)) || (y.value = !1);
    }
    const K = n(() => [
      "nm-chat-composer",
      `nm-chat-composer--focus-${E.value}`,
      ...j("nm-chat-composer", b.value),
      {
        "nm-chat-composer--disabled": t.disabled,
        "nm-chat-composer--glassed": !!b.value,
        "nm-chat-composer--focused": y.value
      }
    ]), R = n({
      get: () => t.modelValue,
      set: (o) => d("update:modelValue", o)
    }), { handleKeydown: G, submit: B, canSubmit: V } = M({
      modelValue: R,
      disabled: n(() => t.disabled),
      onSubmit: (o) => d("send", o)
    });
    return (o, u) => (s(), i("div", {
      class: w(K.value),
      onFocusin: O,
      onFocusout: T
    }, [
      o.$slots.meta || e.cancelable ? (s(), i("div", A, [
        m(o.$slots, "meta", {}, void 0, !0),
        e.cancelable ? (s(), _(S, {
          key: 0,
          class: "nm-chat-composer__cancel",
          size: "small",
          disabled: e.disabled,
          onClick: u[0] || (u[0] = (h) => d("cancel"))
        }, {
          default: N(() => [
            z(L(a.value), 1)
          ]),
          _: 1
        }, 8, ["disabled"])) : v("", !0)
      ])) : v("", !0),
      g("div", H, [
        C(D, {
          class: "nm-chat-composer__field",
          "model-value": e.modelValue,
          placeholder: l.value,
          disabled: e.disabled,
          rows: e.rows,
          "auto-resize": e.autoResize,
          maxlength: e.maxlength,
          "onUpdate:modelValue": u[1] || (u[1] = (h) => d("update:modelValue", h)),
          onKeydown: r(G)
        }, null, 8, ["model-value", "placeholder", "disabled", "rows", "auto-resize", "maxlength", "onKeydown"]),
        m(o.$slots, "actions", {
          submit: r(B),
          canSubmit: r(V)
        }, () => [
          C(S, {
            class: "nm-chat-composer__send",
            variant: "raised",
            shape: "pill",
            disabled: e.disabled || !r(V),
            onClick: r(B)
          }, {
            default: N(() => [
              z(L(f.value), 1)
            ]),
            _: 1
          }, 8, ["disabled", "onClick"])
        ], !0)
      ])
    ], 34));
  }
}), pe = /* @__PURE__ */ x(J, [["__scopeId", "data-v-40cb81b3"]]), Q = { class: "nm-chat-fold__head" }, W = ["aria-expanded"], X = {
  class: "nm-chat-fold__caret",
  "aria-hidden": "true"
}, Y = {
  key: 1,
  class: "nm-chat-fold__head-static"
}, Z = {
  key: 0,
  class: "nm-chat-fold__subhead"
}, ee = {
  key: 1,
  class: "nm-chat-fold__body"
}, te = /* @__PURE__ */ $({
  __name: "ChatFold",
  props: {
    open: { type: Boolean, default: void 0 },
    defaultOpen: { type: Boolean, default: !1 },
    sunk: { type: Boolean, default: !0 },
    expandable: { type: Boolean, default: !0 }
  },
  emits: ["update:open", "toggle"],
  setup(e, { emit: p }) {
    const t = e, d = p, c = F(t.defaultOpen), l = n(() => t.open ?? c.value);
    function f() {
      if (!t.expandable) return;
      const a = !l.value;
      t.open === void 0 && (c.value = a), d("update:open", a), d("toggle", a);
    }
    return (a, b) => (s(), i("div", {
      class: w(["nm-chat-fold", [
        e.sunk ? "nm-chat-fold--sunk" : "nm-chat-fold--raised",
        { "nm-chat-fold--open": l.value }
      ]])
    }, [
      g("div", Q, [
        e.expandable ? (s(), i("button", {
          key: 0,
          type: "button",
          class: "nm-chat-fold__trigger",
          "aria-expanded": l.value,
          onClick: f
        }, [
          g("span", X, [
            C(k, {
              name: l.value ? "chevron-down" : "chevron-right",
              size: "xs"
            }, null, 8, ["name"])
          ]),
          m(a.$slots, "head", { open: l.value }, void 0, !0)
        ], 8, W)) : (s(), i("div", Y, [
          m(a.$slots, "head", { open: l.value }, void 0, !0)
        ])),
        m(a.$slots, "actions", {}, void 0, !0)
      ]),
      a.$slots.subhead ? (s(), i("div", Z, [
        m(a.$slots, "subhead", {}, void 0, !0)
      ])) : v("", !0),
      e.expandable && l.value ? (s(), i("div", ee, [
        m(a.$slots, "default", {}, void 0, !0)
      ])) : v("", !0)
    ], 2));
  }
}), fe = /* @__PURE__ */ x(te, [["__scopeId", "data-v-beb3db96"]]), ae = ["aria-label", "title"], oe = /* @__PURE__ */ $({
  __name: "ChatCopyButton",
  props: {
    text: {}
  },
  setup(e) {
    const { t: p } = I(), { copied: t, copy: d } = q(), c = n(() => t.value ? p("chatCopied") : p("chatCopy"));
    return (l, f) => (s(), i("button", {
      type: "button",
      class: w(["nm-chat-copy", { "nm-chat-copy--copied": r(t) }]),
      "aria-label": c.value,
      title: c.value,
      onClick: f[0] || (f[0] = P((a) => r(d)(e.text), ["stop"]))
    }, [
      r(t) ? (s(), _(k, {
        key: 0,
        name: "check",
        size: "sm",
        "stroke-width": 3
      })) : (s(), _(k, {
        key: 1,
        name: "copy",
        size: "sm"
      }))
    ], 10, ae));
  }
}), he = /* @__PURE__ */ x(oe, [["__scopeId", "data-v-63e80f46"]]);
export {
  pe as ChatComposer,
  he as ChatCopyButton,
  fe as ChatFold
};

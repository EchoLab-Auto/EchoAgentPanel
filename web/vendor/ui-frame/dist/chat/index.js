import { defineComponent as C, computed as u, openBlock as o, createElementBlock as d, normalizeClass as k, renderSlot as m, createBlock as b, withCtx as V, createTextVNode as N, toDisplayString as z, createCommentVNode as f, createElementVNode as v, createVNode as y, unref as c, ref as O, withModifiers as K } from "vue";
import { N as R } from "../chunks/NeumorphismTextarea-D4alPN-q.js";
import { N as L } from "../chunks/NeumorphismButton-CTLPjGe-.js";
import { useLocale as S } from "../composables/useLocale.js";
import { useChatInput as E } from "../composables/useChatInput.js";
import { _ as $ } from "../chunks/_plugin-vue_export-helper-CHgC5LLL.js";
import { N as _ } from "../chunks/NeumorphismIcon-CFyBR-Sk.js";
import { useClipboard as F } from "../composables/useClipboard.js";
import '../index.css';const P = {
  key: 0,
  class: "nm-chat-composer__meta"
}, T = { class: "nm-chat-composer__row" }, D = /* @__PURE__ */ C({
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
    maxlength: { default: void 0 }
  },
  emits: ["update:modelValue", "send", "cancel"],
  setup(e, { emit: r }) {
    const t = e, s = r, { t: n } = S(), l = u(() => t.placeholder || n("chatInputPlaceholder")), p = u(() => t.sendLabel || n("chatSend")), a = u(() => t.cancelLabel || n("chatCancel")), g = u({
      get: () => t.modelValue,
      set: (i) => s("update:modelValue", i)
    }), { handleKeydown: I, submit: x, canSubmit: B } = E({
      modelValue: g,
      disabled: u(() => t.disabled),
      onSubmit: (i) => s("send", i)
    });
    return (i, h) => (o(), d("div", {
      class: k(["nm-chat-composer", { "nm-chat-composer--disabled": e.disabled }])
    }, [
      i.$slots.meta || e.cancelable ? (o(), d("div", P, [
        m(i.$slots, "meta", {}, void 0, !0),
        e.cancelable ? (o(), b(L, {
          key: 0,
          class: "nm-chat-composer__cancel",
          size: "small",
          disabled: e.disabled,
          onClick: h[0] || (h[0] = (w) => s("cancel"))
        }, {
          default: V(() => [
            N(z(a.value), 1)
          ]),
          _: 1
        }, 8, ["disabled"])) : f("", !0)
      ])) : f("", !0),
      v("div", T, [
        y(R, {
          class: "nm-chat-composer__field",
          "model-value": e.modelValue,
          placeholder: l.value,
          disabled: e.disabled,
          rows: e.rows,
          "auto-resize": e.autoResize,
          maxlength: e.maxlength,
          "onUpdate:modelValue": h[1] || (h[1] = (w) => s("update:modelValue", w)),
          onKeydown: c(I)
        }, null, 8, ["model-value", "placeholder", "disabled", "rows", "auto-resize", "maxlength", "onKeydown"]),
        m(i.$slots, "actions", {
          submit: c(x),
          canSubmit: c(B)
        }, () => [
          y(L, {
            class: "nm-chat-composer__send",
            variant: "raised",
            shape: "pill",
            disabled: e.disabled || !c(B),
            onClick: c(x)
          }, {
            default: V(() => [
              N(z(p.value), 1)
            ]),
            _: 1
          }, 8, ["disabled", "onClick"])
        ], !0)
      ])
    ], 2));
  }
}), le = /* @__PURE__ */ $(D, [["__scopeId", "data-v-c0c75efa"]]), M = { class: "nm-chat-fold__head" }, U = ["aria-expanded"], j = {
  class: "nm-chat-fold__caret",
  "aria-hidden": "true"
}, q = {
  key: 1,
  class: "nm-chat-fold__head-static"
}, A = {
  key: 0,
  class: "nm-chat-fold__subhead"
}, G = {
  key: 1,
  class: "nm-chat-fold__body"
}, H = /* @__PURE__ */ C({
  __name: "ChatFold",
  props: {
    open: { type: Boolean, default: void 0 },
    defaultOpen: { type: Boolean, default: !1 },
    sunk: { type: Boolean, default: !0 },
    expandable: { type: Boolean, default: !0 }
  },
  emits: ["update:open", "toggle"],
  setup(e, { emit: r }) {
    const t = e, s = r, n = O(t.defaultOpen), l = u(() => t.open ?? n.value);
    function p() {
      if (!t.expandable) return;
      const a = !l.value;
      t.open === void 0 && (n.value = a), s("update:open", a), s("toggle", a);
    }
    return (a, g) => (o(), d("div", {
      class: k(["nm-chat-fold", [
        e.sunk ? "nm-chat-fold--sunk" : "nm-chat-fold--raised",
        { "nm-chat-fold--open": l.value }
      ]])
    }, [
      v("div", M, [
        e.expandable ? (o(), d("button", {
          key: 0,
          type: "button",
          class: "nm-chat-fold__trigger",
          "aria-expanded": l.value,
          onClick: p
        }, [
          v("span", j, [
            y(_, {
              name: l.value ? "chevron-down" : "chevron-right",
              size: "xs"
            }, null, 8, ["name"])
          ]),
          m(a.$slots, "head", { open: l.value }, void 0, !0)
        ], 8, U)) : (o(), d("div", q, [
          m(a.$slots, "head", { open: l.value }, void 0, !0)
        ])),
        m(a.$slots, "actions", {}, void 0, !0)
      ]),
      a.$slots.subhead ? (o(), d("div", A, [
        m(a.$slots, "subhead", {}, void 0, !0)
      ])) : f("", !0),
      e.expandable && l.value ? (o(), d("div", G, [
        m(a.$slots, "default", {}, void 0, !0)
      ])) : f("", !0)
    ], 2));
  }
}), se = /* @__PURE__ */ $(H, [["__scopeId", "data-v-beb3db96"]]), J = ["aria-label", "title"], Q = /* @__PURE__ */ C({
  __name: "ChatCopyButton",
  props: {
    text: {}
  },
  setup(e) {
    const { t: r } = S(), { copied: t, copy: s } = F(), n = u(() => t.value ? r("chatCopied") : r("chatCopy"));
    return (l, p) => (o(), d("button", {
      type: "button",
      class: k(["nm-chat-copy", { "nm-chat-copy--copied": c(t) }]),
      "aria-label": n.value,
      title: n.value,
      onClick: p[0] || (p[0] = K((a) => c(s)(e.text), ["stop"]))
    }, [
      c(t) ? (o(), b(_, {
        key: 0,
        name: "check",
        size: "sm",
        "stroke-width": 3
      })) : (o(), b(_, {
        key: 1,
        name: "copy",
        size: "sm"
      }))
    ], 10, J));
  }
}), ne = /* @__PURE__ */ $(Q, [["__scopeId", "data-v-63e80f46"]]);
export {
  le as ChatComposer,
  ne as ChatCopyButton,
  se as ChatFold
};

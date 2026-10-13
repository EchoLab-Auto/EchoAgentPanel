import { defineComponent as b, computed as u, openBlock as a, createElementBlock as l, normalizeClass as _, renderSlot as m, createBlock as z, withCtx as $, createTextVNode as x, toDisplayString as B, createCommentVNode as v, createElementVNode as h, createVNode as V, unref as c, ref as I, withModifiers as M } from "vue";
import { N as O } from "../chunks/NeumorphismTextarea-D4alPN-q.js";
import { N as L } from "../chunks/NeumorphismButton-CTLPjGe-.js";
import { useLocale as N } from "../composables/useLocale.js";
import { useChatInput as j } from "../composables/useChatInput.js";
import { _ as k } from "../chunks/_plugin-vue_export-helper-CHgC5LLL.js";
import { useClipboard as K } from "../composables/useClipboard.js";
import '../index.css';const R = {
  key: 0,
  class: "nm-chat-composer__meta"
}, E = { class: "nm-chat-composer__row" }, F = /* @__PURE__ */ b({
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
  setup(e, { emit: p }) {
    const t = e, d = p, { t: i } = N(), n = u(() => t.placeholder || i("chatInputPlaceholder")), s = u(() => t.sendLabel || i("chatSend")), o = u(() => t.cancelLabel || i("chatCancel")), y = u({
      get: () => t.modelValue,
      set: (r) => d("update:modelValue", r)
    }), { handleKeydown: S, submit: C, canSubmit: g } = j({
      modelValue: y,
      disabled: u(() => t.disabled),
      onSubmit: (r) => d("send", r)
    });
    return (r, f) => (a(), l("div", {
      class: _(["nm-chat-composer", { "nm-chat-composer--disabled": e.disabled }])
    }, [
      r.$slots.meta || e.cancelable ? (a(), l("div", R, [
        m(r.$slots, "meta", {}, void 0, !0),
        e.cancelable ? (a(), z(L, {
          key: 0,
          class: "nm-chat-composer__cancel",
          size: "small",
          disabled: e.disabled,
          onClick: f[0] || (f[0] = (w) => d("cancel"))
        }, {
          default: $(() => [
            x(B(o.value), 1)
          ]),
          _: 1
        }, 8, ["disabled"])) : v("", !0)
      ])) : v("", !0),
      h("div", E, [
        V(O, {
          class: "nm-chat-composer__field",
          "model-value": e.modelValue,
          placeholder: n.value,
          disabled: e.disabled,
          rows: e.rows,
          "auto-resize": e.autoResize,
          maxlength: e.maxlength,
          "onUpdate:modelValue": f[1] || (f[1] = (w) => d("update:modelValue", w)),
          onKeydown: c(S)
        }, null, 8, ["model-value", "placeholder", "disabled", "rows", "auto-resize", "maxlength", "onKeydown"]),
        m(r.$slots, "actions", {
          submit: c(C),
          canSubmit: c(g)
        }, () => [
          V(L, {
            class: "nm-chat-composer__send",
            variant: "raised",
            shape: "pill",
            disabled: e.disabled || !c(g),
            onClick: c(C)
          }, {
            default: $(() => [
              x(B(s.value), 1)
            ]),
            _: 1
          }, 8, ["disabled", "onClick"])
        ], !0)
      ])
    ], 2));
  }
}), se = /* @__PURE__ */ k(F, [["__scopeId", "data-v-c0c75efa"]]), P = { class: "nm-chat-fold__head" }, T = ["aria-expanded"], D = {
  class: "nm-chat-fold__caret",
  "aria-hidden": "true"
}, H = {
  width: "12",
  height: "12",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2.5",
  "stroke-linecap": "round",
  "stroke-linejoin": "round"
}, U = ["d"], q = {
  key: 1,
  class: "nm-chat-fold__head-static"
}, A = {
  key: 0,
  class: "nm-chat-fold__subhead"
}, G = {
  key: 1,
  class: "nm-chat-fold__body"
}, J = /* @__PURE__ */ b({
  __name: "ChatFold",
  props: {
    open: { type: Boolean, default: void 0 },
    defaultOpen: { type: Boolean, default: !1 },
    sunk: { type: Boolean, default: !0 },
    expandable: { type: Boolean, default: !0 }
  },
  emits: ["update:open", "toggle"],
  setup(e, { emit: p }) {
    const t = e, d = p, i = I(t.defaultOpen), n = u(() => t.open ?? i.value);
    function s() {
      if (!t.expandable) return;
      const o = !n.value;
      t.open === void 0 && (i.value = o), d("update:open", o), d("toggle", o);
    }
    return (o, y) => (a(), l("div", {
      class: _(["nm-chat-fold", [
        e.sunk ? "nm-chat-fold--sunk" : "nm-chat-fold--raised",
        { "nm-chat-fold--open": n.value }
      ]])
    }, [
      h("div", P, [
        e.expandable ? (a(), l("button", {
          key: 0,
          type: "button",
          class: "nm-chat-fold__trigger",
          "aria-expanded": n.value,
          onClick: s
        }, [
          h("span", D, [
            (a(), l("svg", H, [
              h("path", {
                d: n.value ? "M6 9l6 6 6-6" : "M9 6l6 6-6 6"
              }, null, 8, U)
            ]))
          ]),
          m(o.$slots, "head", { open: n.value }, void 0, !0)
        ], 8, T)) : (a(), l("div", q, [
          m(o.$slots, "head", { open: n.value }, void 0, !0)
        ])),
        m(o.$slots, "actions", {}, void 0, !0)
      ]),
      o.$slots.subhead ? (a(), l("div", A, [
        m(o.$slots, "subhead", {}, void 0, !0)
      ])) : v("", !0),
      e.expandable && n.value ? (a(), l("div", G, [
        m(o.$slots, "default", {}, void 0, !0)
      ])) : v("", !0)
    ], 2));
  }
}), de = /* @__PURE__ */ k(J, [["__scopeId", "data-v-2fb7d2e2"]]), Q = ["aria-label", "title"], W = {
  key: 0,
  width: "14",
  height: "14",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "3",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
  "aria-hidden": "true"
}, X = {
  key: 1,
  width: "14",
  height: "14",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
  "aria-hidden": "true"
}, Y = /* @__PURE__ */ b({
  __name: "ChatCopyButton",
  props: {
    text: {}
  },
  setup(e) {
    const { t: p } = N(), { copied: t, copy: d } = K(), i = u(() => t.value ? p("chatCopied") : p("chatCopy"));
    return (n, s) => (a(), l("button", {
      type: "button",
      class: _(["nm-chat-copy", { "nm-chat-copy--copied": c(t) }]),
      "aria-label": i.value,
      title: i.value,
      onClick: s[0] || (s[0] = M((o) => c(d)(e.text), ["stop"]))
    }, [
      c(t) ? (a(), l("svg", W, [...s[1] || (s[1] = [
        h("path", { d: "M5 13l4 4L19 7" }, null, -1)
      ])])) : (a(), l("svg", X, [...s[2] || (s[2] = [
        h("rect", {
          x: "9",
          y: "9",
          width: "13",
          height: "13",
          rx: "2"
        }, null, -1),
        h("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" }, null, -1)
      ])]))
    ], 10, Q));
  }
}), ie = /* @__PURE__ */ k(Y, [["__scopeId", "data-v-c5c27227"]]);
export {
  se as ChatComposer,
  ie as ChatCopyButton,
  de as ChatFold
};

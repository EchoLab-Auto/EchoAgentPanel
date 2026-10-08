import { defineComponent as C, computed as m, openBlock as o, createElementBlock as d, withModifiers as j, unref as c, normalizeClass as w, toDisplayString as x, renderSlot as h, createElementVNode as v, createBlock as R, createCommentVNode as f, ref as O, onMounted as F, nextTick as J, withCtx as L, createTextVNode as N, createVNode as I } from "vue";
import { useClipboard as K } from "../composables/useClipboard.js";
import { useLocale as T } from "../composables/useLocale.js";
import { _ as $ } from "../chunks/_plugin-vue_export-helper-CHgC5LLL.js";
import { u as P } from "../chunks/createComponent-jnXBYqCm.js";
import { useChatScroll as E } from "../composables/useChatScroll.js";
import { N as M } from "../chunks/NeumorphismTextarea--7CQLzDm.js";
import { N as z } from "../chunks/NeumorphismButton-DEVgFO0I.js";
import { useChatInput as A } from "../composables/useChatInput.js";
import '../index.css';const D = ["aria-label", "title"], U = /* @__PURE__ */ C({
  __name: "ChatCopyButton",
  props: {
    text: {}
  },
  setup(e) {
    const { t: s } = T(), { copied: t, copy: u } = K(), n = m(() => t.value ? s("chatCopied") : s("chatCopy"));
    return (l, p) => (o(), d("button", {
      type: "button",
      class: w(["nm-chat-copy", { "nm-chat-copy--copied": c(t) }]),
      "aria-label": n.value,
      title: n.value,
      onClick: p[0] || (p[0] = j((a) => c(u)(e.text), ["stop"]))
    }, x(c(t) ? "✓" : "⧉"), 11, D));
  }
}), q = /* @__PURE__ */ $(U, [["__scopeId", "data-v-aef64e01"]]), G = {
  key: 0,
  class: "nm-chat-bubble__head"
}, H = { class: "nm-chat-bubble__content" }, Q = /* @__PURE__ */ C({
  __name: "ChatBubble",
  props: {
    align: { default: "start" },
    tone: { default: "default" },
    copyText: { default: "" }
  },
  setup(e) {
    return (s, t) => (o(), d("div", {
      class: w(["nm-chat-bubble", [`nm-chat-bubble--${e.align}`, `nm-chat-bubble--${e.tone}`]])
    }, [
      s.$slots.head || e.copyText ? (o(), d("div", G, [
        h(s.$slots, "head", {}, void 0, !0),
        t[0] || (t[0] = v("span", { class: "nm-chat-bubble__head-spacer" }, null, -1)),
        e.copyText ? (o(), R(q, {
          key: 0,
          class: "nm-chat-bubble__copy",
          text: e.copyText
        }, null, 8, ["text"])) : f("", !0)
      ])) : f("", !0),
      v("div", H, [
        h(s.$slots, "default", {}, void 0, !0)
      ])
    ], 2));
  }
}), _e = /* @__PURE__ */ $(Q, [["__scopeId", "data-v-4d0c2b26"]]), W = { class: "nm-chat-tray" }, X = ["aria-label", "title"], Y = /* @__PURE__ */ C({
  __name: "ChatTray",
  props: {
    autoScroll: { type: Boolean, default: void 0 },
    scrollThreshold: { default: void 0 },
    watchSource: { type: Function, default: void 0 },
    jumpLabel: { default: "" }
  },
  setup(e, { expose: s }) {
    const t = e, { t: u } = T(), { config: n, resolveProp: l } = P(), p = m(
      () => {
        var i;
        return l(t.autoScroll, (i = n.value.chat) == null ? void 0 : i.autoScroll, !0);
      }
    ), a = m(
      () => {
        var i;
        return l(t.scrollThreshold, (i = n.value.chat) == null ? void 0 : i.scrollThreshold, 120);
      }
    ), _ = m(() => t.jumpLabel || u("chatJumpToBottom")), k = O(null), { isNearBottom: B, showJumpButton: y, handleScroll: r, scrollToBottom: b, recheck: S } = E({
      container: k,
      threshold: a,
      autoScroll: p,
      watchSource: () => {
        var i;
        return (i = t.watchSource) == null ? void 0 : i.call(t);
      }
    });
    return F(async () => {
      await J(), b("auto");
    }), s({ isNearBottom: B, showJumpButton: y, scrollToBottom: b, recheck: S }), (i, g) => (o(), d("div", W, [
      v("div", {
        ref_key: "containerRef",
        ref: k,
        class: "nm-chat-tray__scroll",
        role: "log",
        "aria-live": "polite",
        onScroll: g[0] || (g[0] = //@ts-ignore
        (...V) => c(r) && c(r)(...V))
      }, [
        h(i.$slots, "default", {}, void 0, !0)
      ], 544),
      c(y) ? (o(), d("button", {
        key: 0,
        type: "button",
        class: "nm-chat-tray__jump",
        "aria-label": _.value,
        title: _.value,
        onClick: g[1] || (g[1] = (V) => c(b)())
      }, " ↓ ", 8, X)) : f("", !0)
    ]));
  }
}), ye = /* @__PURE__ */ $(Y, [["__scopeId", "data-v-723f6d5f"]]), Z = { class: "nm-chat-fold__head" }, ee = ["aria-expanded"], te = {
  class: "nm-chat-fold__caret",
  "aria-hidden": "true"
}, ae = {
  key: 1,
  class: "nm-chat-fold__head-static"
}, oe = {
  key: 0,
  class: "nm-chat-fold__subhead"
}, le = {
  key: 1,
  class: "nm-chat-fold__body"
}, se = /* @__PURE__ */ C({
  __name: "ChatFold",
  props: {
    open: { type: Boolean, default: void 0 },
    defaultOpen: { type: Boolean, default: !1 },
    sunk: { type: Boolean, default: !0 },
    expandable: { type: Boolean, default: !0 }
  },
  emits: ["update:open", "toggle"],
  setup(e, { emit: s }) {
    const t = e, u = s, n = O(t.defaultOpen), l = m(() => t.open ?? n.value);
    function p() {
      if (!t.expandable) return;
      const a = !l.value;
      t.open === void 0 && (n.value = a), u("update:open", a), u("toggle", a);
    }
    return (a, _) => (o(), d("div", {
      class: w(["nm-chat-fold", [
        e.sunk ? "nm-chat-fold--sunk" : "nm-chat-fold--raised",
        { "nm-chat-fold--open": l.value }
      ]])
    }, [
      v("div", Z, [
        e.expandable ? (o(), d("button", {
          key: 0,
          type: "button",
          class: "nm-chat-fold__trigger",
          "aria-expanded": l.value,
          onClick: p
        }, [
          v("span", te, x(l.value ? "▾" : "▸"), 1),
          h(a.$slots, "head", { open: l.value }, void 0, !0)
        ], 8, ee)) : (o(), d("div", ae, [
          h(a.$slots, "head", { open: l.value }, void 0, !0)
        ])),
        h(a.$slots, "actions", {}, void 0, !0)
      ]),
      a.$slots.subhead ? (o(), d("div", oe, [
        h(a.$slots, "subhead", {}, void 0, !0)
      ])) : f("", !0),
      e.expandable && l.value ? (o(), d("div", le, [
        h(a.$slots, "default", {}, void 0, !0)
      ])) : f("", !0)
    ], 2));
  }
}), Ce = /* @__PURE__ */ $(se, [["__scopeId", "data-v-7886f9f3"]]), ne = {
  key: 0,
  class: "nm-chat-composer__meta"
}, de = { class: "nm-chat-composer__row" }, ce = /* @__PURE__ */ C({
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
  setup(e, { emit: s }) {
    const t = e, u = s, { t: n } = T(), l = m(() => t.placeholder || n("chatInputPlaceholder")), p = m(() => t.sendLabel || n("chatSend")), a = m(() => t.cancelLabel || n("chatCancel")), _ = m({
      get: () => t.modelValue,
      set: (r) => u("update:modelValue", r)
    }), { handleKeydown: k, submit: B, canSubmit: y } = A({
      modelValue: _,
      disabled: m(() => t.disabled),
      onSubmit: (r) => u("send", r)
    });
    return (r, b) => (o(), d("div", {
      class: w(["nm-chat-composer", { "nm-chat-composer--disabled": e.disabled }])
    }, [
      r.$slots.meta || e.cancelable ? (o(), d("div", ne, [
        h(r.$slots, "meta", {}, void 0, !0),
        e.cancelable ? (o(), R(z, {
          key: 0,
          class: "nm-chat-composer__cancel",
          size: "small",
          disabled: e.disabled,
          onClick: b[0] || (b[0] = (S) => u("cancel"))
        }, {
          default: L(() => [
            N(x(a.value), 1)
          ]),
          _: 1
        }, 8, ["disabled"])) : f("", !0)
      ])) : f("", !0),
      v("div", de, [
        I(M, {
          class: "nm-chat-composer__field",
          "model-value": e.modelValue,
          placeholder: l.value,
          disabled: e.disabled,
          rows: e.rows,
          "auto-resize": e.autoResize,
          maxlength: e.maxlength,
          "onUpdate:modelValue": b[1] || (b[1] = (S) => u("update:modelValue", S)),
          onKeydown: c(k)
        }, null, 8, ["model-value", "placeholder", "disabled", "rows", "auto-resize", "maxlength", "onKeydown"]),
        h(r.$slots, "actions", {
          submit: c(B),
          canSubmit: c(y)
        }, () => [
          I(z, {
            class: "nm-chat-composer__send",
            variant: "raised",
            shape: "pill",
            disabled: e.disabled || !c(y),
            onClick: c(B)
          }, {
            default: L(() => [
              N(x(p.value), 1)
            ]),
            _: 1
          }, 8, ["disabled", "onClick"])
        ], !0)
      ])
    ], 2));
  }
}), $e = /* @__PURE__ */ $(ce, [["__scopeId", "data-v-862b16aa"]]);
export {
  _e as ChatBubble,
  $e as ChatComposer,
  q as ChatCopyButton,
  Ce as ChatFold,
  ye as ChatTray
};

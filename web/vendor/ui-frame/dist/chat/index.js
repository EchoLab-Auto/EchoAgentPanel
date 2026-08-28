import { defineComponent as x, computed as u, openBlock as t, createElementBlock as l, withModifiers as U, unref as v, normalizeClass as V, toDisplayString as c, renderSlot as k, createElementVNode as g, createBlock as b, createCommentVNode as f, ref as P, onMounted as G, nextTick as W, withCtx as _, createTextVNode as S, createVNode as N, Fragment as I, renderList as z } from "vue";
import { useClipboard as q } from "../composables/useClipboard.js";
import { useLocale as w } from "../composables/useLocale.js";
import { _ as T } from "../chunks/_plugin-vue_export-helper-CHgC5LLL.js";
import { u as A } from "../chunks/createComponent-jnXBYqCm.js";
import { useChatScroll as H } from "../composables/useChatScroll.js";
import { N as Q } from "../chunks/NeumorphismTextarea-CSZ2VWdh.js";
import { N as E } from "../chunks/NeumorphismButton-6BjLxZWQ.js";
import { useChatInput as X } from "../composables/useChatInput.js";
import { _ as Y } from "../chunks/MarkdownRenderer.vue_vue_type_style_index_0_lang-BGgdJmiI.js";
import { N as M } from "../chunks/NeumorphismTag-S0FZZ2i6.js";
import { N as Z } from "../chunks/NeumorphismSpinner-CecIG42-.js";
import '../index2.css';const ee = ["aria-label", "title"], te = /* @__PURE__ */ x({
  __name: "ChatCopyButton",
  props: {
    text: {}
  },
  setup(e) {
    const { t: s } = w(), { copied: a, copy: m } = q(), r = u(() => a.value ? s("chatCopied") : s("chatCopy"));
    return (i, n) => (t(), l("button", {
      type: "button",
      class: V(["nm-chat-copy", { "nm-chat-copy--copied": v(a) }]),
      "aria-label": r.value,
      title: r.value,
      onClick: n[0] || (n[0] = U((o) => v(m)(e.text), ["stop"]))
    }, c(v(a) ? "✓" : "⧉"), 11, ee));
  }
}), D = /* @__PURE__ */ T(te, [["__scopeId", "data-v-e53ba9b4"]]), ae = {
  key: 0,
  class: "nm-chat-bubble__head"
}, se = { class: "nm-chat-bubble__content" }, oe = /* @__PURE__ */ x({
  __name: "ChatBubble",
  props: {
    align: { default: "start" },
    tone: { default: "default" },
    copyText: { default: "" }
  },
  setup(e) {
    return (s, a) => (t(), l("div", {
      class: V(["nm-chat-bubble", [`nm-chat-bubble--${e.align}`, `nm-chat-bubble--${e.tone}`]])
    }, [
      s.$slots.head || e.copyText ? (t(), l("div", ae, [
        k(s.$slots, "head", {}, void 0, !0),
        a[0] || (a[0] = g("span", { class: "nm-chat-bubble__head-spacer" }, null, -1)),
        e.copyText ? (t(), b(D, {
          key: 0,
          class: "nm-chat-bubble__copy",
          text: e.copyText
        }, null, 8, ["text"])) : f("", !0)
      ])) : f("", !0),
      g("div", se, [
        k(s.$slots, "default", {}, void 0, !0)
      ])
    ], 2));
  }
}), j = /* @__PURE__ */ T(oe, [["__scopeId", "data-v-d5c2095c"]]), ne = { class: "nm-chat-tray" }, le = ["aria-label", "title"], ce = /* @__PURE__ */ x({
  __name: "ChatTray",
  props: {
    autoScroll: { type: Boolean, default: void 0 },
    scrollThreshold: { default: void 0 },
    watchSource: { type: Function, default: void 0 },
    jumpLabel: { default: "" }
  },
  setup(e, { expose: s }) {
    const a = e, { t: m } = w(), { config: r, resolveProp: i } = A(), n = u(
      () => {
        var C;
        return i(a.autoScroll, (C = r.value.chat) == null ? void 0 : C.autoScroll, !0);
      }
    ), o = u(
      () => {
        var C;
        return i(a.scrollThreshold, (C = r.value.chat) == null ? void 0 : C.scrollThreshold, 120);
      }
    ), p = u(() => a.jumpLabel || m("chatJumpToBottom")), d = P(null), { isNearBottom: h, showJumpButton: $, handleScroll: y, scrollToBottom: B, recheck: L } = H({
      container: d,
      threshold: o,
      autoScroll: n,
      watchSource: () => {
        var C;
        return (C = a.watchSource) == null ? void 0 : C.call(a);
      }
    });
    return G(async () => {
      await W(), B("auto");
    }), s({ isNearBottom: h, showJumpButton: $, scrollToBottom: B, recheck: L }), (C, R) => (t(), l("div", ne, [
      g("div", {
        ref_key: "containerRef",
        ref: d,
        class: "nm-chat-tray__scroll",
        role: "log",
        "aria-live": "polite",
        onScroll: R[0] || (R[0] = //@ts-ignore
        (...O) => v(y) && v(y)(...O))
      }, [
        k(C.$slots, "default", {}, void 0, !0)
      ], 544),
      v($) ? (t(), l("button", {
        key: 0,
        type: "button",
        class: "nm-chat-tray__jump",
        "aria-label": p.value,
        title: p.value,
        onClick: R[1] || (R[1] = (O) => v(B)())
      }, " ↓ ", 8, le)) : f("", !0)
    ]));
  }
}), ue = /* @__PURE__ */ T(ce, [["__scopeId", "data-v-28760208"]]), re = { class: "nm-chat-fold__head" }, de = ["aria-expanded"], ie = {
  class: "nm-chat-fold__caret",
  "aria-hidden": "true"
}, me = {
  key: 1,
  class: "nm-chat-fold__head-static"
}, he = {
  key: 0,
  class: "nm-chat-fold__subhead"
}, fe = {
  key: 1,
  class: "nm-chat-fold__body"
}, pe = /* @__PURE__ */ x({
  __name: "ChatFold",
  props: {
    open: { type: Boolean, default: void 0 },
    defaultOpen: { type: Boolean, default: !1 },
    sunk: { type: Boolean, default: !0 },
    expandable: { type: Boolean, default: !0 }
  },
  emits: ["update:open", "toggle"],
  setup(e, { emit: s }) {
    const a = e, m = s, r = P(a.defaultOpen), i = u(() => a.open ?? r.value);
    function n() {
      if (!a.expandable) return;
      const o = !i.value;
      a.open === void 0 && (r.value = o), m("update:open", o), m("toggle", o);
    }
    return (o, p) => (t(), l("div", {
      class: V(["nm-chat-fold", [
        e.sunk ? "nm-chat-fold--sunk" : "nm-chat-fold--raised",
        { "nm-chat-fold--open": i.value }
      ]])
    }, [
      g("div", re, [
        e.expandable ? (t(), l("button", {
          key: 0,
          type: "button",
          class: "nm-chat-fold__trigger",
          "aria-expanded": i.value,
          onClick: n
        }, [
          g("span", ie, c(i.value ? "▾" : "▸"), 1),
          k(o.$slots, "head", { open: i.value }, void 0, !0)
        ], 8, de)) : (t(), l("div", me, [
          k(o.$slots, "head", { open: i.value }, void 0, !0)
        ])),
        k(o.$slots, "actions", {}, void 0, !0)
      ]),
      o.$slots.subhead ? (t(), l("div", he, [
        k(o.$slots, "subhead", {}, void 0, !0)
      ])) : f("", !0),
      e.expandable && i.value ? (t(), l("div", fe, [
        k(o.$slots, "default", {}, void 0, !0)
      ])) : f("", !0)
    ], 2));
  }
}), F = /* @__PURE__ */ T(pe, [["__scopeId", "data-v-6dab9779"]]), ve = {
  key: 0,
  class: "nm-chat-composer__meta"
}, be = { class: "nm-chat-composer__row" }, _e = /* @__PURE__ */ x({
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
    const a = e, m = s, { t: r } = w(), i = u(() => a.placeholder || r("chatInputPlaceholder")), n = u(() => a.sendLabel || r("chatSend")), o = u(() => a.cancelLabel || r("chatCancel")), p = u({
      get: () => a.modelValue,
      set: (y) => m("update:modelValue", y)
    }), { handleKeydown: d, submit: h, canSubmit: $ } = X({
      modelValue: p,
      disabled: u(() => a.disabled),
      onSubmit: (y) => m("send", y)
    });
    return (y, B) => (t(), l("div", {
      class: V(["nm-chat-composer", { "nm-chat-composer--disabled": e.disabled }])
    }, [
      y.$slots.meta || e.cancelable ? (t(), l("div", ve, [
        k(y.$slots, "meta", {}, void 0, !0),
        e.cancelable ? (t(), b(E, {
          key: 0,
          class: "nm-chat-composer__cancel",
          size: "small",
          variant: "flat",
          disabled: e.disabled,
          onClick: B[0] || (B[0] = (L) => m("cancel"))
        }, {
          default: _(() => [
            S(c(o.value), 1)
          ]),
          _: 1
        }, 8, ["disabled"])) : f("", !0)
      ])) : f("", !0),
      g("div", be, [
        N(Q, {
          class: "nm-chat-composer__field",
          "model-value": e.modelValue,
          placeholder: i.value,
          disabled: e.disabled,
          rows: e.rows,
          "auto-resize": e.autoResize,
          maxlength: e.maxlength,
          "onUpdate:modelValue": B[1] || (B[1] = (L) => m("update:modelValue", L)),
          onKeydown: v(d)
        }, null, 8, ["model-value", "placeholder", "disabled", "rows", "auto-resize", "maxlength", "onKeydown"]),
        k(y.$slots, "actions", {
          submit: v(h),
          canSubmit: v($)
        }, () => [
          N(E, {
            class: "nm-chat-composer__send",
            variant: "raised",
            shape: "pill",
            disabled: e.disabled || !v($),
            onClick: v(h)
          }, {
            default: _(() => [
              S(c(n.value), 1)
            ]),
            _: 1
          }, 8, ["disabled", "onClick"])
        ], !0)
      ])
    ], 2));
  }
}), lt = /* @__PURE__ */ T(_e, [["__scopeId", "data-v-7a5d56ba"]]), ge = { class: "nm-chat-reasoning__title" }, ye = {
  key: 0,
  class: "nm-chat-reasoning__time"
}, ke = /* @__PURE__ */ x({
  __name: "ChatReasoningBlock",
  props: {
    parts: {},
    time: { default: "" },
    defaultOpen: { type: Boolean, default: !0 }
  },
  setup(e) {
    const s = e, { t: a } = w(), m = u(() => a("chatReasoning", { count: s.parts.length }));
    return (r, i) => (t(), b(F, {
      "default-open": e.defaultOpen,
      class: "nm-chat-reasoning"
    }, {
      head: _(() => [
        g("span", ge, c(m.value), 1),
        e.time ? (t(), l("span", ye, "· " + c(e.time), 1)) : f("", !0)
      ]),
      default: _(() => [
        (t(!0), l(I, null, z(e.parts, (n, o) => (t(), l("p", {
          key: o,
          class: "nm-chat-reasoning__part"
        }, c(n), 1))), 128))
      ]),
      _: 1
    }, 8, ["default-open"]));
  }
}), J = /* @__PURE__ */ T(ke, [["__scopeId", "data-v-ae0fa84e"]]), $e = { class: "nm-chat-tool__name" }, Ce = {
  key: 1,
  class: "nm-chat-tool__time"
}, xe = {
  key: 3,
  class: "nm-chat-tool__detail-hint"
}, Te = {
  key: 0,
  class: "nm-chat-tool__pre nm-chat-tool__pre--input"
}, Be = {
  key: 1,
  class: "nm-chat-tool__pre nm-chat-tool__pre--output"
}, we = /* @__PURE__ */ x({
  __name: "ChatToolCallBlock",
  props: {
    name: {},
    input: { default: "" },
    output: { default: null },
    status: { default: void 0 },
    time: { default: "" }
  },
  setup(e) {
    const s = e, { t: a } = w(), m = u(() => s.input ?? ""), r = u(() => s.output ?? ""), i = u(() => m.value.length + r.value.length), n = u(() => s.status === "running" ? a("chatToolRunning") : s.status === "succeeded" ? a("chatToolSucceeded") : s.status === "failed" ? a("chatToolFailed") : ""), o = u(() => s.status === "succeeded" ? "success" : s.status === "failed" ? "error" : "info");
    return (p, d) => (t(), b(F, {
      expandable: i.value > 0,
      class: "nm-chat-tool"
    }, {
      head: _(({ open: h }) => [
        N(M, {
          size: "small",
          variant: "info"
        }, {
          default: _(() => [
            S(c(v(a)("chatRoleTool")), 1)
          ]),
          _: 1
        }),
        g("span", $e, c(e.name), 1),
        e.status === "running" ? (t(), b(Z, {
          key: 0,
          size: "small"
        })) : f("", !0),
        e.time ? (t(), l("span", Ce, c(e.time), 1)) : f("", !0),
        e.status ? (t(), b(M, {
          key: 2,
          size: "small",
          variant: o.value
        }, {
          default: _(() => [
            S(c(n.value), 1)
          ]),
          _: 1
        }, 8, ["variant"])) : f("", !0),
        i.value > 0 ? (t(), l("span", xe, c(h ? v(a)("chatToolCollapse") : v(a)("chatToolDetails", { count: i.value })), 1)) : f("", !0)
      ]),
      actions: _(() => [
        r.value ? (t(), b(D, {
          key: 0,
          text: r.value
        }, null, 8, ["text"])) : f("", !0)
      ]),
      default: _(() => [
        m.value ? (t(), l("pre", Te, c(m.value), 1)) : f("", !0),
        r.value ? (t(), l("pre", Be, c(r.value), 1)) : f("", !0)
      ]),
      _: 1
    }, 8, ["expandable"]));
  }
}), K = /* @__PURE__ */ T(we, [["__scopeId", "data-v-5d90eaa2"]]), Se = { class: "nm-chat-branch__id" }, Ne = {
  key: 0,
  class: "nm-chat-branch__time"
}, Ie = { class: "nm-chat-branch__stats" }, Le = { class: "nm-chat-branch__summary" }, Re = { class: "nm-chat-branch__entries" }, Ve = {
  key: 0,
  class: "nm-chat-branch__empty"
}, Me = {
  key: 2,
  class: "nm-chat-branch__content"
}, ze = {
  key: 3,
  class: "nm-chat-branch__notice"
}, Fe = /* @__PURE__ */ x({
  __name: "ChatBranchMergeBlock",
  props: {
    branch: {},
    time: { default: "" }
  },
  setup(e) {
    const s = e, { t: a } = w(), m = u(
      () => s.branch.branchId.length > 8 ? s.branch.branchId.slice(0, 8) : s.branch.branchId
    ), r = u(() => s.branch.entries.filter((o) => o.kind === "tool").length), i = u(
      () => s.branch.entries.filter((o) => o.kind === "reasoning").length
    ), n = u(
      () => a("chatBranchStats", { tools: r.value, reasonings: i.value })
    );
    return (o, p) => (t(), b(F, {
      sunk: !1,
      class: "nm-chat-branch"
    }, {
      head: _(({ open: d }) => [
        N(M, { size: "small" }, {
          default: _(() => [
            S(c(v(a)("chatBranchMerge")), 1)
          ]),
          _: 1
        }),
        g("span", Se, c(m.value), 1),
        e.time ? (t(), l("span", Ne, c(e.time), 1)) : f("", !0),
        g("span", Ie, c(d ? v(a)("chatCollapse") : n.value), 1)
      ]),
      subhead: _(() => [
        g("div", Le, c(e.branch.summary), 1)
      ]),
      default: _(() => [
        g("div", Re, [
          e.branch.entries.length === 0 ? (t(), l("div", Ve, c(v(a)("chatBranchEmpty")), 1)) : f("", !0),
          (t(!0), l(I, null, z(e.branch.entries, (d) => (t(), l(I, { key: d }, [
            d.kind === "tool" ? (t(), b(K, {
              key: 0,
              name: d.toolName ?? d.text,
              input: d.input,
              output: d.output,
              status: d.status
            }, null, 8, ["name", "input", "output", "status"])) : d.kind === "reasoning" ? (t(), b(J, {
              key: 1,
              parts: [d.text]
            }, null, 8, ["parts"])) : d.kind === "content" ? (t(), l("div", Me, c(d.text), 1)) : (t(), l("div", ze, c(d.text), 1))
          ], 64))), 128))
        ])
      ]),
      _: 1
    }));
  }
}), Oe = /* @__PURE__ */ T(Fe, [["__scopeId", "data-v-d51e987c"]]), Ee = { class: "nm-chat-message__system-text" }, je = {
  key: 0,
  class: "nm-chat-message__system-time"
}, Pe = {
  key: 0,
  class: "nm-chat-message__role"
}, Ae = {
  key: 1,
  class: "nm-chat-message__source"
}, De = {
  key: 2,
  class: "nm-chat-message__time"
}, Je = { class: "nm-chat-message__content" }, Ke = /* @__PURE__ */ x({
  __name: "ChatMessageItem",
  props: {
    message: {},
    markdown: { type: Boolean, default: void 0 },
    formatTime: { type: Function, default: void 0 }
  },
  setup(e) {
    const s = e, { t: a } = w(), { config: m, resolveProp: r } = A(), i = u(
      () => {
        var h;
        return r(s.markdown, (h = m.value.chat) == null ? void 0 : h.markdown, !0);
      }
    ), n = u(() => s.message.role === "user"), o = u(() => {
      var y;
      const h = s.message.source;
      if (!h) return "";
      const $ = [];
      return h.adapterName && $.push(h.adapterName), (y = h.channel) != null && y.startsWith("group") && $.push(a("chatSourceGroup", { name: h.groupName ?? h.channel })), h.userName && $.push(h.userName), $.join(" · ");
    }), p = u(() => {
      const h = s.message.time;
      return h ? s.formatTime ? s.formatTime(h) : new Date(h * 1e3).toLocaleTimeString(void 0, { hour12: !1 }) : "";
    }), d = u(() => i.value && s.message.role === "agent");
    return (h, $) => e.message.role === "tool" && e.message.tool ? (t(), b(K, {
      key: 0,
      name: e.message.tool.name,
      input: e.message.tool.input,
      output: e.message.tool.output,
      status: e.message.tool.status,
      time: p.value
    }, null, 8, ["name", "input", "output", "status", "time"])) : e.message.role === "branch" && e.message.branch ? (t(), b(Oe, {
      key: 1,
      branch: e.message.branch,
      time: p.value
    }, null, 8, ["branch", "time"])) : e.message.role === "system" ? (t(), b(j, {
      key: 2,
      align: "center",
      tone: "plain",
      role: "note"
    }, {
      default: _(() => [
        g("span", Ee, c(e.message.content), 1),
        p.value ? (t(), l("span", je, c(p.value), 1)) : f("", !0)
      ]),
      _: 1
    })) : (t(), b(j, {
      key: 3,
      align: n.value ? "end" : "start",
      tone: n.value ? "primary" : "default",
      "copy-text": e.message.content,
      role: "article",
      "aria-label": n.value ? v(a)("chatRoleUser") : v(a)("chatRoleAgent")
    }, {
      head: _(() => [
        n.value ? f("", !0) : (t(), l("span", Pe, c(v(a)("chatRoleAgent")), 1)),
        o.value ? (t(), l("span", Ae, c(o.value), 1)) : f("", !0),
        p.value ? (t(), l("span", De, c(p.value), 1)) : f("", !0)
      ]),
      default: _(() => [
        e.message.reasoning && e.message.reasoning.length > 0 ? (t(), b(J, {
          key: 0,
          parts: e.message.reasoning
        }, null, 8, ["parts"])) : f("", !0),
        g("div", Je, [
          d.value ? (t(), b(Y, {
            key: 0,
            content: e.message.content,
            "show-toc": !1
          }, null, 8, ["content"])) : (t(), l(I, { key: 1 }, [
            S(c(e.message.content), 1)
          ], 64))
        ])
      ]),
      _: 1
    }, 8, ["align", "tone", "copy-text", "aria-label"]));
  }
}), Ue = /* @__PURE__ */ T(Ke, [["__scopeId", "data-v-fb51049a"]]), Ge = {
  key: 0,
  class: "nm-chat-list__empty"
}, We = /* @__PURE__ */ x({
  __name: "ChatMessageList",
  props: {
    messages: {},
    markdown: { type: Boolean, default: void 0 },
    autoScroll: { type: Boolean, default: void 0 },
    scrollThreshold: { default: void 0 },
    emptyText: { default: "" },
    formatTime: { type: Function, default: void 0 }
  },
  setup(e) {
    const s = e, { t: a } = w(), m = u(() => s.emptyText || a("chatEmpty")), r = u(() => s.messages[s.messages.length - 1]), i = () => {
      var p, d;
      const n = r.value, o = n == null ? void 0 : n.reasoning;
      return [
        s.messages.length,
        n == null ? void 0 : n.content,
        o == null ? void 0 : o.length,
        o && o.length > 0 ? o[o.length - 1] : void 0,
        (p = n == null ? void 0 : n.tool) == null ? void 0 : p.output,
        (d = n == null ? void 0 : n.branch) == null ? void 0 : d.entries.length
      ];
    };
    return (n, o) => (t(), b(ue, {
      "auto-scroll": e.autoScroll,
      "scroll-threshold": e.scrollThreshold,
      "watch-source": i
    }, {
      default: _(() => [
        e.messages.length === 0 ? (t(), l("div", Ge, [
          k(n.$slots, "empty", {}, () => [
            S(c(m.value), 1)
          ], !0)
        ])) : f("", !0),
        (t(!0), l(I, null, z(e.messages, (p) => k(n.$slots, "message", {
          key: p.id,
          message: p
        }, () => [
          N(Ue, {
            message: p,
            markdown: e.markdown,
            "format-time": e.formatTime
          }, null, 8, ["message", "markdown", "format-time"])
        ], !0)), 128))
      ]),
      _: 3
    }, 8, ["auto-scroll", "scroll-threshold"]));
  }
}), ct = /* @__PURE__ */ T(We, [["__scopeId", "data-v-3692944f"]]);
export {
  Oe as ChatBranchMergeBlock,
  j as ChatBubble,
  lt as ChatComposer,
  D as ChatCopyButton,
  F as ChatFold,
  Ue as ChatMessageItem,
  ct as ChatMessageList,
  J as ChatReasoningBlock,
  K as ChatToolCallBlock,
  ue as ChatTray
};

import { defineComponent as B, computed as u, ref as P, onMounted as U, nextTick as G, openBlock as t, createElementBlock as l, createElementVNode as g, unref as v, renderSlot as k, createCommentVNode as f, withModifiers as W, normalizeClass as R, toDisplayString as c, createBlock as b, withCtx as _, Fragment as N, renderList as z, createVNode as I, createTextVNode as S } from "vue";
import { useLocale as w } from "../composables/useLocale.js";
import { u as A } from "../chunks/createComponent-jnXBYqCm.js";
import { useChatScroll as q } from "../composables/useChatScroll.js";
import { _ as T } from "../chunks/_plugin-vue_export-helper-CHgC5LLL.js";
import { _ as H } from "../chunks/MarkdownRenderer.vue_vue_type_style_index_0_lang-RcXhGxPg.js";
import { useClipboard as Q } from "../composables/useClipboard.js";
import { N as V } from "../chunks/NeumorphismTag-S0FZZ2i6.js";
import { N as X } from "../chunks/NeumorphismSpinner-CecIG42-.js";
import { N as Y } from "../chunks/NeumorphismTextarea-CSZ2VWdh.js";
import { N as E } from "../chunks/NeumorphismButton-DEVgFO0I.js";
import { useChatInput as Z } from "../composables/useChatInput.js";
import '../index2.css';const ee = { class: "nm-chat-tray" }, te = ["aria-label", "title"], ae = /* @__PURE__ */ B({
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
        var $;
        return i(a.autoScroll, ($ = r.value.chat) == null ? void 0 : $.autoScroll, !0);
      }
    ), o = u(
      () => {
        var $;
        return i(a.scrollThreshold, ($ = r.value.chat) == null ? void 0 : $.scrollThreshold, 120);
      }
    ), p = u(() => a.jumpLabel || m("chatJumpToBottom")), d = P(null), { isNearBottom: h, showJumpButton: C, handleScroll: y, scrollToBottom: x, recheck: L } = q({
      container: d,
      threshold: o,
      autoScroll: n,
      watchSource: () => {
        var $;
        return ($ = a.watchSource) == null ? void 0 : $.call(a);
      }
    });
    return U(async () => {
      await G(), x("auto");
    }), s({ isNearBottom: h, showJumpButton: C, scrollToBottom: x, recheck: L }), ($, M) => (t(), l("div", ee, [
      g("div", {
        ref_key: "containerRef",
        ref: d,
        class: "nm-chat-tray__scroll",
        role: "log",
        "aria-live": "polite",
        onScroll: M[0] || (M[0] = //@ts-ignore
        (...O) => v(y) && v(y)(...O))
      }, [
        k($.$slots, "default", {}, void 0, !0)
      ], 544),
      v(C) ? (t(), l("button", {
        key: 0,
        type: "button",
        class: "nm-chat-tray__jump",
        "aria-label": p.value,
        title: p.value,
        onClick: M[1] || (M[1] = (O) => v(x)())
      }, " ↓ ", 8, te)) : f("", !0)
    ]));
  }
}), se = /* @__PURE__ */ T(ae, [["__scopeId", "data-v-723f6d5f"]]), oe = ["aria-label", "title"], ne = /* @__PURE__ */ B({
  __name: "ChatCopyButton",
  props: {
    text: {}
  },
  setup(e) {
    const { t: s } = w(), { copied: a, copy: m } = Q(), r = u(() => a.value ? s("chatCopied") : s("chatCopy"));
    return (i, n) => (t(), l("button", {
      type: "button",
      class: R(["nm-chat-copy", { "nm-chat-copy--copied": v(a) }]),
      "aria-label": r.value,
      title: r.value,
      onClick: n[0] || (n[0] = W((o) => v(m)(e.text), ["stop"]))
    }, c(v(a) ? "✓" : "⧉"), 11, oe));
  }
}), D = /* @__PURE__ */ T(ne, [["__scopeId", "data-v-aef64e01"]]), le = {
  key: 0,
  class: "nm-chat-bubble__head"
}, ce = { class: "nm-chat-bubble__content" }, ue = /* @__PURE__ */ B({
  __name: "ChatBubble",
  props: {
    align: { default: "start" },
    tone: { default: "default" },
    copyText: { default: "" }
  },
  setup(e) {
    return (s, a) => (t(), l("div", {
      class: R(["nm-chat-bubble", [`nm-chat-bubble--${e.align}`, `nm-chat-bubble--${e.tone}`]])
    }, [
      s.$slots.head || e.copyText ? (t(), l("div", le, [
        k(s.$slots, "head", {}, void 0, !0),
        a[0] || (a[0] = g("span", { class: "nm-chat-bubble__head-spacer" }, null, -1)),
        e.copyText ? (t(), b(D, {
          key: 0,
          class: "nm-chat-bubble__copy",
          text: e.copyText
        }, null, 8, ["text"])) : f("", !0)
      ])) : f("", !0),
      g("div", ce, [
        k(s.$slots, "default", {}, void 0, !0)
      ])
    ], 2));
  }
}), j = /* @__PURE__ */ T(ue, [["__scopeId", "data-v-4d0c2b26"]]), re = { class: "nm-chat-fold__head" }, de = ["aria-expanded"], ie = {
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
}, pe = /* @__PURE__ */ B({
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
      class: R(["nm-chat-fold", [
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
}), F = /* @__PURE__ */ T(pe, [["__scopeId", "data-v-7886f9f3"]]), ve = { class: "nm-chat-reasoning__title" }, be = {
  key: 0,
  class: "nm-chat-reasoning__time"
}, _e = /* @__PURE__ */ B({
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
        g("span", ve, c(m.value), 1),
        e.time ? (t(), l("span", be, "· " + c(e.time), 1)) : f("", !0)
      ]),
      default: _(() => [
        (t(!0), l(N, null, z(e.parts, (n, o) => (t(), l("p", {
          key: o,
          class: "nm-chat-reasoning__part"
        }, c(n), 1))), 128))
      ]),
      _: 1
    }, 8, ["default-open"]));
  }
}), J = /* @__PURE__ */ T(_e, [["__scopeId", "data-v-0651d3fe"]]), ge = { class: "nm-chat-tool__name" }, ye = {
  key: 1,
  class: "nm-chat-tool__time"
}, ke = {
  key: 3,
  class: "nm-chat-tool__detail-hint"
}, Ce = {
  key: 0,
  class: "nm-chat-tool__pre nm-chat-tool__pre--input"
}, $e = {
  key: 1,
  class: "nm-chat-tool__pre nm-chat-tool__pre--output"
}, Be = /* @__PURE__ */ B({
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
        I(V, {
          size: "small",
          variant: "info"
        }, {
          default: _(() => [
            S(c(v(a)("chatRoleTool")), 1)
          ]),
          _: 1
        }),
        g("span", ge, c(e.name), 1),
        e.status === "running" ? (t(), b(X, {
          key: 0,
          size: "small"
        })) : f("", !0),
        e.time ? (t(), l("span", ye, c(e.time), 1)) : f("", !0),
        e.status ? (t(), b(V, {
          key: 2,
          size: "small",
          variant: o.value
        }, {
          default: _(() => [
            S(c(n.value), 1)
          ]),
          _: 1
        }, 8, ["variant"])) : f("", !0),
        i.value > 0 ? (t(), l("span", ke, c(h ? v(a)("chatToolCollapse") : v(a)("chatToolDetails", { count: i.value })), 1)) : f("", !0)
      ]),
      actions: _(() => [
        r.value ? (t(), b(D, {
          key: 0,
          text: r.value
        }, null, 8, ["text"])) : f("", !0)
      ]),
      default: _(() => [
        m.value ? (t(), l("pre", Ce, c(m.value), 1)) : f("", !0),
        r.value ? (t(), l("pre", $e, c(r.value), 1)) : f("", !0)
      ]),
      _: 1
    }, 8, ["expandable"]));
  }
}), K = /* @__PURE__ */ T(Be, [["__scopeId", "data-v-05abd34d"]]), Te = { class: "nm-chat-branch__id" }, xe = {
  key: 0,
  class: "nm-chat-branch__time"
}, we = { class: "nm-chat-branch__stats" }, Se = { class: "nm-chat-branch__summary" }, Ne = { class: "nm-chat-branch__entries" }, Ie = {
  key: 0,
  class: "nm-chat-branch__empty"
}, Le = {
  key: 2,
  class: "nm-chat-branch__content"
}, Me = {
  key: 3,
  class: "nm-chat-branch__notice"
}, Re = /* @__PURE__ */ B({
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
        I(V, { size: "small" }, {
          default: _(() => [
            S(c(v(a)("chatBranchMerge")), 1)
          ]),
          _: 1
        }),
        g("span", Te, c(m.value), 1),
        e.time ? (t(), l("span", xe, c(e.time), 1)) : f("", !0),
        g("span", we, c(d ? v(a)("chatCollapse") : n.value), 1)
      ]),
      subhead: _(() => [
        g("div", Se, c(e.branch.summary), 1)
      ]),
      default: _(() => [
        g("div", Ne, [
          e.branch.entries.length === 0 ? (t(), l("div", Ie, c(v(a)("chatBranchEmpty")), 1)) : f("", !0),
          (t(!0), l(N, null, z(e.branch.entries, (d) => (t(), l(N, { key: d }, [
            d.kind === "tool" ? (t(), b(K, {
              key: 0,
              name: d.toolName ?? d.text,
              input: d.input,
              output: d.output,
              status: d.status
            }, null, 8, ["name", "input", "output", "status"])) : d.kind === "reasoning" ? (t(), b(J, {
              key: 1,
              parts: [d.text]
            }, null, 8, ["parts"])) : d.kind === "content" ? (t(), l("div", Le, c(d.text), 1)) : (t(), l("div", Me, c(d.text), 1))
          ], 64))), 128))
        ])
      ]),
      _: 1
    }));
  }
}), Ve = /* @__PURE__ */ T(Re, [["__scopeId", "data-v-f4e63185"]]), ze = { class: "nm-chat-message__system-text" }, Fe = {
  key: 0,
  class: "nm-chat-message__system-time"
}, Oe = {
  key: 0,
  class: "nm-chat-message__role"
}, Ee = {
  key: 1,
  class: "nm-chat-message__source"
}, je = {
  key: 2,
  class: "nm-chat-message__time"
}, Pe = { class: "nm-chat-message__content" }, Ae = /* @__PURE__ */ B({
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
      const C = [];
      return h.adapterName && C.push(h.adapterName), (y = h.channel) != null && y.startsWith("group") && C.push(a("chatSourceGroup", { name: h.groupName ?? h.channel })), h.userName && C.push(h.userName), C.join(" · ");
    }), p = u(() => {
      const h = s.message.time;
      return h ? s.formatTime ? s.formatTime(h) : new Date(h * 1e3).toLocaleTimeString(void 0, { hour12: !1 }) : "";
    }), d = u(() => i.value && s.message.role === "agent");
    return (h, C) => e.message.role === "tool" && e.message.tool ? (t(), b(K, {
      key: 0,
      name: e.message.tool.name,
      input: e.message.tool.input,
      output: e.message.tool.output,
      status: e.message.tool.status,
      time: p.value
    }, null, 8, ["name", "input", "output", "status", "time"])) : e.message.role === "branch" && e.message.branch ? (t(), b(Ve, {
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
        g("span", ze, c(e.message.content), 1),
        p.value ? (t(), l("span", Fe, c(p.value), 1)) : f("", !0)
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
        n.value ? f("", !0) : (t(), l("span", Oe, c(v(a)("chatRoleAgent")), 1)),
        o.value ? (t(), l("span", Ee, c(o.value), 1)) : f("", !0),
        p.value ? (t(), l("span", je, c(p.value), 1)) : f("", !0)
      ]),
      default: _(() => [
        e.message.reasoning && e.message.reasoning.length > 0 ? (t(), b(J, {
          key: 0,
          parts: e.message.reasoning
        }, null, 8, ["parts"])) : f("", !0),
        g("div", Pe, [
          d.value ? (t(), b(H, {
            key: 0,
            content: e.message.content,
            "show-toc": !1
          }, null, 8, ["content"])) : (t(), l(N, { key: 1 }, [
            S(c(e.message.content), 1)
          ], 64))
        ])
      ]),
      _: 1
    }, 8, ["align", "tone", "copy-text", "aria-label"]));
  }
}), De = /* @__PURE__ */ T(Ae, [["__scopeId", "data-v-d9143b7e"]]), Je = {
  key: 0,
  class: "nm-chat-list__empty"
}, Ke = /* @__PURE__ */ B({
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
    return (n, o) => (t(), b(se, {
      "auto-scroll": e.autoScroll,
      "scroll-threshold": e.scrollThreshold,
      "watch-source": i
    }, {
      default: _(() => [
        e.messages.length === 0 ? (t(), l("div", Je, [
          k(n.$slots, "empty", {}, () => [
            S(c(m.value), 1)
          ], !0)
        ])) : f("", !0),
        (t(!0), l(N, null, z(e.messages, (p) => k(n.$slots, "message", {
          key: p.id,
          message: p
        }, () => [
          I(De, {
            message: p,
            markdown: e.markdown,
            "format-time": e.formatTime
          }, null, 8, ["message", "markdown", "format-time"])
        ], !0)), 128))
      ]),
      _: 3
    }, 8, ["auto-scroll", "scroll-threshold"]));
  }
}), lt = /* @__PURE__ */ T(Ke, [["__scopeId", "data-v-33c7c7db"]]), Ue = {
  key: 0,
  class: "nm-chat-composer__meta"
}, Ge = { class: "nm-chat-composer__row" }, We = /* @__PURE__ */ B({
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
    }), { handleKeydown: d, submit: h, canSubmit: C } = Z({
      modelValue: p,
      disabled: u(() => a.disabled),
      onSubmit: (y) => m("send", y)
    });
    return (y, x) => (t(), l("div", {
      class: R(["nm-chat-composer", { "nm-chat-composer--disabled": e.disabled }])
    }, [
      y.$slots.meta || e.cancelable ? (t(), l("div", Ue, [
        k(y.$slots, "meta", {}, void 0, !0),
        e.cancelable ? (t(), b(E, {
          key: 0,
          class: "nm-chat-composer__cancel",
          size: "small",
          disabled: e.disabled,
          onClick: x[0] || (x[0] = (L) => m("cancel"))
        }, {
          default: _(() => [
            S(c(o.value), 1)
          ]),
          _: 1
        }, 8, ["disabled"])) : f("", !0)
      ])) : f("", !0),
      g("div", Ge, [
        I(Y, {
          class: "nm-chat-composer__field",
          "model-value": e.modelValue,
          placeholder: i.value,
          disabled: e.disabled,
          rows: e.rows,
          "auto-resize": e.autoResize,
          maxlength: e.maxlength,
          "onUpdate:modelValue": x[1] || (x[1] = (L) => m("update:modelValue", L)),
          onKeydown: v(d)
        }, null, 8, ["model-value", "placeholder", "disabled", "rows", "auto-resize", "maxlength", "onKeydown"]),
        k(y.$slots, "actions", {
          submit: v(h),
          canSubmit: v(C)
        }, () => [
          I(E, {
            class: "nm-chat-composer__send",
            variant: "raised",
            shape: "pill",
            disabled: e.disabled || !v(C),
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
}), ct = /* @__PURE__ */ T(We, [["__scopeId", "data-v-862b16aa"]]), ut = {
  composite: [
    "ChatMessageList",
    "ChatMessageItem",
    "ChatToolCallBlock",
    "ChatReasoningBlock",
    "ChatBranchMergeBlock"
  ],
  meta: ["ChatBubble", "ChatTray", "ChatFold", "ChatComposer", "ChatCopyButton"]
};
export {
  Ve as ChatBranchMergeBlock,
  j as ChatBubble,
  ct as ChatComposer,
  D as ChatCopyButton,
  F as ChatFold,
  De as ChatMessageItem,
  lt as ChatMessageList,
  J as ChatReasoningBlock,
  K as ChatToolCallBlock,
  se as ChatTray,
  ut as componentCategories
};

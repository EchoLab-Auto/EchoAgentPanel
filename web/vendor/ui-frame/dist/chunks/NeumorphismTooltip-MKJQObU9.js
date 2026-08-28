import { defineComponent as R, useCssVars as B, computed as n, ref as $, openBlock as b, createElementBlock as w, unref as t, normalizeClass as x, renderSlot as I, createVNode as F, Transition as K, withCtx as Z, normalizeStyle as h, createElementVNode as N, createTextVNode as D, toDisplayString as E, createCommentVNode as L } from "vue";
import { useTooltip as O } from "../composables/useTooltip.js";
import j from "../composables/useFloatingPosition.js";
import { u as q } from "./createComponent-jnXBYqCm.js";
import { useZIndex as A } from "../composables/useZIndex.js";
import { generateId as G } from "../utils/index.js";
import { _ as H } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismTooltip.css';const J = ["id", "aria-hidden"], Q = { class: "nm-tooltip__content" }, U = /* @__PURE__ */ R({
  __name: "NeumorphismTooltip",
  props: {
    content: {},
    position: {},
    trigger: {},
    disabled: { type: Boolean, default: !1 },
    offset: {},
    delay: {}
  },
  setup(r) {
    B((o) => ({
      v890f0ad8: S.value
    }));
    const l = r, { config: a, resolveProp: d } = q(), k = n(
      () => {
        var o;
        return d(l.position, (o = a.value.tooltip) == null ? void 0 : o.position, "top");
      }
    ), i = n(
      () => {
        var o;
        return d(l.trigger, (o = a.value.tooltip) == null ? void 0 : o.trigger, "hover");
      }
    ), m = n(() => {
      var o;
      return d(l.offset, (o = a.value.tooltip) == null ? void 0 : o.offset, 8);
    }), C = n(() => {
      var o;
      return d(l.delay, (o = a.value.tooltip) == null ? void 0 : o.delay, 150);
    }), { getZIndex: P } = A(), T = n(() => P("tooltip")), {
      isVisible: u,
      show: p,
      hide: v,
      toggle: V,
      handleKeydown: f
    } = O({
      disabled: n(() => l.disabled),
      delay: C.value
    }), S = n(() => `${m.value}px`), c = G("nm-tooltip"), g = $(), y = $(), { actualPlacement: z } = j({
      trigger: g,
      open: u,
      placement: n(() => k.value),
      offset: m,
      floating: y,
      estimateSize: { width: 120, height: 40 }
    }), M = n(() => [
      "nm-tooltip",
      `nm-tooltip--${z.value}`,
      { "nm-tooltip--visible": u.value }
    ]);
    return (o, e) => (b(), w("div", {
      ref_key: "triggerRef",
      ref: g,
      class: x(["nm-tooltip-wrapper", { "nm-tooltip-wrapper--disabled": r.disabled }]),
      onMouseenter: e[2] || (e[2] = (s) => i.value === "hover" ? t(p)() : void 0),
      onMouseleave: e[3] || (e[3] = (s) => i.value === "hover" ? t(v)() : void 0),
      onClick: e[4] || (e[4] = (s) => i.value === "click" ? t(V)() : void 0),
      onFocusin: e[5] || (e[5] = (s) => i.value === "focus" ? t(p)() : void 0),
      onFocusout: e[6] || (e[6] = (s) => i.value === "focus" ? t(v)() : void 0),
      onKeydown: e[7] || (e[7] = //@ts-ignore
      (...s) => t(f) && t(f)(...s))
    }, [
      I(o.$slots, "default", { contentId: t(c) }, void 0, !0),
      F(K, { name: "nm-tooltip-fade" }, {
        default: Z(() => [
          t(u) && (r.content || o.$slots.content) ? (b(), w("div", {
            key: 0,
            id: t(c),
            ref_key: "contentRef",
            ref: y,
            class: x(M.value),
            style: h({ zIndex: T.value }),
            role: "tooltip",
            "aria-hidden": !t(u),
            onMouseenter: e[0] || (e[0] = (s) => i.value === "hover" ? t(p)() : void 0),
            onMouseleave: e[1] || (e[1] = (s) => i.value === "hover" ? t(v)() : void 0)
          }, [
            e[8] || (e[8] = N("span", { class: "nm-tooltip__arrow" }, null, -1)),
            N("span", Q, [
              I(o.$slots, "content", {}, () => [
                D(E(r.content), 1)
              ], !0)
            ])
          ], 46, J)) : L("", !0)
        ]),
        _: 3
      })
    ], 34));
  }
}), ne = /* @__PURE__ */ H(U, [["__scopeId", "data-v-5cb2aeab"]]);
export {
  ne as N
};

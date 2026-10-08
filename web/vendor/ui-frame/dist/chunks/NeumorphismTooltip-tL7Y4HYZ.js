import { defineComponent as F, computed as s, ref as b, watch as K, nextTick as Z, onBeforeUnmount as D, openBlock as v, createElementBlock as h, unref as n, normalizeClass as k, renderSlot as w, createBlock as E, Teleport as L, createVNode as O, Transition as U, withCtx as j, normalizeStyle as q, createElementVNode as I, createTextVNode as A, toDisplayString as G, createCommentVNode as H } from "vue";
import { useTooltip as J } from "../composables/useTooltip.js";
import Q from "../composables/useFloatingPosition.js";
import { u as W } from "./createComponent-jnXBYqCm.js";
import { useZIndex as X } from "../composables/useZIndex.js";
import { generateId as Y } from "../utils/index.js";
import { _ } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismTooltip.css';const ee = ["id", "aria-hidden"], te = { class: "nm-tooltip__content" }, oe = /* @__PURE__ */ F({
  __name: "NeumorphismTooltip",
  props: {
    content: {},
    position: {},
    trigger: {},
    disabled: { type: Boolean, default: !1 },
    offset: {},
    delay: {}
  },
  setup(a) {
    const i = a, { config: p, resolveProp: d } = W(), N = s(
      () => {
        var e;
        return d(i.position, (e = p.value.tooltip) == null ? void 0 : e.position, "top");
      }
    ), l = s(
      () => {
        var e;
        return d(i.trigger, (e = p.value.tooltip) == null ? void 0 : e.trigger, "hover");
      }
    ), m = s(() => {
      var e;
      return d(i.offset, (e = p.value.tooltip) == null ? void 0 : e.offset, 8);
    }), T = s(() => {
      var e;
      return d(i.delay, (e = p.value.tooltip) == null ? void 0 : e.delay, 150);
    }), { getZIndex: S } = X(), B = s(() => S("tooltip")), {
      isVisible: r,
      show: f,
      hide: u,
      toggle: C,
      handleKeydown: c
    } = J({
      disabled: s(() => i.disabled),
      delay: T.value
    }), g = Y("nm-tooltip"), $ = b(), y = b(), {
      actualPlacement: x,
      rect: P,
      refresh: V,
      stop: z
    } = Q({
      trigger: $,
      open: r,
      placement: s(() => N.value),
      offset: m,
      floating: y,
      estimateSize: { width: 120, height: 40 }
    }), M = s(() => {
      const e = {
        position: "fixed",
        zIndex: String(B.value)
      }, t = P.value;
      if (!t) return e;
      const o = m.value;
      switch (x.value) {
        case "top":
          e.top = `${t.top - o}px`, e.left = `${t.left + t.width / 2}px`, e.transform = "translate(-50%, -100%)";
          break;
        case "bottom":
          e.top = `${t.bottom + o}px`, e.left = `${t.left + t.width / 2}px`, e.transform = "translate(-50%, 0)";
          break;
        case "left":
          e.top = `${t.top + t.height / 2}px`, e.left = `${t.left - o}px`, e.transform = "translate(-100%, -50%)";
          break;
        case "right":
          e.top = `${t.top + t.height / 2}px`, e.left = `${t.right + o}px`, e.transform = "translate(0, -50%)";
          break;
      }
      return e;
    });
    K(r, (e) => {
      e && Z(V);
    }), D(z);
    const R = s(() => [
      "nm-tooltip",
      `nm-tooltip--${x.value}`,
      { "nm-tooltip--visible": r.value }
    ]);
    return (e, t) => (v(), h("div", {
      ref_key: "triggerRef",
      ref: $,
      class: k(["nm-tooltip-wrapper", { "nm-tooltip-wrapper--disabled": a.disabled }]),
      onMouseenter: t[2] || (t[2] = (o) => l.value === "hover" ? n(f)() : void 0),
      onMouseleave: t[3] || (t[3] = (o) => l.value === "hover" ? n(u)() : void 0),
      onClick: t[4] || (t[4] = (o) => l.value === "click" ? n(C)() : void 0),
      onFocusin: t[5] || (t[5] = (o) => l.value === "focus" ? n(f)() : void 0),
      onFocusout: t[6] || (t[6] = (o) => l.value === "focus" ? n(u)() : void 0),
      onKeydown: t[7] || (t[7] = //@ts-ignore
      (...o) => n(c) && n(c)(...o))
    }, [
      w(e.$slots, "default", { contentId: n(g) }, void 0, !0),
      (v(), E(L, { to: "body" }, [
        O(U, { name: "nm-tooltip-fade" }, {
          default: j(() => [
            n(r) && (a.content || e.$slots.content) ? (v(), h("div", {
              key: 0,
              id: n(g),
              ref_key: "contentRef",
              ref: y,
              class: k(R.value),
              style: q(M.value),
              role: "tooltip",
              "aria-hidden": !n(r),
              onMouseenter: t[0] || (t[0] = (o) => l.value === "hover" ? n(f)() : void 0),
              onMouseleave: t[1] || (t[1] = (o) => l.value === "hover" ? n(u)() : void 0)
            }, [
              t[8] || (t[8] = I("span", { class: "nm-tooltip__arrow" }, null, -1)),
              I("span", te, [
                w(e.$slots, "content", {}, () => [
                  A(G(a.content), 1)
                ], !0)
              ])
            ], 46, ee)) : H("", !0)
          ]),
          _: 3
        })
      ]))
    ], 34));
  }
}), de = /* @__PURE__ */ _(oe, [["__scopeId", "data-v-5cfb503c"]]);
export {
  de as N
};

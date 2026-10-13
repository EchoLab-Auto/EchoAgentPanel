import { defineComponent as R, computed as i, ref as b, watch as F, nextTick as K, onBeforeUnmount as Z, openBlock as g, createElementBlock as k, unref as n, normalizeClass as I, renderSlot as N, createBlock as O, Teleport as U, createVNode as j, Transition as q, withCtx as A, normalizeStyle as G, createElementVNode as T, createTextVNode as H, toDisplayString as J, createCommentVNode as Q } from "vue";
import { useTooltip as W } from "../composables/useTooltip.js";
import X from "../composables/useFloatingPosition.js";
import { u as Y } from "./createComponent-jnXBYqCm.js";
import { useZIndex as _ } from "../composables/useZIndex.js";
import { generateId as ee } from "../utils/index.js";
import { _ as te } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismTooltip.css';const oe = ["id", "aria-hidden"], ne = { class: "nm-tooltip__content" }, ie = /* @__PURE__ */ R({
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
    const s = a, { config: d, resolveProp: u } = Y(), S = i(
      () => {
        var t;
        return u(s.position, (t = d.value.tooltip) == null ? void 0 : t.position, "top");
      }
    ), r = i(
      () => {
        var t;
        return u(s.trigger, (t = d.value.tooltip) == null ? void 0 : t.trigger, "hover");
      }
    ), y = i(() => {
      var t;
      return u(s.offset, (t = d.value.tooltip) == null ? void 0 : t.offset, 8);
    }), L = i(() => {
      var t;
      return u(s.delay, (t = d.value.tooltip) == null ? void 0 : t.delay, 150);
    }), { getZIndex: P } = _(), B = i(() => P("tooltip")), {
      isVisible: l,
      show: f,
      hide: p,
      toggle: C,
      handleKeydown: $
    } = W({
      disabled: i(() => s.disabled),
      delay: L.value
    }), w = ee("nm-tooltip"), m = b(), v = b(), {
      actualPlacement: x,
      rect: E,
      refresh: V,
      stop: z
    } = X({
      trigger: m,
      open: l,
      placement: i(() => S.value),
      offset: y,
      floating: v,
      estimateSize: { width: 120, height: 40 }
    }), D = i(() => {
      const t = {
        position: "fixed",
        zIndex: String(B.value)
      }, e = E.value;
      if (!e) return t;
      const o = y.value;
      switch (x.value) {
        case "top":
          t.top = `${e.top - o}px`, t.left = `${e.left + e.width / 2}px`, t.transform = "translate(-50%, -100%)";
          break;
        case "bottom":
          t.top = `${e.bottom + o}px`, t.left = `${e.left + e.width / 2}px`, t.transform = "translate(-50%, 0)";
          break;
        case "left":
          t.top = `${e.top + e.height / 2}px`, t.left = `${e.left - o}px`, t.transform = "translate(-100%, -50%)";
          break;
        case "right":
          t.top = `${e.top + e.height / 2}px`, t.left = `${e.right + o}px`, t.transform = "translate(0, -50%)";
          break;
      }
      return t;
    });
    function c(t) {
      var o, h;
      const e = t.target;
      (o = m.value) != null && o.contains(e) || (h = v.value) != null && h.contains(e) || p();
    }
    F(l, (t) => {
      if (t && K(V), typeof document > "u") return;
      t && r.value === "click" ? document.addEventListener("pointerdown", c, !0) : document.removeEventListener("pointerdown", c, !0);
    }), Z(() => {
      z(), typeof document < "u" && document.removeEventListener("pointerdown", c, !0);
    });
    const M = i(() => [
      "nm-tooltip",
      `nm-tooltip--${x.value}`,
      { "nm-tooltip--visible": l.value }
    ]);
    return (t, e) => (g(), k("div", {
      ref_key: "triggerRef",
      ref: m,
      class: I(["nm-tooltip-wrapper", { "nm-tooltip-wrapper--disabled": a.disabled }]),
      onMouseenter: e[2] || (e[2] = (o) => r.value === "hover" ? n(f)() : void 0),
      onMouseleave: e[3] || (e[3] = (o) => r.value === "hover" ? n(p)() : void 0),
      onClick: e[4] || (e[4] = (o) => r.value === "click" ? n(C)() : void 0),
      onFocusin: e[5] || (e[5] = (o) => r.value === "focus" ? n(f)() : void 0),
      onFocusout: e[6] || (e[6] = (o) => r.value === "focus" ? n(p)() : void 0),
      onKeydown: e[7] || (e[7] = //@ts-ignore
      (...o) => n($) && n($)(...o))
    }, [
      N(t.$slots, "default", { contentId: n(w) }, void 0, !0),
      (g(), O(U, { to: "body" }, [
        j(q, { name: "nm-tooltip-fade" }, {
          default: A(() => [
            n(l) && (a.content || t.$slots.content) ? (g(), k("div", {
              key: 0,
              id: n(w),
              ref_key: "contentRef",
              ref: v,
              class: I(M.value),
              style: G(D.value),
              role: "tooltip",
              "aria-hidden": !n(l),
              onMouseenter: e[0] || (e[0] = (o) => r.value === "hover" ? n(f)() : void 0),
              onMouseleave: e[1] || (e[1] = (o) => r.value === "hover" ? n(p)() : void 0)
            }, [
              e[8] || (e[8] = T("span", { class: "nm-tooltip__arrow" }, null, -1)),
              T("span", ne, [
                N(t.$slots, "content", {}, () => [
                  H(J(a.content), 1)
                ], !0)
              ])
            ], 46, oe)) : Q("", !0)
          ]),
          _: 3
        })
      ]))
    ], 34));
  }
}), fe = /* @__PURE__ */ te(ie, [["__scopeId", "data-v-b1fa7774"]]);
export {
  fe as N
};

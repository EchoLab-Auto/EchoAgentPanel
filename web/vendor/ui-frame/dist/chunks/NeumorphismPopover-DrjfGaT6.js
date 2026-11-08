import { defineComponent as de, useCssVars as ve, computed as i, ref as K, onMounted as me, onBeforeUnmount as he, watch as O, nextTick as k, openBlock as $, createElementBlock as S, normalizeClass as W, renderSlot as D, unref as l, createBlock as ge, Teleport as we, createVNode as xe, Transition as be, withCtx as ke, normalizeStyle as $e, createElementVNode as ye, toDisplayString as Te, createCommentVNode as Z } from "vue";
import { usePopover as _e } from "../composables/usePopover.js";
import Me from "../composables/useFloatingPosition.js";
import { u as Ie } from "./createComponent-jnXBYqCm.js";
import { useZIndex as Pe } from "../composables/useZIndex.js";
import { generateId as Re } from "../utils/index.js";
import { _ as Se } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismPopover.css';const Ne = ["id", "role", "aria-hidden"], Ce = { class: "nm-popover__text" }, Ee = {
  key: 0,
  class: "nm-popover__arrow"
}, N = 8, Le = /* @__PURE__ */ de({
  __name: "NeumorphismPopover",
  props: {
    position: {},
    trigger: {},
    disabled: { type: Boolean, default: !1 },
    offset: {},
    width: {},
    content: {},
    showArrow: { type: Boolean, default: void 0 }
  },
  emits: ["visible-change"],
  setup(h, { expose: G, emit: H }) {
    ve((e) => ({
      v4e907992: te.value
    }));
    const a = h, U = H, { config: f, resolveProp: d } = Ie(), j = i(
      () => {
        var e;
        return d(a.position, (e = f.value.popover) == null ? void 0 : e.position, "auto");
      }
    ), r = i(
      () => {
        var e;
        return d(a.trigger, (e = f.value.popover) == null ? void 0 : e.trigger, "click");
      }
    ), g = i(() => {
      var e;
      return d(a.offset, (e = f.value.popover) == null ? void 0 : e.offset, 8);
    }), y = i(() => {
      var e;
      return d(a.width, (e = f.value.popover) == null ? void 0 : e.width, "auto");
    }), q = i(
      () => {
        var e;
        return d(a.showArrow, (e = f.value.popover) == null ? void 0 : e.showArrow, !0);
      }
    ), { getZIndex: J } = Pe(), {
      isOpen: s,
      show: w,
      hide: c,
      toggle: C,
      handleKeydown: Q
    } = _e({
      trigger: r,
      disabled: i(() => a.disabled)
    }), T = { width: 200, height: 120 }, v = K(), m = K(), { actualPlacement: _, rect: X, floatingSize: E, refresh: L, stop: Y } = Me({
      trigger: v,
      open: s,
      placement: i(() => j.value),
      offset: g,
      floating: m,
      estimateSize: T
    });
    function ee(e, t, o) {
      if (typeof window > "u") return;
      const n = E.value.width || T.width, u = E.value.height || T.height, B = window.innerWidth, F = window.innerHeight, x = (I, P, b) => {
        const R = Math.max(N, b - P - N);
        return Math.min(Math.max(I, N), R);
      }, p = _.value;
      if (p === "top" || p === "bottom") {
        const I = p === "top" ? t.top - o - u : t.bottom + o, P = t.left + t.width / 2 - n / 2, b = x(I, u, F), R = x(P, n, B);
        e.top = `${p === "top" ? b + u : b}px`, e.left = `${R + n / 2}px`;
        return;
      }
      const ue = t.top + t.height / 2 - u / 2, pe = p === "left" ? t.left - o - n : t.right + o, fe = x(ue, u, F), V = x(pe, n, B);
      e.top = `${fe + u / 2}px`, e.left = `${p === "left" ? V + n : V}px`;
    }
    const oe = i(() => {
      const e = X.value;
      if (!e) return {};
      const t = g.value, o = {};
      switch (_.value) {
        case "top":
          o.top = `${e.top - t}px`, o.left = `${e.left + e.width / 2}px`, o.transform = "translate(-50%, -100%)";
          break;
        case "bottom":
          o.top = `${e.bottom + t}px`, o.left = `${e.left + e.width / 2}px`, o.transform = "translate(-50%, 0)";
          break;
        case "left":
          o.top = `${e.top + e.height / 2}px`, o.left = `${e.left - t}px`, o.transform = "translate(-100%, -50%)";
          break;
        case "right":
          o.top = `${e.top + e.height / 2}px`, o.left = `${e.right + t}px`, o.transform = "translate(0, -50%)";
          break;
      }
      return ee(o, e, t), y.value === "trigger" ? o.width = `${e.width}px` : typeof y.value == "number" && (o.width = `${y.value}px`), o.zIndex = String(J("popover")), o;
    });
    function z(e) {
      var o, n;
      if (!s.value || a.disabled) return;
      const t = e.target;
      (o = v.value) != null && o.contains(t) || (n = m.value) != null && n.contains(t) || c();
    }
    me(() => {
      typeof document > "u" || document.addEventListener("click", z, !0);
    }), he(() => {
      typeof document > "u" || (document.removeEventListener("click", z, !0), Y());
    }), O(s, (e) => {
      U("visible-change", e), e && k(L);
    }), O(g, () => {
      s.value && k(L);
    });
    const te = i(() => `${g.value}px`), ne = i(() => [
      "nm-popover",
      `nm-popover--${_.value}`,
      { "nm-popover--visible": s.value }
    ]);
    function A(e) {
      Q(e), e.key === "Tab" && s.value && k(() => {
        var o, n;
        if (typeof document > "u") return;
        const t = document.activeElement;
        t instanceof Node && !((o = v.value) != null && o.contains(t)) && !((n = m.value) != null && n.contains(t)) && c();
      });
    }
    function re() {
      r.value === "hover" && w();
    }
    function ie() {
      r.value === "hover" && c();
    }
    function se() {
      r.value === "click" && C();
    }
    function ae() {
      r.value === "focus" && w();
    }
    const M = Re("nm-popover"), le = i(
      () => r.value === "hover" || r.value === "focus"
    );
    G({ show: w, hide: c, toggle: C, isOpen: s, contentId: M });
    function ce(e) {
      r.value === "focus" && k(() => {
        var o, n;
        const t = document.activeElement;
        !((o = v.value) != null && o.contains(t)) && !((n = m.value) != null && n.contains(t)) && c();
      });
    }
    return (e, t) => ($(), S("div", {
      ref_key: "triggerRef",
      ref: v,
      class: W(["nm-popover-wrapper", { "nm-popover-wrapper--disabled": h.disabled }]),
      onMouseenter: re,
      onMouseleave: ie,
      onClick: se,
      onFocusin: ae,
      onFocusout: ce,
      onKeydown: A
    }, [
      D(e.$slots, "default", {
        expanded: l(s),
        contentId: l(M),
        tooltipMode: le.value
      }, void 0, !0),
      ($(), ge(we, { to: "body" }, [
        xe(be, { name: "nm-popover-fade" }, {
          default: ke(() => [
            l(s) && (h.content || e.$slots.content) ? ($(), S("div", {
              key: 0,
              id: l(M),
              ref_key: "popoverRef",
              ref: m,
              class: W(ne.value),
              role: r.value === "hover" || r.value === "focus" ? "tooltip" : "dialog",
              "aria-hidden": !l(s),
              style: $e(oe.value),
              onKeydown: A,
              onMouseenter: t[0] || (t[0] = (o) => r.value === "hover" ? l(w)() : void 0),
              onMouseleave: t[1] || (t[1] = (o) => r.value === "hover" ? l(c)() : void 0)
            }, [
              D(e.$slots, "content", {}, () => [
                ye("span", Ce, Te(h.content), 1)
              ], !0),
              q.value ? ($(), S("span", Ee)) : Z("", !0)
            ], 46, Ne)) : Z("", !0)
          ]),
          _: 3
        })
      ]))
    ], 34));
  }
}), We = /* @__PURE__ */ Se(Le, [["__scopeId", "data-v-e4ab40d9"]]);
export {
  We as N
};

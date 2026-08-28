import { defineComponent as J, useCssVars as Q, computed as r, ref as P, onMounted as X, onBeforeUnmount as Y, watch as C, nextTick as h, openBlock as w, createElementBlock as k, normalizeClass as I, renderSlot as N, unref as l, createBlock as ee, Teleport as oe, createVNode as te, Transition as ne, withCtx as re, normalizeStyle as ie, createElementVNode as se, toDisplayString as ae, createCommentVNode as S } from "vue";
import { usePopover as le } from "../composables/usePopover.js";
import ue from "../composables/useFloatingPosition.js";
import { u as ce } from "./createComponent-jnXBYqCm.js";
import { useZIndex as pe } from "../composables/useZIndex.js";
import { generateId as fe } from "../utils/index.js";
import { _ as ve } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismPopover.css';const de = ["id", "role", "aria-hidden"], me = { class: "nm-popover__text" }, ge = {
  key: 0,
  class: "nm-popover__arrow"
}, he = /* @__PURE__ */ J({
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
  setup(d, { expose: E, emit: B }) {
    Q((e) => ({
      v33a3a590: D.value
    }));
    const a = d, F = B, { config: c, resolveProp: p } = ce(), K = r(
      () => {
        var e;
        return p(a.position, (e = c.value.popover) == null ? void 0 : e.position, "auto");
      }
    ), n = r(
      () => {
        var e;
        return p(a.trigger, (e = c.value.popover) == null ? void 0 : e.trigger, "click");
      }
    ), m = r(() => {
      var e;
      return p(a.offset, (e = c.value.popover) == null ? void 0 : e.offset, 8);
    }), y = r(() => {
      var e;
      return p(a.width, (e = c.value.popover) == null ? void 0 : e.width, "auto");
    }), z = r(
      () => {
        var e;
        return p(a.showArrow, (e = c.value.popover) == null ? void 0 : e.showArrow, !0);
      }
    ), { getZIndex: A } = pe(), {
      isOpen: i,
      show: g,
      hide: u,
      toggle: b,
      handleKeydown: L
    } = le({
      trigger: n,
      disabled: r(() => a.disabled)
    }), f = P(), v = P(), { actualPlacement: $, rect: R, refresh: _, stop: V } = ue({
      trigger: f,
      open: i,
      placement: r(() => K.value),
      offset: m,
      floating: v,
      estimateSize: { width: 200, height: 120 }
    }), O = r(() => {
      const e = R.value;
      if (!e) return {};
      const t = m.value, o = {};
      switch ($.value) {
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
      return y.value === "trigger" ? o.width = `${e.width}px` : typeof y.value == "number" && (o.width = `${y.value}px`), o.zIndex = String(A("popover")), o;
    });
    function T(e) {
      var o, s;
      if (!i.value || a.disabled) return;
      const t = e.target;
      (o = f.value) != null && o.contains(t) || (s = v.value) != null && s.contains(t) || u();
    }
    X(() => {
      typeof document > "u" || document.addEventListener("click", T, !0);
    }), Y(() => {
      typeof document > "u" || (document.removeEventListener("click", T, !0), V());
    }), C(i, (e) => {
      F("visible-change", e), e && h(_);
    }), C(m, () => {
      i.value && h(_);
    });
    const D = r(() => `${m.value}px`), Z = r(() => [
      "nm-popover",
      `nm-popover--${$.value}`,
      { "nm-popover--visible": i.value }
    ]);
    function M(e) {
      L(e), e.key === "Tab" && i.value && h(() => {
        var o, s;
        if (typeof document > "u") return;
        const t = document.activeElement;
        t instanceof Node && !((o = f.value) != null && o.contains(t)) && !((s = v.value) != null && s.contains(t)) && u();
      });
    }
    function U() {
      n.value === "hover" && g();
    }
    function W() {
      n.value === "hover" && u();
    }
    function j() {
      n.value === "click" && b();
    }
    function q() {
      n.value === "focus" && g();
    }
    const x = fe("nm-popover"), G = r(
      () => n.value === "hover" || n.value === "focus"
    );
    E({ show: g, hide: u, toggle: b, isOpen: i, contentId: x });
    function H(e) {
      n.value === "focus" && h(() => {
        var o, s;
        const t = document.activeElement;
        !((o = f.value) != null && o.contains(t)) && !((s = v.value) != null && s.contains(t)) && u();
      });
    }
    return (e, t) => (w(), k("div", {
      ref_key: "triggerRef",
      ref: f,
      class: I(["nm-popover-wrapper", { "nm-popover-wrapper--disabled": d.disabled }]),
      onMouseenter: U,
      onMouseleave: W,
      onClick: j,
      onFocusin: q,
      onFocusout: H,
      onKeydown: M
    }, [
      N(e.$slots, "default", {
        expanded: l(i),
        contentId: l(x),
        tooltipMode: G.value
      }, void 0, !0),
      (w(), ee(oe, { to: "body" }, [
        te(ne, { name: "nm-popover-fade" }, {
          default: re(() => [
            l(i) && (d.content || e.$slots.content) ? (w(), k("div", {
              key: 0,
              id: l(x),
              ref_key: "popoverRef",
              ref: v,
              class: I(Z.value),
              role: n.value === "hover" || n.value === "focus" ? "tooltip" : "dialog",
              "aria-hidden": !l(i),
              style: ie(O.value),
              onKeydown: M,
              onMouseenter: t[0] || (t[0] = (o) => n.value === "hover" ? l(g)() : void 0),
              onMouseleave: t[1] || (t[1] = (o) => n.value === "hover" ? l(u)() : void 0)
            }, [
              N(e.$slots, "content", {}, () => [
                se("span", me, ae(d.content), 1)
              ], !0),
              z.value ? (w(), k("span", ge)) : S("", !0)
            ], 46, de)) : S("", !0)
          ]),
          _: 3
        })
      ]))
    ], 34));
  }
}), Te = /* @__PURE__ */ ve(he, [["__scopeId", "data-v-1ec59068"]]);
export {
  Te as N
};

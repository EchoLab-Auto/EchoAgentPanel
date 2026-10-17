import { defineComponent as Be, computed as v, ref as d, watch as Re, onMounted as Ve, onBeforeUnmount as Ze, openBlock as g, createElementBlock as b, normalizeStyle as $, normalizeClass as T, renderSlot as J, createCommentVNode as D, createElementVNode as _, unref as y, createVNode as L, toDisplayString as $e, nextTick as ue } from "vue";
import { useLocale as Ie } from "../composables/useLocale.js";
import { u as Fe } from "./createComponent-jnXBYqCm.js";
import { N as C } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as Ne } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismCanvas.css';const Pe = {
  key: 0,
  class: "nm-canvas__toolbar"
}, Te = ["aria-label"], De = {
  key: 1,
  class: "nm-canvas__controls"
}, We = ["aria-label", "disabled"], Ae = { class: "nm-canvas__zoom-text" }, He = ["aria-label", "disabled"], Ke = ["aria-label"], Xe = ["aria-label"], Ye = ["aria-label"], Ge = /* @__PURE__ */ Be({
  __name: "NeumorphismCanvas",
  props: {
    modelValue: { default: 1 },
    minZoom: { default: 0.1 },
    maxZoom: { default: 5 },
    zoomStep: { default: 0.1 },
    showGrid: { type: Boolean, default: void 0 },
    gridSize: {},
    gridVariant: { default: void 0 },
    showControls: { type: Boolean, default: void 0 },
    showFit: { type: Boolean, default: !0 },
    showFullscreen: { type: Boolean, default: !0 },
    panOnDrag: { type: Boolean, default: !0 },
    wheelZoom: { type: Boolean, default: !0 },
    infinite: { type: Boolean, default: void 0 },
    contentBounds: {},
    width: { default: "100%" },
    height: { default: "500px" }
  },
  emits: ["update:modelValue", "zoom-change"],
  setup(E, { expose: re, emit: ce }) {
    const s = E, { config: S, resolveProp: M } = Fe(), ve = v(
      () => {
        var e;
        return M(s.showGrid, (e = S.value.canvas) == null ? void 0 : e.showGrid, !0);
      }
    ), de = v(
      () => {
        var e;
        return M(s.gridSize, (e = S.value.canvas) == null ? void 0 : e.gridSize, 20);
      }
    ), fe = v(
      () => {
        var e;
        return M(s.gridVariant, (e = S.value.canvas) == null ? void 0 : e.gridVariant, "dots");
      }
    ), me = v(
      () => {
        var e;
        return M(s.showControls, (e = S.value.canvas) == null ? void 0 : e.showControls, !0);
      }
    ), i = v(
      () => {
        var e;
        return M(s.infinite, (e = S.value.canvas) == null ? void 0 : e.infinite, !1);
      }
    ), I = ce, { t: h } = Ie(), l = d(s.modelValue);
    Re(
      () => s.modelValue,
      (e) => {
        e !== l.value && (l.value = W(e));
      }
    );
    const pe = v(() => Math.round(l.value * 100));
    function W(e) {
      return Math.min(s.maxZoom, Math.max(s.minZoom, Math.round(e * 1e3) / 1e3));
    }
    const F = d(), u = d(), B = d(), x = d(0), z = d(0);
    let N = null;
    const w = d(!0), r = d(0), c = d(0);
    function R(e, t, n = !0) {
      const a = W(e);
      if (a === l.value) return;
      const o = u.value;
      if (o && i.value) {
        const f = (t == null ? void 0 : t.x) ?? o.clientWidth / 2, m = (t == null ? void 0 : t.y) ?? o.clientHeight / 2, k = a / l.value;
        r.value = f - (f - r.value) * k, c.value = m - (m - c.value) * k;
      } else if (o) {
        const f = (t == null ? void 0 : t.x) ?? o.clientWidth / 2, m = (t == null ? void 0 : t.y) ?? o.clientHeight / 2;
        N = {
          ax: f,
          ay: m,
          cx: (o.scrollLeft + f) / l.value,
          cy: (o.scrollTop + m) / l.value
        };
      }
      w.value = n, l.value = a, I("update:modelValue", a), I("zoom-change", a), i.value || ue(he);
    }
    function he() {
      const e = u.value;
      if (!e || !N) return;
      const { ax: t, ay: n, cx: a, cy: o } = N;
      N = null, e.scrollLeft = a * l.value - t, e.scrollTop = o * l.value - n;
    }
    function A() {
      R(l.value + s.zoomStep);
    }
    function H() {
      R(l.value - s.zoomStep);
    }
    function K() {
      R(1);
    }
    function we() {
      const e = B.value, t = u.value;
      if (!e || !t || e.children.length === 0) return null;
      const n = t.getBoundingClientRect(), a = l.value;
      let o = 1 / 0, f = 1 / 0, m = -1 / 0, k = -1 / 0;
      for (const Me of Array.from(e.children)) {
        const P = Me.getBoundingClientRect();
        o = Math.min(o, (P.left - n.left - r.value) / a), f = Math.min(f, (P.top - n.top - c.value) / a), m = Math.max(m, (P.right - n.left - r.value) / a), k = Math.max(k, (P.bottom - n.top - c.value) / a);
      }
      return Number.isFinite(o) ? { x: o, y: f, w: m - o, h: k - f } : null;
    }
    function X() {
      const e = u.value;
      if (!e) return;
      const t = 32;
      if (i.value) {
        const a = s.contentBounds ?? we();
        if (!a || !a.w || !a.h) return;
        const o = W(Math.min((e.clientWidth - t) / a.w, (e.clientHeight - t) / a.h));
        w.value = !0, o !== l.value && (l.value = o, I("update:modelValue", o), I("zoom-change", o)), r.value = (e.clientWidth - a.w * o) / 2 - a.x * o, c.value = (e.clientHeight - a.h * o) / 2 - a.y * o;
        return;
      }
      if (!x.value || !z.value) return;
      const n = Math.min(
        (e.clientWidth - t) / x.value,
        (e.clientHeight - t) / z.value
      );
      R(n, void 0, !0), ue(() => {
        const a = u.value;
        a && (a.scrollLeft = Math.max(0, (x.value * l.value - a.clientWidth) / 2), a.scrollTop = Math.max(0, (z.value * l.value - a.clientHeight) / 2));
      });
    }
    function Y() {
      X();
    }
    const G = d(!1), O = d(!1), U = d(!1), Q = v(() => s.panOnDrag || O.value);
    let p = null, q = !1;
    function ye(e) {
      const t = u.value;
      if (!t || e.button !== 0 || !Q.value || e.pointerType === "touch" && !i.value) return;
      const n = e.target;
      n != null && n.closest(".nm-canvas__controls, button, a, input, textarea, select, [data-nm-no-pan]") || (p = {
        pointerId: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        left: i.value ? r.value : t.scrollLeft,
        top: i.value ? c.value : t.scrollTop
      }, q = !1, e.preventDefault(), window.addEventListener("pointermove", ee), window.addEventListener("pointerup", V), window.addEventListener("pointercancel", V));
    }
    function ee(e) {
      const t = u.value;
      if (!t || !p || e.pointerId !== p.pointerId) return;
      const n = e.clientX - p.x, a = e.clientY - p.y;
      !q && Math.hypot(n, a) < 4 || (q = !0, G.value = !0, i.value ? (w.value = !1, r.value = p.left + n, c.value = p.top + a) : (t.scrollLeft = p.left - n, t.scrollTop = p.top - a));
    }
    function V() {
      p = null, G.value = !1, window.removeEventListener("pointermove", ee), window.removeEventListener("pointerup", V), window.removeEventListener("pointercancel", V);
    }
    function te(e) {
      var a;
      if (e.code !== "Space") return;
      const t = document.activeElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable))
        return;
      const n = !!(t && ((a = F.value) != null && a.contains(t)));
      !U.value && !n || (O.value = !0, e.preventDefault());
    }
    function ne(e) {
      e.code === "Space" && (O.value = !1);
    }
    function ae(e) {
      const t = u.value;
      if (!t) return;
      const n = e.deltaMode === 1 ? 16 : 1;
      if (s.wheelZoom && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const a = Math.exp(-e.deltaY * n * 2e-3), o = t.getBoundingClientRect();
        R(l.value * a, { x: e.clientX - o.left, y: e.clientY - o.top }, !1);
        return;
      }
      i.value && (e.preventDefault(), w.value = !1, r.value -= e.deltaX * n, c.value -= e.deltaY * n);
    }
    function ge(e) {
      const t = u.value;
      if (!t) return;
      const n = e.shiftKey ? 200 : 60, a = i.value, o = (f, m) => {
        w.value = !1, r.value += f, c.value += m;
      };
      switch (e.key) {
        case "ArrowUp":
          a ? o(0, n) : t.scrollTop -= n;
          break;
        case "ArrowDown":
          a ? o(0, -n) : t.scrollTop += n;
          break;
        case "ArrowLeft":
          a ? o(n, 0) : t.scrollLeft -= n;
          break;
        case "ArrowRight":
          a ? o(-n, 0) : t.scrollLeft += n;
          break;
        case "+":
        case "=":
          A();
          break;
        case "-":
        case "_":
          H();
          break;
        case "0":
          a ? Y() : K();
          break;
        default:
          return;
      }
      e.preventDefault();
    }
    const j = d(!1);
    function oe() {
      j.value = document.fullscreenElement === F.value;
    }
    function le() {
      var e, t, n;
      document.fullscreenElement ? (n = document.exitFullscreen) == null || n.call(document) : (t = (e = F.value) == null ? void 0 : e.requestFullscreen) == null || t.call(e);
    }
    let Z;
    Ve(() => {
      const e = B.value, t = u.value;
      e && (x.value = e.offsetWidth, z.value = e.offsetHeight, typeof ResizeObserver < "u" && (Z = new ResizeObserver(() => {
        const n = B.value;
        n && (x.value = n.offsetWidth, z.value = n.offsetHeight);
      }), Z.observe(e))), t == null || t.addEventListener("wheel", ae, { passive: !1 }), window.addEventListener("keydown", te), window.addEventListener("keyup", ne), document.addEventListener("fullscreenchange", oe);
    }), Ze(() => {
      var e;
      Z == null || Z.disconnect(), (e = u.value) == null || e.removeEventListener("wheel", ae), window.removeEventListener("keydown", te), window.removeEventListener("keyup", ne), document.removeEventListener("fullscreenchange", oe), V();
    });
    function be(e, t) {
      i.value && (w.value = !1, r.value += e, c.value += t);
    }
    function _e() {
      return { panX: r.value, panY: c.value, zoom: l.value };
    }
    function xe(e, t) {
      const n = u.value;
      if (!n) return { x: 0, y: 0, zoom: l.value };
      const a = n.getBoundingClientRect(), o = l.value;
      return i.value ? {
        x: (e - a.left - r.value) / o,
        y: (t - a.top - c.value) / o,
        zoom: o
      } : {
        x: (e - a.left + n.scrollLeft) / o,
        y: (t - a.top + n.scrollTop) / o,
        zoom: o
      };
    }
    function ze() {
      var e;
      return ((e = u.value) == null ? void 0 : e.getBoundingClientRect()) ?? null;
    }
    const ke = v(() => ({
      width: `${Math.ceil(x.value * l.value)}px`,
      height: `${Math.ceil(z.value * l.value)}px`
    })), ie = v(() => {
      if (!ve.value) return {};
      const e = Math.max(de.value * l.value, 3), n = {
        backgroundImage: fe.value === "lines" ? `linear-gradient(to right, var(--nm-border-subtle) 1px, transparent 1px),
         linear-gradient(to bottom, var(--nm-border-subtle) 1px, transparent 1px)` : "radial-gradient(circle, var(--nm-canvas-grid-color) 1px, transparent 1.2px)",
        backgroundSize: `${e}px ${e}px`,
        backgroundPosition: "0 0"
      };
      return i.value && (n.backgroundPosition = `${r.value % e}px ${c.value % e}px`), n;
    }), Le = v(() => i.value ? ie.value : {}), se = v(() => ({
      transform: i.value ? `translate(${r.value}px, ${c.value}px) scale(${l.value})` : `scale(${l.value})`
    })), Ce = v(() => ({
      width: s.width,
      height: s.height
    })), Ee = v(() => ({
      "nm-canvas__viewport--pannable": Q.value,
      "nm-canvas__viewport--panning": G.value,
      "nm-canvas__viewport--infinite": i.value
    })), Se = v(() => ["nm-canvas", { "nm-canvas--fullscreen": j.value }]);
    return re({
      zoomIn: A,
      zoomOut: H,
      resetZoom: K,
      fit: X,
      resetView: Y,
      toggleFullscreen: le,
      panBy: be,
      getView: _e,
      toCanvasCoords: xe,
      getViewportRect: ze
    }), (e, t) => (g(), b("div", {
      ref_key: "rootRef",
      ref: F,
      class: T(Se.value),
      style: $(Ce.value)
    }, [
      e.$slots.toolbar ? (g(), b("div", Pe, [
        J(e.$slots, "toolbar", {}, void 0, !0)
      ])) : D("", !0),
      _("div", {
        ref_key: "viewportRef",
        ref: u,
        class: T(["nm-canvas__viewport", Ee.value]),
        style: $(Le.value),
        tabindex: "0",
        role: "application",
        "aria-label": y(h)("canvasLabel"),
        onPointerdown: ye,
        onPointerenter: t[0] || (t[0] = (n) => U.value = !0),
        onPointerleave: t[1] || (t[1] = (n) => U.value = !1),
        onKeydown: ge
      }, [
        i.value ? (g(), b("div", {
          key: 0,
          ref_key: "contentRef",
          ref: B,
          class: T(["nm-canvas__content", { "nm-canvas__content--smooth": w.value }]),
          style: $(se.value)
        }, [
          J(e.$slots, "default", {}, void 0, !0)
        ], 6)) : (g(), b("div", {
          key: 1,
          class: "nm-canvas__sizer",
          style: $([ke.value, ie.value])
        }, [
          _("div", {
            ref_key: "contentRef",
            ref: B,
            class: T(["nm-canvas__content", { "nm-canvas__content--smooth": w.value }]),
            style: $(se.value)
          }, [
            J(e.$slots, "default", {}, void 0, !0)
          ], 6)
        ], 4))
      ], 46, Te),
      me.value ? (g(), b("div", De, [
        _("button", {
          type: "button",
          class: "nm-canvas__btn",
          "aria-label": y(h)("canvasZoomOut"),
          disabled: l.value <= E.minZoom,
          onClick: H
        }, [
          L(C, {
            name: "zoom-out",
            size: "md"
          })
        ], 8, We),
        _("span", Ae, $e(pe.value) + "%", 1),
        _("button", {
          type: "button",
          class: "nm-canvas__btn",
          "aria-label": y(h)("canvasZoomIn"),
          disabled: l.value >= E.maxZoom,
          onClick: A
        }, [
          L(C, {
            name: "zoom-in",
            size: "md"
          })
        ], 8, He),
        t[3] || (t[3] = _("span", {
          class: "nm-canvas__divider",
          "aria-hidden": "true"
        }, null, -1)),
        _("button", {
          type: "button",
          class: "nm-canvas__btn nm-canvas__btn--reset",
          "aria-label": i.value ? y(h)("canvasResetView") : y(h)("canvasZoomReset"),
          onClick: t[2] || (t[2] = (n) => i.value ? Y() : K())
        }, [
          L(C, {
            name: "refresh",
            size: "md"
          })
        ], 8, Ke),
        E.showFit ? (g(), b("button", {
          key: 0,
          type: "button",
          class: "nm-canvas__btn",
          "aria-label": y(h)("canvasZoomFit"),
          onClick: X
        }, [
          L(C, {
            name: "maximize",
            size: "md"
          })
        ], 8, Xe)) : D("", !0),
        E.showFullscreen ? (g(), b("button", {
          key: 1,
          type: "button",
          class: "nm-canvas__btn",
          "aria-label": j.value ? y(h)("canvasExitFullscreen") : y(h)("canvasFullscreen"),
          onClick: le
        }, [
          L(C, {
            name: "arrows-out",
            size: "md"
          }),
          L(C, {
            name: "minimize",
            size: "md"
          })
        ], 8, Ye)) : D("", !0)
      ])) : D("", !0)
    ], 6));
  }
}), Qe = /* @__PURE__ */ Ne(Ge, [["__scopeId", "data-v-61ee3f10"]]);
export {
  Qe as N
};

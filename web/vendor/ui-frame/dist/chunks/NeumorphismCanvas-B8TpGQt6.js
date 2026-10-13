import { defineComponent as Be, computed as d, ref as f, watch as Ee, onMounted as Se, onBeforeUnmount as Re, openBlock as h, createElementBlock as g, normalizeStyle as V, normalizeClass as T, renderSlot as U, createCommentVNode as D, createElementVNode as s, unref as b, toDisplayString as Ve, nextTick as se } from "vue";
import { useLocale as Ze } from "../composables/useLocale.js";
import { u as $e } from "./createComponent-jnXBYqCm.js";
import { _ as Ie } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismCanvas.css';const Fe = {
  key: 0,
  class: "nm-canvas__toolbar"
}, Pe = ["aria-label"], Te = {
  key: 1,
  class: "nm-canvas__controls"
}, De = ["aria-label", "disabled"], He = { class: "nm-canvas__zoom-text" }, We = ["aria-label", "disabled"], Ne = ["aria-label"], Ae = ["aria-label"], Ke = ["aria-label"], Xe = {
  key: 0,
  viewBox: "0 0 24 24",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg"
}, Ye = {
  key: 1,
  viewBox: "0 0 24 24",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg"
}, Ge = /* @__PURE__ */ Be({
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
  setup(C, { expose: ie, emit: re }) {
    const r = C, { config: z, resolveProp: L } = $e(), ue = d(
      () => {
        var e;
        return L(r.showGrid, (e = z.value.canvas) == null ? void 0 : e.showGrid, !0);
      }
    ), ve = d(
      () => {
        var e;
        return L(r.gridSize, (e = z.value.canvas) == null ? void 0 : e.gridSize, 20);
      }
    ), ce = d(
      () => {
        var e;
        return L(r.gridVariant, (e = z.value.canvas) == null ? void 0 : e.gridVariant, "dots");
      }
    ), de = d(
      () => {
        var e;
        return L(r.showControls, (e = z.value.canvas) == null ? void 0 : e.showControls, !0);
      }
    ), i = d(
      () => {
        var e;
        return L(r.infinite, (e = z.value.canvas) == null ? void 0 : e.infinite, !1);
      }
    ), Z = re, { t: y } = Ze(), a = f(r.modelValue);
    Ee(
      () => r.modelValue,
      (e) => {
        e !== a.value && (a.value = H(e));
      }
    );
    const fe = d(() => Math.round(a.value * 100));
    function H(e) {
      return Math.min(r.maxZoom, Math.max(r.minZoom, Math.round(e * 1e3) / 1e3));
    }
    const $ = f(), u = f(), B = f(), x = f(0), _ = f(0);
    let I = null;
    const k = f(!0), v = f(0), c = f(0);
    function E(e, t, n = !0) {
      const o = H(e);
      if (o === a.value) return;
      const l = u.value;
      if (l && i.value) {
        const p = (t == null ? void 0 : t.x) ?? l.clientWidth / 2, m = (t == null ? void 0 : t.y) ?? l.clientHeight / 2, M = o / a.value;
        v.value = p - (p - v.value) * M, c.value = m - (m - c.value) * M;
      } else if (l) {
        const p = (t == null ? void 0 : t.x) ?? l.clientWidth / 2, m = (t == null ? void 0 : t.y) ?? l.clientHeight / 2;
        I = {
          ax: p,
          ay: m,
          cx: (l.scrollLeft + p) / a.value,
          cy: (l.scrollTop + m) / a.value
        };
      }
      k.value = n, a.value = o, Z("update:modelValue", o), Z("zoom-change", o), i.value || se(pe);
    }
    function pe() {
      const e = u.value;
      if (!e || !I) return;
      const { ax: t, ay: n, cx: o, cy: l } = I;
      I = null, e.scrollLeft = o * a.value - t, e.scrollTop = l * a.value - n;
    }
    function W() {
      E(a.value + r.zoomStep);
    }
    function N() {
      E(a.value - r.zoomStep);
    }
    function A() {
      E(1);
    }
    function me() {
      const e = B.value, t = u.value;
      if (!e || !t || e.children.length === 0) return null;
      const n = t.getBoundingClientRect(), o = a.value;
      let l = 1 / 0, p = 1 / 0, m = -1 / 0, M = -1 / 0;
      for (const Le of Array.from(e.children)) {
        const P = Le.getBoundingClientRect();
        l = Math.min(l, (P.left - n.left - v.value) / o), p = Math.min(p, (P.top - n.top - c.value) / o), m = Math.max(m, (P.right - n.left - v.value) / o), M = Math.max(M, (P.bottom - n.top - c.value) / o);
      }
      return Number.isFinite(l) ? { x: l, y: p, w: m - l, h: M - p } : null;
    }
    function K() {
      const e = u.value;
      if (!e) return;
      const t = 32;
      if (i.value) {
        const o = r.contentBounds ?? me();
        if (!o || !o.w || !o.h) return;
        const l = H(Math.min((e.clientWidth - t) / o.w, (e.clientHeight - t) / o.h));
        k.value = !0, l !== a.value && (a.value = l, Z("update:modelValue", l), Z("zoom-change", l)), v.value = (e.clientWidth - o.w * l) / 2 - o.x * l, c.value = (e.clientHeight - o.h * l) / 2 - o.y * l;
        return;
      }
      if (!x.value || !_.value) return;
      const n = Math.min(
        (e.clientWidth - t) / x.value,
        (e.clientHeight - t) / _.value
      );
      E(n, void 0, !0), se(() => {
        const o = u.value;
        o && (o.scrollLeft = Math.max(0, (x.value * a.value - o.clientWidth) / 2), o.scrollTop = Math.max(0, (_.value * a.value - o.clientHeight) / 2));
      });
    }
    function X() {
      K();
    }
    const Y = f(!1), G = f(!1), j = f(!1), q = d(() => r.panOnDrag || G.value);
    let w = null, O = !1;
    function we(e) {
      const t = u.value;
      if (!t || e.button !== 0 || !q.value || e.pointerType === "touch" && !i.value) return;
      const n = e.target;
      n != null && n.closest(".nm-canvas__controls, button, a, input, textarea, select, [data-nm-no-pan]") || (w = {
        pointerId: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        left: i.value ? v.value : t.scrollLeft,
        top: i.value ? c.value : t.scrollTop
      }, O = !1, e.preventDefault(), window.addEventListener("pointermove", J), window.addEventListener("pointerup", S), window.addEventListener("pointercancel", S));
    }
    function J(e) {
      const t = u.value;
      if (!t || !w || e.pointerId !== w.pointerId) return;
      const n = e.clientX - w.x, o = e.clientY - w.y;
      !O && Math.hypot(n, o) < 4 || (O = !0, Y.value = !0, i.value ? (k.value = !1, v.value = w.left + n, c.value = w.top + o) : (t.scrollLeft = w.left - n, t.scrollTop = w.top - o));
    }
    function S() {
      w = null, Y.value = !1, window.removeEventListener("pointermove", J), window.removeEventListener("pointerup", S), window.removeEventListener("pointercancel", S);
    }
    function Q(e) {
      var o;
      if (e.code !== "Space") return;
      const t = document.activeElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable))
        return;
      const n = !!(t && ((o = $.value) != null && o.contains(t)));
      !j.value && !n || (G.value = !0, e.preventDefault());
    }
    function ee(e) {
      e.code === "Space" && (G.value = !1);
    }
    function te(e) {
      const t = u.value;
      if (!t) return;
      const n = e.deltaMode === 1 ? 16 : 1;
      if (r.wheelZoom && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const o = Math.exp(-e.deltaY * n * 2e-3), l = t.getBoundingClientRect();
        E(a.value * o, { x: e.clientX - l.left, y: e.clientY - l.top }, !1);
        return;
      }
      i.value && (e.preventDefault(), k.value = !1, v.value -= e.deltaX * n, c.value -= e.deltaY * n);
    }
    function he(e) {
      const t = u.value;
      if (!t) return;
      const n = e.shiftKey ? 200 : 60, o = i.value, l = (p, m) => {
        k.value = !1, v.value += p, c.value += m;
      };
      switch (e.key) {
        case "ArrowUp":
          o ? l(0, n) : t.scrollTop -= n;
          break;
        case "ArrowDown":
          o ? l(0, -n) : t.scrollTop += n;
          break;
        case "ArrowLeft":
          o ? l(n, 0) : t.scrollLeft -= n;
          break;
        case "ArrowRight":
          o ? l(-n, 0) : t.scrollLeft += n;
          break;
        case "+":
        case "=":
          W();
          break;
        case "-":
        case "_":
          N();
          break;
        case "0":
          o ? X() : A();
          break;
        default:
          return;
      }
      e.preventDefault();
    }
    const F = f(!1);
    function ne() {
      F.value = document.fullscreenElement === $.value;
    }
    function oe() {
      var e, t, n;
      document.fullscreenElement ? (n = document.exitFullscreen) == null || n.call(document) : (t = (e = $.value) == null ? void 0 : e.requestFullscreen) == null || t.call(e);
    }
    let R;
    Se(() => {
      const e = B.value, t = u.value;
      e && (x.value = e.offsetWidth, _.value = e.offsetHeight, typeof ResizeObserver < "u" && (R = new ResizeObserver(() => {
        const n = B.value;
        n && (x.value = n.offsetWidth, _.value = n.offsetHeight);
      }), R.observe(e))), t == null || t.addEventListener("wheel", te, { passive: !1 }), window.addEventListener("keydown", Q), window.addEventListener("keyup", ee), document.addEventListener("fullscreenchange", ne);
    }), Re(() => {
      var e;
      R == null || R.disconnect(), (e = u.value) == null || e.removeEventListener("wheel", te), window.removeEventListener("keydown", Q), window.removeEventListener("keyup", ee), document.removeEventListener("fullscreenchange", ne), S();
    });
    function ge(e, t) {
      i.value && (k.value = !1, v.value += e, c.value += t);
    }
    function ye() {
      return { panX: v.value, panY: c.value, zoom: a.value };
    }
    function ke(e, t) {
      const n = u.value;
      if (!n) return { x: 0, y: 0, zoom: a.value };
      const o = n.getBoundingClientRect(), l = a.value;
      return i.value ? {
        x: (e - o.left - v.value) / l,
        y: (t - o.top - c.value) / l,
        zoom: l
      } : {
        x: (e - o.left + n.scrollLeft) / l,
        y: (t - o.top + n.scrollTop) / l,
        zoom: l
      };
    }
    function be() {
      var e;
      return ((e = u.value) == null ? void 0 : e.getBoundingClientRect()) ?? null;
    }
    const xe = d(() => ({
      width: `${Math.ceil(x.value * a.value)}px`,
      height: `${Math.ceil(_.value * a.value)}px`
    })), le = d(() => {
      if (!ue.value) return {};
      const e = Math.max(ve.value * a.value, 3), n = {
        backgroundImage: ce.value === "lines" ? `linear-gradient(to right, var(--nm-border-subtle) 1px, transparent 1px),
         linear-gradient(to bottom, var(--nm-border-subtle) 1px, transparent 1px)` : "radial-gradient(circle, var(--nm-canvas-grid-color) 1px, transparent 1.2px)",
        backgroundSize: `${e}px ${e}px`,
        backgroundPosition: "0 0"
      };
      return i.value && (n.backgroundPosition = `${v.value % e}px ${c.value % e}px`), n;
    }), _e = d(() => i.value ? le.value : {}), ae = d(() => ({
      transform: i.value ? `translate(${v.value}px, ${c.value}px) scale(${a.value})` : `scale(${a.value})`
    })), Me = d(() => ({
      width: r.width,
      height: r.height
    })), Ce = d(() => ({
      "nm-canvas__viewport--pannable": q.value,
      "nm-canvas__viewport--panning": Y.value,
      "nm-canvas__viewport--infinite": i.value
    })), ze = d(() => ["nm-canvas", { "nm-canvas--fullscreen": F.value }]);
    return ie({
      zoomIn: W,
      zoomOut: N,
      resetZoom: A,
      fit: K,
      resetView: X,
      toggleFullscreen: oe,
      panBy: ge,
      getView: ye,
      toCanvasCoords: ke,
      getViewportRect: be
    }), (e, t) => (h(), g("div", {
      ref_key: "rootRef",
      ref: $,
      class: T(ze.value),
      style: V(Me.value)
    }, [
      e.$slots.toolbar ? (h(), g("div", Fe, [
        U(e.$slots, "toolbar", {}, void 0, !0)
      ])) : D("", !0),
      s("div", {
        ref_key: "viewportRef",
        ref: u,
        class: T(["nm-canvas__viewport", Ce.value]),
        style: V(_e.value),
        tabindex: "0",
        role: "application",
        "aria-label": b(y)("canvasLabel"),
        onPointerdown: we,
        onPointerenter: t[0] || (t[0] = (n) => j.value = !0),
        onPointerleave: t[1] || (t[1] = (n) => j.value = !1),
        onKeydown: he
      }, [
        i.value ? (h(), g("div", {
          key: 0,
          ref_key: "contentRef",
          ref: B,
          class: T(["nm-canvas__content", { "nm-canvas__content--smooth": k.value }]),
          style: V(ae.value)
        }, [
          U(e.$slots, "default", {}, void 0, !0)
        ], 6)) : (h(), g("div", {
          key: 1,
          class: "nm-canvas__sizer",
          style: V([xe.value, le.value])
        }, [
          s("div", {
            ref_key: "contentRef",
            ref: B,
            class: T(["nm-canvas__content", { "nm-canvas__content--smooth": k.value }]),
            style: V(ae.value)
          }, [
            U(e.$slots, "default", {}, void 0, !0)
          ], 6)
        ], 4))
      ], 46, Pe),
      de.value ? (h(), g("div", Te, [
        s("button", {
          type: "button",
          class: "nm-canvas__btn",
          "aria-label": b(y)("canvasZoomOut"),
          disabled: a.value <= C.minZoom,
          onClick: N
        }, [...t[3] || (t[3] = [
          s("svg", {
            viewBox: "0 0 24 24",
            fill: "none",
            xmlns: "http://www.w3.org/2000/svg"
          }, [
            s("circle", {
              cx: "11",
              cy: "11",
              r: "8",
              stroke: "currentColor",
              "stroke-width": "2"
            }),
            s("path", {
              d: "M8 11h6M21 21l-4.35-4.35",
              stroke: "currentColor",
              "stroke-width": "2",
              "stroke-linecap": "round"
            })
          ], -1)
        ])], 8, De),
        s("span", He, Ve(fe.value) + "%", 1),
        s("button", {
          type: "button",
          class: "nm-canvas__btn",
          "aria-label": b(y)("canvasZoomIn"),
          disabled: a.value >= C.maxZoom,
          onClick: W
        }, [...t[4] || (t[4] = [
          s("svg", {
            viewBox: "0 0 24 24",
            fill: "none",
            xmlns: "http://www.w3.org/2000/svg"
          }, [
            s("circle", {
              cx: "11",
              cy: "11",
              r: "8",
              stroke: "currentColor",
              "stroke-width": "2"
            }),
            s("path", {
              d: "M11 8v6M8 11h6M21 21l-4.35-4.35",
              stroke: "currentColor",
              "stroke-width": "2",
              "stroke-linecap": "round"
            })
          ], -1)
        ])], 8, We),
        t[9] || (t[9] = s("span", {
          class: "nm-canvas__divider",
          "aria-hidden": "true"
        }, null, -1)),
        s("button", {
          type: "button",
          class: "nm-canvas__btn nm-canvas__btn--reset",
          "aria-label": i.value ? b(y)("canvasResetView") : b(y)("canvasZoomReset"),
          onClick: t[2] || (t[2] = (n) => i.value ? X() : A())
        }, [...t[5] || (t[5] = [
          s("svg", {
            viewBox: "0 0 24 24",
            fill: "none",
            xmlns: "http://www.w3.org/2000/svg"
          }, [
            s("path", {
              d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",
              stroke: "currentColor",
              "stroke-width": "2",
              "stroke-linecap": "round",
              "stroke-linejoin": "round"
            }),
            s("path", {
              d: "M3 3v5h5",
              stroke: "currentColor",
              "stroke-width": "2",
              "stroke-linecap": "round",
              "stroke-linejoin": "round"
            })
          ], -1)
        ])], 8, Ne),
        C.showFit ? (h(), g("button", {
          key: 0,
          type: "button",
          class: "nm-canvas__btn",
          "aria-label": b(y)("canvasZoomFit"),
          onClick: K
        }, [...t[6] || (t[6] = [
          s("svg", {
            viewBox: "0 0 24 24",
            fill: "none",
            xmlns: "http://www.w3.org/2000/svg"
          }, [
            s("path", {
              d: "M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3",
              stroke: "currentColor",
              "stroke-width": "2",
              "stroke-linecap": "round",
              "stroke-linejoin": "round"
            })
          ], -1)
        ])], 8, Ae)) : D("", !0),
        C.showFullscreen ? (h(), g("button", {
          key: 1,
          type: "button",
          class: "nm-canvas__btn",
          "aria-label": F.value ? b(y)("canvasExitFullscreen") : b(y)("canvasFullscreen"),
          onClick: oe
        }, [
          F.value ? (h(), g("svg", Ye, [...t[8] || (t[8] = [
            s("path", {
              d: "M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3",
              stroke: "currentColor",
              "stroke-width": "2",
              "stroke-linecap": "round",
              "stroke-linejoin": "round"
            }, null, -1)
          ])])) : (h(), g("svg", Xe, [...t[7] || (t[7] = [
            s("path", {
              d: "M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7",
              stroke: "currentColor",
              "stroke-width": "2",
              "stroke-linecap": "round",
              "stroke-linejoin": "round"
            }, null, -1)
          ])]))
        ], 8, Ke)) : D("", !0)
      ])) : D("", !0)
    ], 6));
  }
}), Je = /* @__PURE__ */ Ie(Ge, [["__scopeId", "data-v-dcbb1fb0"]]);
export {
  Je as N
};

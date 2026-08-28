import { defineComponent as fe, computed as s, ref as u, watch as we, onMounted as he, onBeforeUnmount as ge, openBlock as p, createElementBlock as m, normalizeStyle as T, normalizeClass as D, renderSlot as q, createCommentVNode as E, createElementVNode as o, unref as f, toDisplayString as ke, nextTick as J } from "vue";
import { useLocale as be } from "../composables/useLocale.js";
import { u as ye } from "./createComponent-jnXBYqCm.js";
import { _ as xe } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismCanvas.css';const _e = {
  key: 0,
  class: "nm-canvas__toolbar"
}, Me = ["aria-label"], Ce = {
  key: 1,
  class: "nm-canvas__controls"
}, Le = ["aria-label", "disabled"], Ee = { class: "nm-canvas__zoom-text" }, ze = ["aria-label", "disabled"], Se = ["aria-label"], Ze = ["aria-label"], Be = ["aria-label"], Ve = {
  key: 0,
  viewBox: "0 0 24 24",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg"
}, Fe = {
  key: 1,
  viewBox: "0 0 24 24",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg"
}, Pe = /* @__PURE__ */ fe({
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
    width: { default: "100%" },
    height: { default: "500px" }
  },
  emits: ["update:modelValue", "zoom-change"],
  setup(g, { expose: Q, emit: ee }) {
    const r = g, { config: x, resolveProp: _ } = ye(), te = s(
      () => {
        var e;
        return _(r.showGrid, (e = x.value.canvas) == null ? void 0 : e.showGrid, !0);
      }
    ), ne = s(
      () => {
        var e;
        return _(r.gridSize, (e = x.value.canvas) == null ? void 0 : e.gridSize, 20);
      }
    ), oe = s(
      () => {
        var e;
        return _(r.gridVariant, (e = x.value.canvas) == null ? void 0 : e.gridVariant, "dots");
      }
    ), ae = s(
      () => {
        var e;
        return _(r.showControls, (e = x.value.canvas) == null ? void 0 : e.showControls, !0);
      }
    ), $ = ee, { t: d } = be(), a = u(r.modelValue);
    we(
      () => r.modelValue,
      (e) => {
        e !== a.value && (a.value = H(e));
      }
    );
    const le = s(() => Math.round(a.value * 100));
    function H(e) {
      return Math.min(r.maxZoom, Math.max(r.minZoom, Math.round(e * 1e3) / 1e3));
    }
    const M = u(), i = u(), z = u(), w = u(0), h = u(0);
    let C = null;
    const I = u(!0);
    function k(e, t, n = !0) {
      const l = H(e);
      if (l === a.value) return;
      const c = i.value;
      if (c) {
        const Y = (t == null ? void 0 : t.x) ?? c.clientWidth / 2, X = (t == null ? void 0 : t.y) ?? c.clientHeight / 2;
        C = {
          ax: Y,
          ay: X,
          cx: (c.scrollLeft + Y) / a.value,
          cy: (c.scrollTop + X) / a.value
        };
      }
      I.value = n, a.value = l, $("update:modelValue", l), $("zoom-change", l), J(re);
    }
    function re() {
      const e = i.value;
      if (!e || !C) return;
      const { ax: t, ay: n, cx: l, cy: c } = C;
      C = null, e.scrollLeft = l * a.value - t, e.scrollTop = c * a.value - n;
    }
    function S() {
      k(a.value + r.zoomStep);
    }
    function Z() {
      k(a.value - r.zoomStep);
    }
    function B() {
      k(1);
    }
    function N() {
      const e = i.value;
      if (!e || !w.value || !h.value) return;
      const t = 32, n = Math.min(
        (e.clientWidth - t) / w.value,
        (e.clientHeight - t) / h.value
      );
      k(n, void 0, !0), J(() => {
        const l = i.value;
        l && (l.scrollLeft = Math.max(0, (w.value * a.value - l.clientWidth) / 2), l.scrollTop = Math.max(0, (h.value * a.value - l.clientHeight) / 2));
      });
    }
    const V = u(!1), F = u(!1), P = u(!1), W = s(() => r.panOnDrag || F.value);
    let v = null, R = !1;
    function se(e) {
      const t = i.value;
      if (!t || e.button !== 0 || !W.value || e.pointerType === "touch") return;
      const n = e.target;
      n != null && n.closest(".nm-canvas__controls, button, a, input, textarea, select, [data-nm-no-pan]") || (v = {
        pointerId: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        left: t.scrollLeft,
        top: t.scrollTop
      }, R = !1, e.preventDefault(), window.addEventListener("pointermove", A), window.addEventListener("pointerup", b), window.addEventListener("pointercancel", b));
    }
    function A(e) {
      const t = i.value;
      if (!t || !v || e.pointerId !== v.pointerId) return;
      const n = e.clientX - v.x, l = e.clientY - v.y;
      !R && Math.hypot(n, l) < 4 || (R = !0, V.value = !0, t.scrollLeft = v.left - n, t.scrollTop = v.top - l);
    }
    function b() {
      v = null, V.value = !1, window.removeEventListener("pointermove", A), window.removeEventListener("pointerup", b), window.removeEventListener("pointercancel", b);
    }
    function K(e) {
      var l;
      if (e.code !== "Space") return;
      const t = document.activeElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable))
        return;
      const n = !!(t && ((l = M.value) != null && l.contains(t)));
      !P.value && !n || (F.value = !0, e.preventDefault());
    }
    function G(e) {
      e.code === "Space" && (F.value = !1);
    }
    function j(e) {
      if (!r.wheelZoom || !(e.ctrlKey || e.metaKey)) return;
      const t = i.value;
      if (!t) return;
      e.preventDefault();
      const n = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY, l = Math.exp(-n * 2e-3), c = t.getBoundingClientRect();
      k(a.value * l, { x: e.clientX - c.left, y: e.clientY - c.top }, !1);
    }
    function ie(e) {
      const t = i.value;
      if (!t) return;
      const n = e.shiftKey ? 200 : 60;
      switch (e.key) {
        case "ArrowUp":
          t.scrollTop -= n;
          break;
        case "ArrowDown":
          t.scrollTop += n;
          break;
        case "ArrowLeft":
          t.scrollLeft -= n;
          break;
        case "ArrowRight":
          t.scrollLeft += n;
          break;
        case "+":
        case "=":
          S();
          break;
        case "-":
        case "_":
          Z();
          break;
        case "0":
          B();
          break;
        default:
          return;
      }
      e.preventDefault();
    }
    const L = u(!1);
    function O() {
      L.value = document.fullscreenElement === M.value;
    }
    function U() {
      var e, t, n;
      document.fullscreenElement ? (n = document.exitFullscreen) == null || n.call(document) : (t = (e = M.value) == null ? void 0 : e.requestFullscreen) == null || t.call(e);
    }
    let y;
    he(() => {
      const e = z.value, t = i.value;
      e && (w.value = e.offsetWidth, h.value = e.offsetHeight, typeof ResizeObserver < "u" && (y = new ResizeObserver(() => {
        const n = z.value;
        n && (w.value = n.offsetWidth, h.value = n.offsetHeight);
      }), y.observe(e))), t == null || t.addEventListener("wheel", j, { passive: !1 }), window.addEventListener("keydown", K), window.addEventListener("keyup", G), document.addEventListener("fullscreenchange", O);
    }), ge(() => {
      var e;
      y == null || y.disconnect(), (e = i.value) == null || e.removeEventListener("wheel", j), window.removeEventListener("keydown", K), window.removeEventListener("keyup", G), document.removeEventListener("fullscreenchange", O), b();
    });
    const ue = s(() => ({
      width: `${Math.ceil(w.value * a.value)}px`,
      height: `${Math.ceil(h.value * a.value)}px`
    })), ce = s(() => {
      if (!te.value) return {};
      const e = Math.max(ne.value * a.value, 3);
      return {
        backgroundImage: oe.value === "lines" ? `linear-gradient(to right, var(--nm-border-subtle) 1px, transparent 1px),
         linear-gradient(to bottom, var(--nm-border-subtle) 1px, transparent 1px)` : "radial-gradient(circle, var(--nm-canvas-grid-color) 1px, transparent 1.2px)",
        backgroundSize: `${e}px ${e}px`,
        backgroundPosition: "0 0"
      };
    }), ve = s(() => ({
      transform: `scale(${a.value})`
    })), de = s(() => ({
      width: r.width,
      height: r.height
    })), pe = s(() => ({
      "nm-canvas__viewport--pannable": W.value,
      "nm-canvas__viewport--panning": V.value
    })), me = s(() => ["nm-canvas", { "nm-canvas--fullscreen": L.value }]);
    return Q({ zoomIn: S, zoomOut: Z, resetZoom: B, fit: N, toggleFullscreen: U }), (e, t) => (p(), m("div", {
      ref_key: "rootRef",
      ref: M,
      class: D(me.value),
      style: T(de.value)
    }, [
      e.$slots.toolbar ? (p(), m("div", _e, [
        q(e.$slots, "toolbar", {}, void 0, !0)
      ])) : E("", !0),
      o("div", {
        ref_key: "viewportRef",
        ref: i,
        class: D(["nm-canvas__viewport", pe.value]),
        tabindex: "0",
        role: "application",
        "aria-label": f(d)("canvasLabel"),
        onPointerdown: se,
        onPointerenter: t[0] || (t[0] = (n) => P.value = !0),
        onPointerleave: t[1] || (t[1] = (n) => P.value = !1),
        onKeydown: ie
      }, [
        o("div", {
          class: "nm-canvas__sizer",
          style: T([ue.value, ce.value])
        }, [
          o("div", {
            ref_key: "contentRef",
            ref: z,
            class: D(["nm-canvas__content", { "nm-canvas__content--smooth": I.value }]),
            style: T(ve.value)
          }, [
            q(e.$slots, "default", {}, void 0, !0)
          ], 6)
        ], 4)
      ], 42, Me),
      ae.value ? (p(), m("div", Ce, [
        o("button", {
          type: "button",
          class: "nm-canvas__btn",
          "aria-label": f(d)("canvasZoomOut"),
          disabled: a.value <= g.minZoom,
          onClick: Z
        }, [...t[2] || (t[2] = [
          o("svg", {
            viewBox: "0 0 24 24",
            fill: "none",
            xmlns: "http://www.w3.org/2000/svg"
          }, [
            o("circle", {
              cx: "11",
              cy: "11",
              r: "8",
              stroke: "currentColor",
              "stroke-width": "2"
            }),
            o("path", {
              d: "M8 11h6M21 21l-4.35-4.35",
              stroke: "currentColor",
              "stroke-width": "2",
              "stroke-linecap": "round"
            })
          ], -1)
        ])], 8, Le),
        o("span", Ee, ke(le.value) + "%", 1),
        o("button", {
          type: "button",
          class: "nm-canvas__btn",
          "aria-label": f(d)("canvasZoomIn"),
          disabled: a.value >= g.maxZoom,
          onClick: S
        }, [...t[3] || (t[3] = [
          o("svg", {
            viewBox: "0 0 24 24",
            fill: "none",
            xmlns: "http://www.w3.org/2000/svg"
          }, [
            o("circle", {
              cx: "11",
              cy: "11",
              r: "8",
              stroke: "currentColor",
              "stroke-width": "2"
            }),
            o("path", {
              d: "M11 8v6M8 11h6M21 21l-4.35-4.35",
              stroke: "currentColor",
              "stroke-width": "2",
              "stroke-linecap": "round"
            })
          ], -1)
        ])], 8, ze),
        t[8] || (t[8] = o("span", {
          class: "nm-canvas__divider",
          "aria-hidden": "true"
        }, null, -1)),
        o("button", {
          type: "button",
          class: "nm-canvas__btn nm-canvas__btn--reset",
          "aria-label": f(d)("canvasZoomReset"),
          onClick: B
        }, [...t[4] || (t[4] = [
          o("svg", {
            viewBox: "0 0 24 24",
            fill: "none",
            xmlns: "http://www.w3.org/2000/svg"
          }, [
            o("path", {
              d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",
              stroke: "currentColor",
              "stroke-width": "2",
              "stroke-linecap": "round",
              "stroke-linejoin": "round"
            }),
            o("path", {
              d: "M3 3v5h5",
              stroke: "currentColor",
              "stroke-width": "2",
              "stroke-linecap": "round",
              "stroke-linejoin": "round"
            })
          ], -1)
        ])], 8, Se),
        g.showFit ? (p(), m("button", {
          key: 0,
          type: "button",
          class: "nm-canvas__btn",
          "aria-label": f(d)("canvasZoomFit"),
          onClick: N
        }, [...t[5] || (t[5] = [
          o("svg", {
            viewBox: "0 0 24 24",
            fill: "none",
            xmlns: "http://www.w3.org/2000/svg"
          }, [
            o("path", {
              d: "M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3",
              stroke: "currentColor",
              "stroke-width": "2",
              "stroke-linecap": "round",
              "stroke-linejoin": "round"
            })
          ], -1)
        ])], 8, Ze)) : E("", !0),
        g.showFullscreen ? (p(), m("button", {
          key: 1,
          type: "button",
          class: "nm-canvas__btn",
          "aria-label": L.value ? f(d)("canvasExitFullscreen") : f(d)("canvasFullscreen"),
          onClick: U
        }, [
          L.value ? (p(), m("svg", Fe, [...t[7] || (t[7] = [
            o("path", {
              d: "M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3",
              stroke: "currentColor",
              "stroke-width": "2",
              "stroke-linecap": "round",
              "stroke-linejoin": "round"
            }, null, -1)
          ])])) : (p(), m("svg", Ve, [...t[6] || (t[6] = [
            o("path", {
              d: "M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7",
              stroke: "currentColor",
              "stroke-width": "2",
              "stroke-linecap": "round",
              "stroke-linejoin": "round"
            }, null, -1)
          ])]))
        ], 8, Be)) : E("", !0)
      ])) : E("", !0)
    ], 6));
  }
}), He = /* @__PURE__ */ xe(Pe, [["__scopeId", "data-v-5863e666"]]);
export {
  He as N
};

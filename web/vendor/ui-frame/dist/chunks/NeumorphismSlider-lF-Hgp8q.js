import { defineComponent as J, computed as l, ref as L, openBlock as p, createElementBlock as f, normalizeStyle as h, normalizeClass as E, createElementVNode as g, unref as u, Fragment as O, renderList as Q, withModifiers as W, createVNode as Z, Transition as ee, withCtx as te, toDisplayString as ae, createCommentVNode as ie } from "vue";
import { u as le } from "./createComponent-jnXBYqCm.js";
import { useLocale as re } from "../composables/useLocale.js";
import { useSlider as ne, coordinateToValue as oe } from "../composables/useSlider.js";
import { n as se, r as ue, f as N } from "./controlScales-CPj0Htdh.js";
import { _ as de } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismSlider.css';const ce = ["tabindex", "aria-valuemin", "aria-valuemax", "aria-valuenow", "aria-valuetext", "aria-label", "aria-disabled", "aria-orientation"], me = {
  key: 0,
  class: "nm-slider__tooltip",
  "aria-hidden": "true"
}, ve = /* @__PURE__ */ J({
  __name: "NeumorphismSlider",
  props: {
    modelValue: { default: 0 },
    min: { default: 0 },
    max: { default: 100 },
    step: { default: 1 },
    disabled: { type: Boolean, default: !1 },
    showTooltip: { type: Boolean, default: void 0 },
    showStops: { type: Boolean, default: void 0 },
    vertical: { type: Boolean, default: !1 },
    size: {}
  },
  emits: ["update:modelValue", "change"],
  setup(r, { emit: B }) {
    const t = r, { config: w, resolveProp: S } = le(), m = l(
      () => {
        var e;
        return S(t.size, (e = w.value.slider) == null ? void 0 : e.size, "medium");
      }
    ), b = l(
      () => typeof m.value == "number" ? se(m.value, N.primary.md) : void 0
    ), R = l(
      () => typeof m.value == "string" ? m.value : "medium"
    ), $ = l(
      () => b.value === void 0 ? void 0 : ue(N, b.value)
    ), z = l(
      () => {
        var e;
        return S(t.showTooltip, (e = w.value.slider) == null ? void 0 : e.showTooltip, !0);
      }
    ), I = l(
      () => {
        var e;
        return S(t.showStops, (e = w.value.slider) == null ? void 0 : e.showStops, !1);
      }
    ), y = B, D = l(() => t.disabled);
    l(() => t.vertical);
    const { sliderValue: v, percentage: _, setValue: F, handleKeydown: A, isDragging: V } = ne({
      modelValue: l({
        get: () => t.modelValue,
        set: (e) => {
          y("update:modelValue", e);
        }
      }),
      min: t.min,
      max: t.max,
      step: t.step,
      disabled: D
    }), C = L(null), n = L(!1);
    let o = null, d = null, s = 0;
    function c() {
      var e;
      o = ((e = C.value) == null ? void 0 : e.getBoundingClientRect()) ?? null;
    }
    function x(e, i) {
      if (!o) return;
      const a = t.vertical ? i : e, j = t.vertical ? o.top : o.left, G = t.vertical ? o.height : o.width, H = oe(
        a,
        j,
        G,
        t.min,
        t.max,
        t.step,
        t.vertical
      );
      return F(H);
    }
    function K() {
      if (s = 0, !d) return;
      const { x: e, y: i } = d;
      d = null, x(e, i);
    }
    function P(e) {
      if (t.disabled) return;
      n.value = !0, V.value = !0, e.currentTarget.setPointerCapture(e.pointerId), c(), window.addEventListener("scroll", c, { passive: !0, capture: !0 }), window.addEventListener("resize", c, { passive: !0 }), x(e.clientX, e.clientY);
    }
    function X(e) {
      n.value && (d = { x: e.clientX, y: e.clientY }, s || (s = requestAnimationFrame(K)));
    }
    function T(e) {
      if (!n.value) return;
      n.value = !1, V.value = !1, e.currentTarget.releasePointerCapture(e.pointerId), window.removeEventListener("scroll", c, { capture: !0 }), window.removeEventListener("resize", c), s && (cancelAnimationFrame(s), s = 0), d = null;
      const a = x(e.clientX, e.clientY);
      a !== void 0 && y("change", a);
    }
    function Y(e) {
      const i = A(e);
      i !== void 0 && y("change", i);
    }
    const M = l(() => {
      if (!I.value) return [];
      const e = [], i = t.max - t.min;
      if (i <= 0) return e;
      for (let a = t.min; a <= t.max; a += t.step)
        e.push({
          value: a,
          percentage: (a - t.min) / i * 100
        });
      return e;
    }), { t: q } = re(), k = l(() => `${v.value}`), U = l(() => [
      "nm-slider",
      // 数字与档位类互斥：几何全由内联 `--nm-slider-sz-*` 决定
      b.value === void 0 ? `nm-slider--${R.value}` : "nm-slider--sized",
      {
        "nm-slider--disabled": t.disabled,
        "nm-slider--vertical": t.vertical,
        "nm-slider--dragging": n.value,
        "nm-slider--show-tooltip": z.value && n.value
      }
    ]);
    return (e, i) => (p(), f("div", {
      class: E(U.value),
      style: h($.value),
      role: "group",
      "aria-label": "Slider"
    }, [
      g("div", {
        ref_key: "railRef",
        ref: C,
        class: "nm-slider__rail",
        onPointerdown: P,
        onPointermove: X,
        onPointerup: T,
        onPointercancel: T
      }, [
        g("div", {
          class: "nm-slider__track",
          style: h({
            [r.vertical ? "height" : "width"]: `${u(_)}%`
          }),
          "aria-hidden": "true"
        }, null, 4),
        (p(!0), f(O, null, Q(M.value, (a) => (p(), f("span", {
          key: a.value,
          class: E(["nm-slider__stop", { "nm-slider__stop--active": a.value <= u(v) }]),
          style: h({
            [r.vertical ? "top" : "left"]: `${a.percentage}%`
          }),
          "aria-hidden": "true"
        }, null, 6))), 128)),
        g("div", {
          class: "nm-slider__thumb-wrapper",
          style: h({
            [r.vertical ? "top" : "left"]: `${u(_)}%`
          })
        }, [
          g("div", {
            class: "nm-slider__thumb",
            role: "slider",
            tabindex: r.disabled ? -1 : 0,
            "aria-valuemin": r.min,
            "aria-valuemax": r.max,
            "aria-valuenow": u(v),
            "aria-valuetext": k.value,
            "aria-label": `${u(q)("sliderThumb")}: ${k.value}`,
            "aria-disabled": r.disabled || void 0,
            "aria-orientation": r.vertical ? "vertical" : "horizontal",
            onKeydown: Y,
            onPointerdown: W(P, ["stop"])
          }, null, 40, ce),
          Z(ee, { name: "nm-slider-tooltip" }, {
            default: te(() => [
              z.value && n.value ? (p(), f("span", me, ae(u(v)), 1)) : ie("", !0)
            ]),
            _: 1
          })
        ], 4)
      ], 544)
    ], 6));
  }
}), be = /* @__PURE__ */ de(ve, [["__scopeId", "data-v-92bc703e"]]);
export {
  be as N
};

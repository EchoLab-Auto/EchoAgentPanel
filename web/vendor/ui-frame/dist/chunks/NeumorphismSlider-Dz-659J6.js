import { defineComponent as U, computed as r, ref as z, openBlock as v, createElementBlock as p, normalizeClass as C, createElementVNode as f, normalizeStyle as x, unref as d, Fragment as j, renderList as G, withModifiers as H, createVNode as J, Transition as O, withCtx as Q, toDisplayString as W, createCommentVNode as Z } from "vue";
import { u as ee } from "./createComponent-jnXBYqCm.js";
import { useLocale as te } from "../composables/useLocale.js";
import { useSlider as ae, coordinateToValue as ie } from "../composables/useSlider.js";
import { _ as le } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismSlider.css';const re = ["tabindex", "aria-valuemin", "aria-valuemax", "aria-valuenow", "aria-valuetext", "aria-label", "aria-disabled", "aria-orientation"], ne = {
  key: 0,
  class: "nm-slider__tooltip",
  "aria-hidden": "true"
}, oe = /* @__PURE__ */ U({
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
  setup(l, { emit: B }) {
    const t = l, { config: h, resolveProp: g } = ee(), L = r(
      () => {
        var e;
        return g(t.size, (e = h.value.slider) == null ? void 0 : e.size, "medium");
      }
    ), y = r(
      () => {
        var e;
        return g(t.showTooltip, (e = h.value.slider) == null ? void 0 : e.showTooltip, !0);
      }
    ), N = r(
      () => {
        var e;
        return g(t.showStops, (e = h.value.slider) == null ? void 0 : e.showStops, !1);
      }
    ), w = B, $ = r(() => t.disabled);
    r(() => t.vertical);
    const { sliderValue: m, percentage: S, setValue: E, handleKeydown: R, isDragging: _ } = ae({
      modelValue: r({
        get: () => t.modelValue,
        set: (e) => {
          w("update:modelValue", e);
        }
      }),
      min: t.min,
      max: t.max,
      step: t.step,
      disabled: $
    }), V = z(null), n = z(!1);
    let o = null, u = null, s = 0;
    function c() {
      var e;
      o = ((e = V.value) == null ? void 0 : e.getBoundingClientRect()) ?? null;
    }
    function b(e, i) {
      if (!o) return;
      const a = t.vertical ? i : e, A = t.vertical ? o.top : o.left, M = t.vertical ? o.height : o.width, q = ie(
        a,
        A,
        M,
        t.min,
        t.max,
        t.step,
        t.vertical
      );
      return E(q);
    }
    function F() {
      if (s = 0, !u) return;
      const { x: e, y: i } = u;
      u = null, b(e, i);
    }
    function P(e) {
      if (t.disabled) return;
      n.value = !0, _.value = !0, e.currentTarget.setPointerCapture(e.pointerId), c(), window.addEventListener("scroll", c, { passive: !0, capture: !0 }), window.addEventListener("resize", c, { passive: !0 }), b(e.clientX, e.clientY);
    }
    function I(e) {
      n.value && (u = { x: e.clientX, y: e.clientY }, s || (s = requestAnimationFrame(F)));
    }
    function T(e) {
      if (!n.value) return;
      n.value = !1, _.value = !1, e.currentTarget.releasePointerCapture(e.pointerId), window.removeEventListener("scroll", c, { capture: !0 }), window.removeEventListener("resize", c), s && (cancelAnimationFrame(s), s = 0), u = null;
      const a = b(e.clientX, e.clientY);
      a !== void 0 && w("change", a);
    }
    function D(e) {
      const i = R(e);
      i !== void 0 && w("change", i);
    }
    const K = r(() => {
      if (!N.value) return [];
      const e = [], i = t.max - t.min;
      if (i <= 0) return e;
      for (let a = t.min; a <= t.max; a += t.step)
        e.push({
          value: a,
          percentage: (a - t.min) / i * 100
        });
      return e;
    }), { t: X } = te(), k = r(() => `${m.value}`), Y = r(() => [
      "nm-slider",
      `nm-slider--${L.value}`,
      {
        "nm-slider--disabled": t.disabled,
        "nm-slider--vertical": t.vertical,
        "nm-slider--dragging": n.value,
        "nm-slider--show-tooltip": y.value && n.value
      }
    ]);
    return (e, i) => (v(), p("div", {
      class: C(Y.value),
      role: "group",
      "aria-label": "Slider"
    }, [
      f("div", {
        ref_key: "railRef",
        ref: V,
        class: "nm-slider__rail",
        onPointerdown: P,
        onPointermove: I,
        onPointerup: T,
        onPointercancel: T
      }, [
        f("div", {
          class: "nm-slider__track",
          style: x({
            [l.vertical ? "height" : "width"]: `${d(S)}%`
          }),
          "aria-hidden": "true"
        }, null, 4),
        (v(!0), p(j, null, G(K.value, (a) => (v(), p("span", {
          key: a.value,
          class: C(["nm-slider__stop", { "nm-slider__stop--active": a.value <= d(m) }]),
          style: x({
            [l.vertical ? "top" : "left"]: `${a.percentage}%`
          }),
          "aria-hidden": "true"
        }, null, 6))), 128)),
        f("div", {
          class: "nm-slider__thumb-wrapper",
          style: x({
            [l.vertical ? "top" : "left"]: `${d(S)}%`
          })
        }, [
          f("div", {
            class: "nm-slider__thumb",
            role: "slider",
            tabindex: l.disabled ? -1 : 0,
            "aria-valuemin": l.min,
            "aria-valuemax": l.max,
            "aria-valuenow": d(m),
            "aria-valuetext": k.value,
            "aria-label": `${d(X)("sliderThumb")}: ${k.value}`,
            "aria-disabled": l.disabled || void 0,
            "aria-orientation": l.vertical ? "vertical" : "horizontal",
            onKeydown: D,
            onPointerdown: H(P, ["stop"])
          }, null, 40, re),
          J(O, { name: "nm-slider-tooltip" }, {
            default: Q(() => [
              y.value && n.value ? (v(), p("span", ne, W(d(m)), 1)) : Z("", !0)
            ]),
            _: 1
          })
        ], 4)
      ], 544)
    ], 2));
  }
}), ve = /* @__PURE__ */ le(oe, [["__scopeId", "data-v-a88b87a1"]]);
export {
  ve as N
};

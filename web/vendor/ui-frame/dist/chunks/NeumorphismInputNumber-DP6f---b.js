import { defineComponent as C, computed as d, onBeforeUnmount as $, openBlock as c, createElementBlock as b, normalizeClass as F, createVNode as f, createElementVNode as s, withModifiers as p, unref as l, createCommentVNode as N } from "vue";
import { u as K } from "./createComponent-jnXBYqCm.js";
import { useNumberInput as S } from "../composables/useNumberInput.js";
import { N as M } from "./NeumorphismFieldLabel-C3S1Ax2f.js";
import { N as h } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as U } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismInputNumber.css';const Y = { class: "nm-input-number__body" }, j = ["disabled"], q = {
  class: "nm-input-number__btn-icon",
  "aria-hidden": "true"
}, G = { class: "nm-input-number__input-wrapper" }, H = ["value", "placeholder", "disabled", "aria-disabled"], J = ["disabled"], O = {
  class: "nm-input-number__btn-icon",
  "aria-hidden": "true"
}, Q = 400, W = 80, X = /* @__PURE__ */ C({
  inheritAttrs: !1,
  __name: "NeumorphismInputNumber",
  props: {
    modelValue: { default: void 0 },
    min: { default: void 0 },
    max: { default: void 0 },
    step: { default: 1 },
    precision: { default: void 0 },
    disabled: { type: Boolean, default: !1 },
    size: {},
    placeholder: { default: "" },
    controls: { type: Boolean, default: !0 },
    label: { default: void 0 }
  },
  emits: ["update:modelValue", "change", "focus", "blur"],
  setup(o, { emit: V }) {
    const e = o, u = V, { config: y, resolveProp: P } = K(), w = d(
      () => {
        var n;
        return P(e.size, (n = y.value.inputNumber) == null ? void 0 : n.size, "medium");
      }
    ), x = d(() => e.disabled), E = d({
      get: () => e.modelValue,
      set: (n) => {
        u("update:modelValue", n), u("change", n);
      }
    }), { displayValue: z, increment: B, decrement: R, handleInput: v, handleKeydown: _, handleBlur: k } = S({
      modelValue: E,
      min: e.min,
      max: e.max,
      step: e.step,
      precision: e.precision,
      disabled: x
    }), D = d(
      () => e.modelValue === void 0 || e.modelValue > (e.min ?? -1 / 0)
    ), T = d(
      () => e.modelValue === void 0 || e.modelValue < (e.max ?? 1 / 0)
    );
    let r, m;
    function i() {
      r !== void 0 && (clearTimeout(r), r = void 0), m !== void 0 && (clearInterval(m), m = void 0);
    }
    function I(n) {
      i(), n(), r = window.setTimeout(() => {
        m = window.setInterval(n, W);
      }, Q);
    }
    $(i);
    const A = d(() => [
      "nm-input-number",
      `nm-input-number--${w.value}`,
      {
        "nm-input-number--disabled": e.disabled,
        "nm-input-number--has-controls": e.controls
      }
    ]);
    function g(n) {
      k(), u("blur", n);
    }
    function L(n) {
      u("focus", n);
    }
    return (n, t) => (c(), b("div", {
      class: F(A.value)
    }, [
      f(M, {
        label: o.label,
        "for-id": void 0
      }, null, 8, ["label"]),
      s("div", Y, [
        o.controls ? (c(), b("button", {
          key: 0,
          type: "button",
          class: "nm-input-number__btn nm-input-number__btn--decrement",
          disabled: o.disabled || !D.value,
          "aria-label": "Decrement",
          tabindex: "-1",
          onPointerdown: t[0] || (t[0] = p((a) => I(l(R)), ["prevent"])),
          onPointerup: i,
          onPointercancel: i,
          onPointerleave: i,
          onDblclick: t[1] || (t[1] = p(() => {
          }, ["prevent"]))
        }, [
          s("span", q, [
            f(h, {
              name: "minus",
              size: "md"
            })
          ])
        ], 40, j)) : N("", !0),
        s("div", G, [
          s("input", {
            type: "text",
            inputmode: "decimal",
            class: "nm-input-number__input",
            value: l(z),
            placeholder: o.placeholder,
            disabled: o.disabled,
            "aria-disabled": o.disabled || void 0,
            onInput: t[2] || (t[2] = //@ts-ignore
            (...a) => l(v) && l(v)(...a)),
            onKeydown: t[3] || (t[3] = //@ts-ignore
            (...a) => l(_) && l(_)(...a)),
            onBlur: g,
            onFocus: L
          }, null, 40, H)
        ]),
        o.controls ? (c(), b("button", {
          key: 1,
          type: "button",
          class: "nm-input-number__btn nm-input-number__btn--increment",
          disabled: o.disabled || !T.value,
          "aria-label": "Increment",
          tabindex: "-1",
          onPointerdown: t[4] || (t[4] = p((a) => I(l(B)), ["prevent"])),
          onPointerup: i,
          onPointercancel: i,
          onPointerleave: i,
          onDblclick: t[5] || (t[5] = p(() => {
          }, ["prevent"]))
        }, [
          s("span", O, [
            f(h, {
              name: "plus",
              size: "md"
            })
          ])
        ], 40, J)) : N("", !0)
      ])
    ], 2));
  }
}), le = /* @__PURE__ */ U(X, [["__scopeId", "data-v-d671ad94"]]);
export {
  le as N
};

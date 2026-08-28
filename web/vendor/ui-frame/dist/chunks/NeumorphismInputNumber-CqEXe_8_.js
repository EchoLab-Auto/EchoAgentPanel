import { defineComponent as g, computed as d, onBeforeUnmount as L, openBlock as b, createElementBlock as c, normalizeClass as C, createVNode as $, createElementVNode as u, withModifiers as p, unref as l, createCommentVNode as V } from "vue";
import { u as F } from "./createComponent-jnXBYqCm.js";
import { useNumberInput as K } from "../composables/useNumberInput.js";
import { N as S } from "./NeumorphismFieldLabel-CBF1nZs1.js";
import { _ as M } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismInputNumber.css';const U = { class: "nm-input-number__body" }, Y = ["disabled"], j = { class: "nm-input-number__input-wrapper" }, q = ["value", "placeholder", "disabled", "aria-disabled"], G = ["disabled"], H = 400, J = 80, O = /* @__PURE__ */ g({
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
  setup(o, { emit: y }) {
    const n = o, s = y, { config: N, resolveProp: P } = F(), w = d(
      () => {
        var t;
        return P(n.size, (t = N.value.input) == null ? void 0 : t.size, "medium");
      }
    ), x = d(() => n.disabled), _ = d({
      get: () => n.modelValue,
      set: (t) => {
        s("update:modelValue", t), s("change", t);
      }
    }), { displayValue: E, increment: B, decrement: R, handleInput: f, handleKeydown: v, handleBlur: h } = K({
      modelValue: _,
      min: n.min,
      max: n.max,
      step: n.step,
      precision: n.precision,
      disabled: x
    }), k = d(
      () => n.modelValue === void 0 || n.modelValue > (n.min ?? -1 / 0)
    ), D = d(
      () => n.modelValue === void 0 || n.modelValue < (n.max ?? 1 / 0)
    );
    let r, m;
    function i() {
      r !== void 0 && (clearTimeout(r), r = void 0), m !== void 0 && (clearInterval(m), m = void 0);
    }
    function I(t) {
      i(), t(), r = window.setTimeout(() => {
        m = window.setInterval(t, J);
      }, H);
    }
    L(i);
    const T = d(() => [
      "nm-input-number",
      `nm-input-number--${w.value}`,
      {
        "nm-input-number--disabled": n.disabled,
        "nm-input-number--has-controls": n.controls
      }
    ]);
    function z(t) {
      h(), s("blur", t);
    }
    function A(t) {
      s("focus", t);
    }
    return (t, e) => (b(), c("div", {
      class: C(T.value)
    }, [
      $(S, {
        label: o.label,
        "for-id": void 0
      }, null, 8, ["label"]),
      u("div", U, [
        o.controls ? (b(), c("button", {
          key: 0,
          type: "button",
          class: "nm-input-number__btn nm-input-number__btn--decrement",
          disabled: o.disabled || !k.value,
          "aria-label": "Decrement",
          tabindex: "-1",
          onPointerdown: e[0] || (e[0] = p((a) => I(l(R)), ["prevent"])),
          onPointerup: i,
          onPointercancel: i,
          onPointerleave: i,
          onDblclick: e[1] || (e[1] = p(() => {
          }, ["prevent"]))
        }, [...e[6] || (e[6] = [
          u("span", { class: "nm-input-number__btn-icon" }, "−", -1)
        ])], 40, Y)) : V("", !0),
        u("div", j, [
          u("input", {
            type: "text",
            inputmode: "decimal",
            class: "nm-input-number__input",
            value: l(E),
            placeholder: o.placeholder,
            disabled: o.disabled,
            "aria-disabled": o.disabled || void 0,
            onInput: e[2] || (e[2] = //@ts-ignore
            (...a) => l(f) && l(f)(...a)),
            onKeydown: e[3] || (e[3] = //@ts-ignore
            (...a) => l(v) && l(v)(...a)),
            onBlur: z,
            onFocus: A
          }, null, 40, q)
        ]),
        o.controls ? (b(), c("button", {
          key: 1,
          type: "button",
          class: "nm-input-number__btn nm-input-number__btn--increment",
          disabled: o.disabled || !D.value,
          "aria-label": "Increment",
          tabindex: "-1",
          onPointerdown: e[4] || (e[4] = p((a) => I(l(B)), ["prevent"])),
          onPointerup: i,
          onPointercancel: i,
          onPointerleave: i,
          onDblclick: e[5] || (e[5] = p(() => {
          }, ["prevent"]))
        }, [...e[7] || (e[7] = [
          u("span", { class: "nm-input-number__btn-icon" }, "+", -1)
        ])], 40, G)) : V("", !0)
      ])
    ], 2));
  }
}), ne = /* @__PURE__ */ M(O, [["__scopeId", "data-v-930c93bd"]]);
export {
  ne as N
};

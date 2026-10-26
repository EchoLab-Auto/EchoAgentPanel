import { defineComponent as C, computed as l, onBeforeUnmount as F, openBlock as b, createElementBlock as v, normalizeStyle as $, normalizeClass as K, createVNode as f, createElementVNode as d, withModifiers as c, unref as a, createCommentVNode as h } from "vue";
import { u as U } from "./createComponent-jnXBYqCm.js";
import { useNumberInput as M } from "../composables/useNumberInput.js";
import { n as X, r as Y, F as Z } from "./controlScales-CPj0Htdh.js";
import { N as j } from "./NeumorphismFieldLabel-C3S1Ax2f.js";
import { N as z } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as q } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismInputNumber.css';const G = { class: "nm-input-number__body" }, H = ["disabled"], J = {
  class: "nm-input-number__btn-icon",
  "aria-hidden": "true"
}, O = { class: "nm-input-number__input-wrapper" }, Q = ["value", "placeholder", "disabled", "aria-disabled"], W = ["disabled"], ee = {
  class: "nm-input-number__btn-icon",
  "aria-hidden": "true"
}, ne = 48, te = 400, oe = 80, ie = /* @__PURE__ */ C({
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
    const n = o, u = V, { config: _ } = U(), p = l(() => {
      var e;
      const t = n.size ?? ((e = _.value.inputNumber) == null ? void 0 : e.size);
      return typeof t == "number" ? X(t, ne) : void 0;
    }), w = l(() => {
      var e;
      const t = n.size ?? ((e = _.value.inputNumber) == null ? void 0 : e.size);
      return typeof t == "string" ? t : "medium";
    }), E = l(
      () => p.value === void 0 ? void 0 : Y(Z, p.value)
    ), P = l(() => n.disabled), x = l({
      get: () => n.modelValue,
      set: (t) => {
        u("update:modelValue", t), u("change", t);
      }
    }), { displayValue: S, increment: D, decrement: A, handleInput: y, handleKeydown: I, handleBlur: B } = M({
      modelValue: x,
      min: n.min,
      max: n.max,
      step: n.step,
      precision: n.precision,
      disabled: P
    }), L = l(
      () => n.modelValue === void 0 || n.modelValue > (n.min ?? -1 / 0)
    ), R = l(
      () => n.modelValue === void 0 || n.modelValue < (n.max ?? 1 / 0)
    );
    let r, m;
    function i() {
      r !== void 0 && (clearTimeout(r), r = void 0), m !== void 0 && (clearInterval(m), m = void 0);
    }
    function N(t) {
      i(), t(), r = window.setTimeout(() => {
        m = window.setInterval(t, oe);
      }, te);
    }
    F(i);
    const T = l(() => [
      "nm-input-number",
      p.value === void 0 ? `nm-input-number--${w.value}` : "nm-input-number--sized",
      {
        "nm-input-number--disabled": n.disabled,
        "nm-input-number--has-controls": n.controls
      }
    ]);
    function k(t) {
      B(), u("blur", t);
    }
    function g(t) {
      u("focus", t);
    }
    return (t, e) => (b(), v("div", {
      class: K(T.value),
      style: $(E.value)
    }, [
      f(j, {
        label: o.label,
        "for-id": void 0
      }, null, 8, ["label"]),
      d("div", G, [
        o.controls ? (b(), v("button", {
          key: 0,
          type: "button",
          class: "nm-input-number__btn nm-input-number__btn--decrement",
          disabled: o.disabled || !L.value,
          "aria-label": "Decrement",
          tabindex: "-1",
          onPointerdown: e[0] || (e[0] = c((s) => N(a(A)), ["prevent"])),
          onPointerup: i,
          onPointercancel: i,
          onPointerleave: i,
          onDblclick: e[1] || (e[1] = c(() => {
          }, ["prevent"]))
        }, [
          d("span", J, [
            f(z, {
              name: "minus",
              size: "md"
            })
          ])
        ], 40, H)) : h("", !0),
        d("div", O, [
          d("input", {
            type: "text",
            inputmode: "decimal",
            class: "nm-input-number__input",
            value: a(S),
            placeholder: o.placeholder,
            disabled: o.disabled,
            "aria-disabled": o.disabled || void 0,
            onInput: e[2] || (e[2] = //@ts-ignore
            (...s) => a(y) && a(y)(...s)),
            onKeydown: e[3] || (e[3] = //@ts-ignore
            (...s) => a(I) && a(I)(...s)),
            onBlur: k,
            onFocus: g
          }, null, 40, Q)
        ]),
        o.controls ? (b(), v("button", {
          key: 1,
          type: "button",
          class: "nm-input-number__btn nm-input-number__btn--increment",
          disabled: o.disabled || !R.value,
          "aria-label": "Increment",
          tabindex: "-1",
          onPointerdown: e[4] || (e[4] = c((s) => N(a(D)), ["prevent"])),
          onPointerup: i,
          onPointercancel: i,
          onPointerleave: i,
          onDblclick: e[5] || (e[5] = c(() => {
          }, ["prevent"]))
        }, [
          d("span", ee, [
            f(z, {
              name: "plus",
              size: "md"
            })
          ])
        ], 40, W)) : h("", !0)
      ])
    ], 6));
  }
}), ce = /* @__PURE__ */ q(ie, [["__scopeId", "data-v-0bc8d742"]]);
export {
  ce as N
};

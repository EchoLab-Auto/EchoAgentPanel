import { defineComponent as A, computed as r, onBeforeUnmount as C, openBlock as b, createElementBlock as c, normalizeClass as L, createVNode as M, createElementVNode as i, withModifiers as p, unref as d, createCommentVNode as w } from "vue";
import { u as $ } from "./createComponent-jnXBYqCm.js";
import { useNumberInput as j } from "../composables/useNumberInput.js";
import { N as F } from "./NeumorphismFieldLabel-C3S1Ax2f.js";
import { _ as K } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismInputNumber.css';const S = { class: "nm-input-number__body" }, U = ["disabled"], Y = { class: "nm-input-number__input-wrapper" }, q = ["value", "placeholder", "disabled", "aria-disabled"], G = ["disabled"], H = 400, J = 80, O = /* @__PURE__ */ A({
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
  setup(o, { emit: I }) {
    const n = o, u = I, { config: V, resolveProp: k } = $(), y = r(
      () => {
        var t;
        return k(n.size, (t = V.value.inputNumber) == null ? void 0 : t.size, "medium");
      }
    ), N = r(() => n.disabled), x = r({
      get: () => n.modelValue,
      set: (t) => {
        u("update:modelValue", t), u("change", t);
      }
    }), { displayValue: P, increment: B, decrement: _, handleInput: v, handleKeydown: f, handleBlur: g } = j({
      modelValue: x,
      min: n.min,
      max: n.max,
      step: n.step,
      precision: n.precision,
      disabled: N
    }), E = r(
      () => n.modelValue === void 0 || n.modelValue > (n.min ?? -1 / 0)
    ), R = r(
      () => n.modelValue === void 0 || n.modelValue < (n.max ?? 1 / 0)
    );
    let s, m;
    function l() {
      s !== void 0 && (clearTimeout(s), s = void 0), m !== void 0 && (clearInterval(m), m = void 0);
    }
    function h(t) {
      l(), t(), s = window.setTimeout(() => {
        m = window.setInterval(t, J);
      }, H);
    }
    C(l);
    const D = r(() => [
      "nm-input-number",
      `nm-input-number--${y.value}`,
      {
        "nm-input-number--disabled": n.disabled,
        "nm-input-number--has-controls": n.controls
      }
    ]);
    function T(t) {
      g(), u("blur", t);
    }
    function z(t) {
      u("focus", t);
    }
    return (t, e) => (b(), c("div", {
      class: L(D.value)
    }, [
      M(F, {
        label: o.label,
        "for-id": void 0
      }, null, 8, ["label"]),
      i("div", S, [
        o.controls ? (b(), c("button", {
          key: 0,
          type: "button",
          class: "nm-input-number__btn nm-input-number__btn--decrement",
          disabled: o.disabled || !E.value,
          "aria-label": "Decrement",
          tabindex: "-1",
          onPointerdown: e[0] || (e[0] = p((a) => h(d(_)), ["prevent"])),
          onPointerup: l,
          onPointercancel: l,
          onPointerleave: l,
          onDblclick: e[1] || (e[1] = p(() => {
          }, ["prevent"]))
        }, [...e[6] || (e[6] = [
          i("span", {
            class: "nm-input-number__btn-icon",
            "aria-hidden": "true"
          }, [
            i("svg", {
              width: "16",
              height: "16",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              "stroke-width": "2",
              "stroke-linecap": "round",
              "stroke-linejoin": "round"
            }, [
              i("path", { d: "M5 12h14" })
            ])
          ], -1)
        ])], 40, U)) : w("", !0),
        i("div", Y, [
          i("input", {
            type: "text",
            inputmode: "decimal",
            class: "nm-input-number__input",
            value: d(P),
            placeholder: o.placeholder,
            disabled: o.disabled,
            "aria-disabled": o.disabled || void 0,
            onInput: e[2] || (e[2] = //@ts-ignore
            (...a) => d(v) && d(v)(...a)),
            onKeydown: e[3] || (e[3] = //@ts-ignore
            (...a) => d(f) && d(f)(...a)),
            onBlur: T,
            onFocus: z
          }, null, 40, q)
        ]),
        o.controls ? (b(), c("button", {
          key: 1,
          type: "button",
          class: "nm-input-number__btn nm-input-number__btn--increment",
          disabled: o.disabled || !R.value,
          "aria-label": "Increment",
          tabindex: "-1",
          onPointerdown: e[4] || (e[4] = p((a) => h(d(B)), ["prevent"])),
          onPointerup: l,
          onPointercancel: l,
          onPointerleave: l,
          onDblclick: e[5] || (e[5] = p(() => {
          }, ["prevent"]))
        }, [...e[7] || (e[7] = [
          i("span", {
            class: "nm-input-number__btn-icon",
            "aria-hidden": "true"
          }, [
            i("svg", {
              width: "16",
              height: "16",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              "stroke-width": "2",
              "stroke-linecap": "round",
              "stroke-linejoin": "round"
            }, [
              i("path", { d: "M12 5v14M5 12h14" })
            ])
          ], -1)
        ])], 40, G)) : w("", !0)
      ])
    ], 2));
  }
}), ne = /* @__PURE__ */ K(O, [["__scopeId", "data-v-fea6d1ee"]]);
export {
  ne as N
};

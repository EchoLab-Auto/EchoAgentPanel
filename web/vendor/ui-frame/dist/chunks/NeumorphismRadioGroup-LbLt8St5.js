import { defineComponent as k, useAttrs as I, computed as s, inject as x, openBlock as _, createElementBlock as b, unref as r, normalizeStyle as A, normalizeClass as N, createElementVNode as f, mergeProps as P, renderSlot as C, createTextVNode as j, toDisplayString as E, createCommentVNode as G, provide as L, toRef as y } from "vue";
import { useCheckable as w } from "../composables/useCheckable.js";
import { RadioGroupKey as S } from "../composables/injectionKeys.js";
import { u as R } from "./createComponent-jnXBYqCm.js";
import { _ as $ } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import { generateId as K } from "../utils/index.js";
import '../NeumorphismRadioGroup.css';const O = ["for"], T = { class: "nm-radio__input-wrapper" }, q = ["id", "checked", "disabled", "name", "value"], F = {
  key: 0,
  class: "nm-radio__label"
}, H = /* @__PURE__ */ k({
  inheritAttrs: !1,
  __name: "NeumorphismRadio",
  props: {
    modelValue: {},
    value: {},
    disabled: { type: Boolean, default: !1 },
    label: {},
    size: {},
    name: {},
    id: {}
  },
  emits: ["update:modelValue", "change"],
  setup(t, { emit: h }) {
    const e = t, { config: u, resolveProp: c } = R(), m = h, n = I(), p = s(() => {
      const l = {};
      for (const i of Object.keys(n))
        i !== "class" && i !== "style" && (l[i] = n[i]);
      return l;
    }), a = x(S, null), v = s(() => a ? a.modelValue.value === e.value : e.modelValue === e.value), d = s(() => e.disabled || (a == null ? void 0 : a.disabled.value) || !1), o = s(
      () => {
        var l;
        return c(e.size, (l = u.value.radio) == null ? void 0 : l.size, "medium");
      }
    ), g = s(
      () => (a == null ? void 0 : a.size.value) || o.value
    ), { inputId: z, classList: B } = w(() => ({
      prefix: "radio",
      isChecked: v.value,
      isDisabled: d.value,
      size: g.value
    }));
    function D() {
      d.value || (a ? a.setValue(e.value) : (m("update:modelValue", e.value), m("change", e.value)));
    }
    return (l, i) => {
      var V;
      return _(), b("label", {
        class: N([r(B), r(n).class]),
        style: A(r(n).style),
        for: r(z)
      }, [
        f("span", T, [
          f("input", P({
            id: r(z),
            type: "radio",
            class: "nm-radio__input",
            checked: v.value,
            disabled: d.value,
            name: ((V = r(a)) == null ? void 0 : V.name.value) || t.name,
            value: t.value
          }, p.value, { onChange: D }), null, 16, q),
          i[0] || (i[0] = f("span", {
            class: "nm-radio__circle",
            "aria-hidden": "true"
          }, [
            f("span", { class: "nm-radio__dot" })
          ], -1))
        ]),
        t.label || l.$slots.default ? (_(), b("span", F, [
          C(l.$slots, "default", {}, () => [
            j(E(t.label), 1)
          ], !0)
        ])) : G("", !0)
      ], 14, O);
    };
  }
}), ee = /* @__PURE__ */ $(H, [["__scopeId", "data-v-58a50594"]]), J = ["aria-orientation"], M = /* @__PURE__ */ k({
  __name: "NeumorphismRadioGroup",
  props: {
    modelValue: {},
    disabled: { type: Boolean, default: !1 },
    size: {},
    name: {},
    direction: {}
  },
  emits: ["update:modelValue", "change"],
  setup(t, { emit: h }) {
    const e = t, { config: u, resolveProp: c } = R(), m = s(
      () => {
        var o;
        return c(e.size, (o = u.value.radioGroup) == null ? void 0 : o.size, "medium");
      }
    ), n = s(
      () => {
        var o;
        return c(e.direction, (o = u.value.radioGroup) == null ? void 0 : o.direction, "horizontal");
      }
    ), p = h, a = s(() => e.name || K("nm-radio-group"));
    function v(o) {
      p("update:modelValue", o), p("change", o);
    }
    L(S, {
      modelValue: y(e, "modelValue"),
      name: a,
      disabled: y(e, "disabled"),
      size: s(() => m.value),
      setValue: v
    });
    const d = s(() => ["nm-radio-group", `nm-radio-group--${n.value}`]);
    return (o, g) => (_(), b("div", {
      class: N(d.value),
      role: "radiogroup",
      "aria-orientation": t.direction
    }, [
      C(o.$slots, "default", {}, void 0, !0)
    ], 10, J));
  }
}), ae = /* @__PURE__ */ $(M, [["__scopeId", "data-v-cb817c32"]]);
export {
  ee as N,
  ae as a
};

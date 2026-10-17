import { defineComponent as N, computed as r, useAttrs as z, ref as V, watch as B, openBlock as i, createElementBlock as h, unref as o, normalizeStyle as S, normalizeClass as w, createElementVNode as d, mergeProps as A, createBlock as f, createCommentVNode as p, renderSlot as D, createTextVNode as I, toDisplayString as E } from "vue";
import { useCheckable as P } from "../composables/useCheckable.js";
import { u as R } from "./createComponent-jnXBYqCm.js";
import { N as k } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as $ } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismCheckbox.css';const j = ["for"], L = { class: "nm-checkbox__input-wrapper" }, O = ["id", "checked", "disabled", "name"], T = {
  class: "nm-checkbox__box",
  "aria-hidden": "true"
}, q = {
  key: 0,
  class: "nm-checkbox__label"
}, F = /* @__PURE__ */ N({
  inheritAttrs: !1,
  __name: "NeumorphismCheckbox",
  props: {
    modelValue: { type: Boolean, default: !1 },
    disabled: { type: Boolean, default: !1 },
    label: {},
    size: {},
    name: {},
    id: {},
    indeterminate: { type: Boolean, default: !1 }
  },
  emits: ["update:modelValue", "change"],
  setup(s, { emit: b }) {
    const t = s, { config: _, resolveProp: x } = R(), y = r(() => {
      var e;
      return x(t.size, (e = _.value.checkbox) == null ? void 0 : e.size, "medium");
    }), m = b, n = r({
      get: () => t.modelValue,
      set: (e) => {
        t.disabled || (m("update:modelValue", e), m("change", e));
      }
    }), c = z(), l = V(), v = r(() => {
      const e = {};
      for (const a of Object.keys(c))
        a !== "class" && a !== "style" && (e[a] = c[a]);
      return e;
    }), { inputId: u, classList: C } = P(() => ({
      prefix: "checkbox",
      isChecked: n.value,
      isDisabled: t.disabled,
      size: y.value,
      extraClasses: { "nm-checkbox--indeterminate": t.indeterminate }
    }));
    B(
      () => t.indeterminate,
      (e) => {
        l.value && (l.value.indeterminate = e);
      },
      { immediate: !0 }
    );
    function g(e) {
      if (t.disabled) {
        e.preventDefault();
        return;
      }
      n.value = e.target.checked;
    }
    return (e, a) => (i(), h("label", {
      class: w([o(C), o(c).class]),
      style: S(o(c).style),
      for: o(u)
    }, [
      d("span", L, [
        d("input", A({
          id: o(u),
          ref_key: "inputRef",
          ref: l,
          type: "checkbox",
          class: "nm-checkbox__input",
          checked: n.value,
          disabled: s.disabled,
          name: s.name
        }, v.value, { onChange: g }), null, 16, O),
        d("span", T, [
          s.indeterminate ? (i(), f(k, {
            key: 0,
            name: "minus",
            class: "nm-checkbox__icon",
            "stroke-width": 3
          })) : n.value ? (i(), f(k, {
            key: 1,
            name: "check",
            class: "nm-checkbox__icon",
            "stroke-width": 3
          })) : p("", !0)
        ])
      ]),
      s.label || e.$slots.default ? (i(), h("span", q, [
        D(e.$slots, "default", {}, () => [
          I(E(s.label), 1)
        ], !0)
      ])) : p("", !0)
    ], 14, j));
  }
}), Q = /* @__PURE__ */ $(F, [["__scopeId", "data-v-3ccfc6f7"]]);
export {
  Q as N
};

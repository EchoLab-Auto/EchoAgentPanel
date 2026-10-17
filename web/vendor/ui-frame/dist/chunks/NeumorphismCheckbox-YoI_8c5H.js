import { defineComponent as C, computed as u, useAttrs as g, ref as z, watch as B, openBlock as r, createElementBlock as c, unref as n, normalizeStyle as N, normalizeClass as V, createElementVNode as a, mergeProps as w, createCommentVNode as f, renderSlot as S, createTextVNode as A, toDisplayString as D } from "vue";
import { useCheckable as j } from "../composables/useCheckable.js";
import { u as E } from "./createComponent-jnXBYqCm.js";
import { _ as I } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismCheckbox.css';const L = ["for"], M = { class: "nm-checkbox__input-wrapper" }, P = ["id", "checked", "disabled", "name"], R = {
  class: "nm-checkbox__box",
  "aria-hidden": "true"
}, $ = {
  key: 0,
  class: "nm-checkbox__icon",
  viewBox: "0 0 24 24",
  fill: "none"
}, H = {
  key: 1,
  class: "nm-checkbox__icon",
  viewBox: "0 0 24 24",
  fill: "none"
}, O = {
  key: 0,
  class: "nm-checkbox__label"
}, T = /* @__PURE__ */ C({
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
  setup(o, { emit: p }) {
    const s = o, { config: k, resolveProp: b } = E(), _ = u(() => {
      var e;
      return b(s.size, (e = k.value.checkbox) == null ? void 0 : e.size, "medium");
    }), m = p, l = u({
      get: () => s.modelValue,
      set: (e) => {
        s.disabled || (m("update:modelValue", e), m("change", e));
      }
    }), i = g(), d = z(), x = u(() => {
      const e = {};
      for (const t of Object.keys(i))
        t !== "class" && t !== "style" && (e[t] = i[t]);
      return e;
    }), { inputId: h, classList: v } = j(() => ({
      prefix: "checkbox",
      isChecked: l.value,
      isDisabled: s.disabled,
      size: _.value,
      extraClasses: { "nm-checkbox--indeterminate": s.indeterminate }
    }));
    B(
      () => s.indeterminate,
      (e) => {
        d.value && (d.value.indeterminate = e);
      },
      { immediate: !0 }
    );
    function y(e) {
      if (s.disabled) {
        e.preventDefault();
        return;
      }
      l.value = e.target.checked;
    }
    return (e, t) => (r(), c("label", {
      class: V([n(v), n(i).class]),
      style: N(n(i).style),
      for: n(h)
    }, [
      a("span", M, [
        a("input", w({
          id: n(h),
          ref_key: "inputRef",
          ref: d,
          type: "checkbox",
          class: "nm-checkbox__input",
          checked: l.value,
          disabled: o.disabled,
          name: o.name
        }, x.value, { onChange: y }), null, 16, P),
        a("span", R, [
          o.indeterminate ? (r(), c("svg", $, [...t[0] || (t[0] = [
            a("path", {
              d: "M5 12H19",
              stroke: "currentColor",
              "stroke-width": "3",
              "stroke-linecap": "round"
            }, null, -1)
          ])])) : l.value ? (r(), c("svg", H, [...t[1] || (t[1] = [
            a("path", {
              d: "M5 13l4 4L19 7",
              stroke: "currentColor",
              "stroke-width": "3",
              "stroke-linecap": "round",
              "stroke-linejoin": "round"
            }, null, -1)
          ])])) : f("", !0)
        ])
      ]),
      o.label || e.$slots.default ? (r(), c("span", O, [
        S(e.$slots, "default", {}, () => [
          A(D(o.label), 1)
        ], !0)
      ])) : f("", !0)
    ], 14, L));
  }
}), K = /* @__PURE__ */ I(T, [["__scopeId", "data-v-b1b907c9"]]);
export {
  K as N
};

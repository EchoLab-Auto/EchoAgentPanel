import { defineComponent as S, computed as s, useSlots as w, useAttrs as E, openBlock as o, createElementBlock as u, normalizeStyle as A, unref as l, normalizeClass as p, createBlock as K, createCommentVNode as d, createElementVNode as b, createTextVNode as j, toDisplayString as D, renderSlot as v, mergeProps as M, createVNode as O } from "vue";
import { useFormField as P } from "../composables/useFormField.js";
import { useConfig as T } from "../composables/useConfig.js";
import { N as G } from "./NeumorphismFieldLabel-CBF1nZs1.js";
import { N as H } from "./NeumorphismFieldError-BxamHjhs.js";
import { _ as J } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismInput.css';const Q = {
  key: 0,
  class: "nm-input__floating-required"
}, R = {
  key: 1,
  class: "nm-input__prefix"
}, U = ["id", "type", "value", "placeholder", "disabled", "readonly", "required", "maxlength", "minlength", "name", "autocomplete", "inputmode", "aria-invalid", "aria-errormessage", "aria-describedby"], W = {
  key: 2,
  class: "nm-input__suffix"
}, X = /* @__PURE__ */ S({
  inheritAttrs: !1,
  __name: "NeumorphismInput",
  props: {
    modelValue: { default: "" },
    type: { default: "text" },
    placeholder: {},
    disabled: { type: Boolean, default: !1 },
    readonly: { type: Boolean, default: !1 },
    required: { type: Boolean, default: !1 },
    size: {},
    maxlength: {},
    minlength: {},
    name: {},
    id: {},
    autocomplete: { default: "off" },
    inputmode: {},
    error: { type: [String, Boolean] },
    label: {},
    floatingLabel: { type: Boolean }
  },
  emits: ["update:modelValue", "focus", "blur", "input", "change", "keydown", "enter"],
  setup(t, { emit: x }) {
    const n = t, k = T(), N = s(() => {
      var e;
      return n.size ?? ((e = k.value.input) == null ? void 0 : e.size) ?? "medium";
    }), i = x, y = w(), m = E(), V = s(() => {
      const e = {};
      for (const a of Object.keys(m))
        a !== "class" && a !== "style" && (e[a] = m[a]);
      return e;
    }), { fieldId: r, isFocused: B, errorMessage: f, baseClassList: q, handleFocus: F, handleBlur: z } = P(
      () => ({
        id: n.id,
        size: N.value,
        disabled: n.disabled,
        error: n.error,
        prefix: "input"
      })
    ), h = s(() => n.modelValue.length > 0), C = s(() => [
      ...q("nm-input").value,
      {
        "nm-input--readonly": n.readonly,
        "nm-input--has-prefix": !!y.prefix,
        "nm-input--has-suffix": !!y.suffix,
        "nm-input--has-label": !!n.label,
        "nm-input--filled": h.value
      }
    ]), g = s(() => n.floatingLabel && !!n.label);
    function $(e) {
      const a = e.target;
      i("update:modelValue", a.value), i("input", e);
    }
    function I(e) {
      i("change", e);
    }
    function L(e) {
      i("keydown", e), e.key === "Enter" && i("enter", n.modelValue);
    }
    return (e, a) => (o(), u("div", {
      class: p(["nm-input__wrapper", l(m).class]),
      style: A(l(m).style)
    }, [
      g.value ? d("", !0) : (o(), K(G, {
        key: 0,
        label: t.label,
        required: t.required,
        "for-id": l(r)
      }, null, 8, ["label", "required", "for-id"])),
      b("div", {
        class: p(C.value)
      }, [
        g.value ? (o(), u("span", {
          key: 0,
          class: p([
            "nm-input__floating-label",
            { "nm-input__floating-label--active": h.value || l(B) }
          ])
        }, [
          j(D(t.label), 1),
          t.required ? (o(), u("span", Q, " *")) : d("", !0)
        ], 2)) : d("", !0),
        e.$slots.prefix ? (o(), u("div", R, [
          v(e.$slots, "prefix", {}, void 0, !0)
        ])) : d("", !0),
        b("input", M({
          id: l(r),
          type: t.type,
          value: t.modelValue,
          placeholder: t.placeholder,
          disabled: t.disabled,
          readonly: t.readonly,
          required: t.required,
          maxlength: t.maxlength,
          minlength: t.minlength,
          name: t.name,
          autocomplete: t.autocomplete,
          inputmode: t.inputmode,
          "aria-invalid": !!t.error,
          "aria-errormessage": l(f) ? `${l(r)}-error` : void 0,
          "aria-describedby": l(f) ? `${l(r)}-error` : void 0,
          class: "nm-input__field"
        }, V.value, {
          onInput: $,
          onChange: I,
          onFocus: a[0] || (a[0] = (c) => l(F)(c, i)),
          onBlur: a[1] || (a[1] = (c) => l(z)(c, i)),
          onKeydown: L
        }), null, 16, U),
        e.$slots.suffix ? (o(), u("div", W, [
          v(e.$slots, "suffix", {}, void 0, !0)
        ])) : d("", !0)
      ], 2),
      O(H, {
        id: `${l(r)}-error`,
        message: l(f)
      }, null, 8, ["id", "message"])
    ], 6));
  }
}), ae = /* @__PURE__ */ J(X, [["__scopeId", "data-v-78da569e"]]);
export {
  ae as N
};

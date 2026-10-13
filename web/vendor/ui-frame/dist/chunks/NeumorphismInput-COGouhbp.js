import { defineComponent as S, computed as s, useSlots as w, useAttrs as E, openBlock as o, createElementBlock as u, normalizeStyle as A, unref as l, normalizeClass as p, createBlock as K, createCommentVNode as d, createElementVNode as b, createTextVNode as j, toDisplayString as D, renderSlot as v, mergeProps as M, createVNode as O } from "vue";
import { useFormField as P } from "../composables/useFormField.js";
import { useConfig as T } from "../composables/useConfig.js";
import { isImeComposing as G } from "../composables/useChatInput.js";
import { N as H } from "./NeumorphismFieldLabel-C3S1Ax2f.js";
import { N as J } from "./NeumorphismFieldError-BxamHjhs.js";
import { _ as Q } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismInput.css';const R = {
  key: 0,
  class: "nm-input__floating-required"
}, U = {
  key: 1,
  class: "nm-input__prefix"
}, W = ["id", "type", "value", "placeholder", "disabled", "readonly", "required", "maxlength", "minlength", "name", "autocomplete", "inputmode", "aria-invalid", "aria-errormessage", "aria-describedby"], X = {
  key: 2,
  class: "nm-input__suffix"
}, Y = /* @__PURE__ */ S({
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
    }), { fieldId: r, isFocused: B, errorMessage: f, baseClassList: q, handleFocus: C, handleBlur: F } = P(
      () => ({
        id: n.id,
        size: N.value,
        disabled: n.disabled,
        error: n.error,
        prefix: "input"
      })
    ), g = s(() => n.modelValue.length > 0), z = s(() => [
      ...q("nm-input").value,
      {
        "nm-input--readonly": n.readonly,
        "nm-input--has-prefix": !!y.prefix,
        "nm-input--has-suffix": !!y.suffix,
        "nm-input--has-label": !!n.label,
        "nm-input--filled": g.value
      }
    ]), h = s(() => n.floatingLabel && !!n.label);
    function I(e) {
      const a = e.target;
      i("update:modelValue", a.value), i("input", e);
    }
    function $(e) {
      i("change", e);
    }
    function L(e) {
      if (i("keydown", e), e.key === "Enter") {
        if (G(e)) return;
        i("enter", n.modelValue);
      }
    }
    return (e, a) => (o(), u("div", {
      class: p(["nm-input__wrapper", l(m).class]),
      style: A(l(m).style)
    }, [
      h.value ? d("", !0) : (o(), K(H, {
        key: 0,
        label: t.label,
        required: t.required,
        "for-id": l(r)
      }, null, 8, ["label", "required", "for-id"])),
      b("div", {
        class: p(z.value)
      }, [
        h.value ? (o(), u("span", {
          key: 0,
          class: p([
            "nm-input__floating-label",
            { "nm-input__floating-label--active": g.value || l(B) }
          ])
        }, [
          j(D(t.label), 1),
          t.required ? (o(), u("span", R, " *")) : d("", !0)
        ], 2)) : d("", !0),
        e.$slots.prefix ? (o(), u("div", U, [
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
          onInput: I,
          onChange: $,
          onFocus: a[0] || (a[0] = (c) => l(C)(c, i)),
          onBlur: a[1] || (a[1] = (c) => l(F)(c, i)),
          onKeydown: L
        }), null, 16, W),
        e.$slots.suffix ? (o(), u("div", X, [
          v(e.$slots, "suffix", {}, void 0, !0)
        ])) : d("", !0)
      ], 2),
      O(J, {
        id: `${l(r)}-error`,
        message: l(f)
      }, null, 8, ["id", "message"])
    ], 6));
  }
}), ie = /* @__PURE__ */ Q(Y, [["__scopeId", "data-v-9b9b53be"]]);
export {
  ie as N
};

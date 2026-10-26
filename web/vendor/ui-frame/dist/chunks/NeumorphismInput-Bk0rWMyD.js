import { defineComponent as A, computed as o, useSlots as D, useAttrs as K, openBlock as r, createElementBlock as u, normalizeStyle as x, unref as a, normalizeClass as y, createBlock as P, createCommentVNode as d, createElementVNode as k, createTextVNode as T, toDisplayString as j, renderSlot as z, mergeProps as M, createVNode as O } from "vue";
import { useFormField as U } from "../composables/useFormField.js";
import { useConfig as X } from "../composables/useConfig.js";
import { isImeComposing as Z } from "../composables/useChatInput.js";
import { n as G, r as H, F as J } from "./controlScales-CPj0Htdh.js";
import { N as Q } from "./NeumorphismFieldLabel-C3S1Ax2f.js";
import { N as R } from "./NeumorphismFieldError-BxamHjhs.js";
import { _ as W } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismInput.css';const Y = {
  key: 0,
  class: "nm-input__floating-required"
}, _ = {
  key: 1,
  class: "nm-input__prefix"
}, ee = ["id", "type", "value", "placeholder", "disabled", "readonly", "required", "maxlength", "minlength", "name", "autocomplete", "inputmode", "aria-invalid", "aria-errormessage", "aria-describedby"], te = {
  key: 2,
  class: "nm-input__suffix"
}, le = 48, ae = /* @__PURE__ */ A({
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
  setup(t, { emit: N }) {
    const n = t, g = X(), c = o(() => {
      var l;
      const e = n.size ?? ((l = g.value.input) == null ? void 0 : l.size);
      return typeof e == "number" ? G(e, le) : void 0;
    }), S = o(() => {
      var l;
      const e = n.size ?? ((l = g.value.input) == null ? void 0 : l.size);
      return typeof e == "string" ? e : "medium";
    }), F = o(
      () => c.value === void 0 ? void 0 : H(J, c.value)
    ), i = N, h = D(), m = K(), V = o(() => {
      const e = {};
      for (const l of Object.keys(m))
        l !== "class" && l !== "style" && (e[l] = m[l]);
      return e;
    }), { fieldId: s, isFocused: B, errorMessage: f, baseClassList: C, handleFocus: q, handleBlur: I } = U(
      () => ({
        id: n.id,
        // 数字直接交给 useFormField 判 `--sized` 档；它只决定 class，几何量在内联变量里
        size: c.value ?? S.value,
        disabled: n.disabled,
        error: n.error,
        prefix: "input"
      })
    ), v = o(() => n.modelValue.length > 0), L = o(() => [
      ...C("nm-input").value,
      {
        "nm-input--readonly": n.readonly,
        "nm-input--has-prefix": !!h.prefix,
        "nm-input--has-suffix": !!h.suffix,
        "nm-input--has-label": !!n.label,
        "nm-input--filled": v.value
      }
    ]), b = o(() => n.floatingLabel && !!n.label);
    function E(e) {
      const l = e.target;
      i("update:modelValue", l.value), i("input", e);
    }
    function w(e) {
      i("change", e);
    }
    function $(e) {
      if (i("keydown", e), e.key === "Enter") {
        if (Z(e)) return;
        i("enter", n.modelValue);
      }
    }
    return (e, l) => (r(), u("div", {
      class: y(["nm-input__wrapper", a(m).class]),
      style: x(a(m).style)
    }, [
      b.value ? d("", !0) : (r(), P(Q, {
        key: 0,
        label: t.label,
        required: t.required,
        "for-id": a(s)
      }, null, 8, ["label", "required", "for-id"])),
      k("div", {
        class: y(L.value),
        style: x(F.value)
      }, [
        b.value ? (r(), u("span", {
          key: 0,
          class: y([
            "nm-input__floating-label",
            { "nm-input__floating-label--active": v.value || a(B) }
          ])
        }, [
          T(j(t.label), 1),
          t.required ? (r(), u("span", Y, " *")) : d("", !0)
        ], 2)) : d("", !0),
        e.$slots.prefix ? (r(), u("div", _, [
          z(e.$slots, "prefix", {}, void 0, !0)
        ])) : d("", !0),
        k("input", M({
          id: a(s),
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
          "aria-errormessage": a(f) ? `${a(s)}-error` : void 0,
          "aria-describedby": a(f) ? `${a(s)}-error` : void 0,
          class: "nm-input__field"
        }, V.value, {
          onInput: E,
          onChange: w,
          onFocus: l[0] || (l[0] = (p) => a(q)(p, i)),
          onBlur: l[1] || (l[1] = (p) => a(I)(p, i)),
          onKeydown: $
        }), null, 16, ee),
        e.$slots.suffix ? (r(), u("div", te, [
          z(e.$slots, "suffix", {}, void 0, !0)
        ])) : d("", !0)
      ], 6),
      O(R, {
        id: `${a(s)}-error`,
        message: a(f)
      }, null, 8, ["id", "message"])
    ], 6));
  }
}), ce = /* @__PURE__ */ W(ae, [["__scopeId", "data-v-37f5519c"]]);
export {
  ce as N
};

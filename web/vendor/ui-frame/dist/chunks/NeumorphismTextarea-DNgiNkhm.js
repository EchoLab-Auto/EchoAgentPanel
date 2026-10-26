import { defineComponent as R, useAttrs as A, computed as n, ref as T, onMounted as D, watch as K, nextTick as j, openBlock as g, createElementBlock as x, normalizeStyle as v, unref as r, normalizeClass as p, createVNode as b, createElementVNode as f, mergeProps as H, toDisplayString as z, createCommentVNode as M } from "vue";
import { useFormField as P } from "../composables/useFormField.js";
import { u as $ } from "./createComponent-jnXBYqCm.js";
import { n as O, r as U, F as X } from "./controlScales-CPj0Htdh.js";
import { N as Z } from "./NeumorphismFieldLabel-C3S1Ax2f.js";
import { N as G } from "./NeumorphismFieldError-BxamHjhs.js";
import { _ as J } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismTextarea.css';const Q = ["id", "value", "placeholder", "disabled", "readonly", "required", "maxlength", "minlength", "rows", "name", "inputmode", "aria-invalid", "aria-errormessage"], W = { class: "nm-textarea__footer" }, Y = {
  key: 0,
  class: "nm-textarea__count"
}, _ = 48, ee = /* @__PURE__ */ R({
  inheritAttrs: !1,
  __name: "NeumorphismTextarea",
  props: {
    modelValue: { default: "" },
    placeholder: {},
    disabled: { type: Boolean, default: !1 },
    readonly: { type: Boolean, default: !1 },
    required: { type: Boolean, default: !1 },
    size: {},
    maxlength: {},
    minlength: {},
    label: {},
    error: { type: [String, Boolean] },
    name: {},
    id: {},
    inputmode: {},
    rows: { default: 4 },
    autoResize: { type: Boolean, default: !1 },
    showCount: { type: Boolean, default: !1 }
  },
  emits: ["update:modelValue", "focus", "blur", "input", "change", "keydown", "enter"],
  setup(t, { emit: w }) {
    const l = t, o = w, s = A(), N = n(() => {
      const e = {};
      for (const a of Object.keys(s))
        a !== "class" && a !== "style" && (e[a] = s[a]);
      return e;
    }), { config: h } = $(), d = n(() => {
      var a;
      const e = l.size ?? ((a = h.value.textarea) == null ? void 0 : a.size);
      return typeof e == "number" ? O(e, _) : void 0;
    }), C = n(() => {
      var a;
      const e = l.size ?? ((a = h.value.textarea) == null ? void 0 : a.size);
      return typeof e == "string" ? e : "medium";
    }), S = n(
      () => d.value === void 0 ? void 0 : U(X, d.value)
    ), { fieldId: i, errorMessage: y, baseClassList: k, handleFocus: B, handleBlur: V } = P(() => ({
      id: l.id,
      // 数字直接交给 useFormField 判 `--sized` 档；它只决定 class，几何量在内联变量里
      size: d.value ?? C.value,
      disabled: l.disabled,
      error: l.error,
      prefix: "textarea"
    })), u = T(), F = n(() => {
      var e;
      return ((e = l.modelValue) == null ? void 0 : e.length) || 0;
    }), E = n(() => [
      ...k("nm-textarea").value,
      {
        "nm-textarea--readonly": l.readonly,
        "nm-textarea--has-label": !!l.label
      }
    ]);
    function m() {
      if (!l.autoResize || !u.value) return;
      const e = u.value, a = e.placeholder;
      a && (e.placeholder = ""), e.style.height = "auto", e.style.height = e.scrollHeight + "px", a && (e.placeholder = a);
    }
    function q(e) {
      const a = e.target;
      o("update:modelValue", a.value), o("input", e), m();
    }
    function I(e) {
      o("change", e);
    }
    function L(e) {
      o("keydown", e), e.key === "Enter" && !e.shiftKey && o("enter", l.modelValue);
    }
    return D(() => {
      m();
    }), K(
      () => l.modelValue,
      () => {
        l.autoResize && j(m);
      }
    ), (e, a) => (g(), x("div", {
      class: p(["nm-textarea__wrapper", r(s).class]),
      style: v(r(s).style)
    }, [
      b(Z, {
        label: t.label,
        required: t.required,
        "for-id": r(i)
      }, null, 8, ["label", "required", "for-id"]),
      f("div", {
        class: p(E.value),
        style: v(S.value)
      }, [
        f("textarea", H({
          id: r(i),
          ref_key: "textareaRef",
          ref: u,
          class: ["nm-textarea__field", { "nm-textarea__field--auto-resize": t.autoResize }],
          value: t.modelValue,
          placeholder: t.placeholder,
          disabled: t.disabled,
          readonly: t.readonly,
          required: t.required,
          maxlength: t.maxlength,
          minlength: t.minlength,
          rows: t.rows,
          name: t.name,
          inputmode: t.inputmode,
          "aria-invalid": !!t.error,
          "aria-errormessage": r(y) ? `${r(i)}-error` : void 0
        }, N.value, {
          onInput: q,
          onChange: I,
          onFocus: a[0] || (a[0] = (c) => r(B)(c, o)),
          onBlur: a[1] || (a[1] = (c) => r(V)(c, o)),
          onKeydown: L
        }), null, 16, Q)
      ], 6),
      f("div", W, [
        b(G, {
          id: `${r(i)}-error`,
          message: r(y)
        }, null, 8, ["id", "message"]),
        t.showCount && t.maxlength ? (g(), x("span", Y, z(F.value) + " / " + z(t.maxlength), 1)) : M("", !0)
      ])
    ], 6));
  }
}), ie = /* @__PURE__ */ J(ee, [["__scopeId", "data-v-b9fa7677"]]);
export {
  ie as N
};

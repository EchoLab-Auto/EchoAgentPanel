import { defineComponent as E, useAttrs as I, computed as i, ref as A, onMounted as K, watch as L, nextTick as T, openBlock as h, createElementBlock as g, normalizeStyle as j, unref as r, normalizeClass as x, createVNode as y, createElementVNode as c, mergeProps as H, toDisplayString as p, createCommentVNode as M } from "vue";
import { useFormField as P } from "../composables/useFormField.js";
import { u as $ } from "./createComponent-jnXBYqCm.js";
import { N as D } from "./NeumorphismFieldLabel-C3S1Ax2f.js";
import { N as O } from "./NeumorphismFieldError-BxamHjhs.js";
import { _ as G } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismTextarea.css';const J = ["id", "value", "placeholder", "disabled", "readonly", "required", "maxlength", "minlength", "rows", "name", "inputmode", "aria-invalid", "aria-errormessage"], Q = { class: "nm-textarea__footer" }, U = {
  key: 0,
  class: "nm-textarea__count"
}, W = /* @__PURE__ */ E({
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
  setup(a, { emit: v }) {
    const l = a, o = v, n = I(), b = i(() => {
      const e = {};
      for (const t of Object.keys(n))
        t !== "class" && t !== "style" && (e[t] = n[t]);
      return e;
    }), { config: w, resolveProp: z } = $(), N = i(() => {
      var e;
      return z(l.size, (e = w.value.textarea) == null ? void 0 : e.size, "medium");
    }), { fieldId: s, errorMessage: f, baseClassList: k, handleFocus: B, handleBlur: V } = P(() => ({
      id: l.id,
      size: N.value,
      disabled: l.disabled,
      error: l.error,
      prefix: "textarea"
    })), d = A(), C = i(() => {
      var e;
      return ((e = l.modelValue) == null ? void 0 : e.length) || 0;
    }), q = i(() => [
      ...k("nm-textarea").value,
      {
        "nm-textarea--readonly": l.readonly,
        "nm-textarea--has-label": !!l.label
      }
    ]);
    function u() {
      if (!l.autoResize || !d.value) return;
      const e = d.value, t = e.placeholder;
      t && (e.placeholder = ""), e.style.height = "auto", e.style.height = e.scrollHeight + "px", t && (e.placeholder = t);
    }
    function F(e) {
      const t = e.target;
      o("update:modelValue", t.value), o("input", e), u();
    }
    function R(e) {
      o("change", e);
    }
    function S(e) {
      o("keydown", e), e.key === "Enter" && !e.shiftKey && o("enter", l.modelValue);
    }
    return K(() => {
      u();
    }), L(
      () => l.modelValue,
      () => {
        l.autoResize && T(u);
      }
    ), (e, t) => (h(), g("div", {
      class: x(["nm-textarea__wrapper", r(n).class]),
      style: j(r(n).style)
    }, [
      y(D, {
        label: a.label,
        required: a.required,
        "for-id": r(s)
      }, null, 8, ["label", "required", "for-id"]),
      c("div", {
        class: x(q.value)
      }, [
        c("textarea", H({
          id: r(s),
          ref_key: "textareaRef",
          ref: d,
          class: ["nm-textarea__field", { "nm-textarea__field--auto-resize": a.autoResize }],
          value: a.modelValue,
          placeholder: a.placeholder,
          disabled: a.disabled,
          readonly: a.readonly,
          required: a.required,
          maxlength: a.maxlength,
          minlength: a.minlength,
          rows: a.rows,
          name: a.name,
          inputmode: a.inputmode,
          "aria-invalid": !!a.error,
          "aria-errormessage": r(f) ? `${r(s)}-error` : void 0
        }, b.value, {
          onInput: F,
          onChange: R,
          onFocus: t[0] || (t[0] = (m) => r(B)(m, o)),
          onBlur: t[1] || (t[1] = (m) => r(V)(m, o)),
          onKeydown: S
        }), null, 16, J)
      ], 2),
      c("div", Q, [
        y(O, {
          id: `${r(s)}-error`,
          message: r(f)
        }, null, 8, ["id", "message"]),
        a.showCount && a.maxlength ? (h(), g("span", U, p(C.value) + " / " + p(a.maxlength), 1)) : M("", !0)
      ])
    ], 6));
  }
}), te = /* @__PURE__ */ G(W, [["__scopeId", "data-v-793135c3"]]);
export {
  te as N
};

import { defineComponent as E, useAttrs as I, computed as d, ref as A, onMounted as K, watch as L, nextTick as T, openBlock as h, createElementBlock as g, normalizeStyle as j, unref as r, normalizeClass as y, createVNode as x, createElementVNode as c, mergeProps as H, toDisplayString as v, createCommentVNode as M } from "vue";
import { useFormField as P } from "../composables/useFormField.js";
import { u as $ } from "./createComponent-jnXBYqCm.js";
import { N as D } from "./NeumorphismFieldLabel-CBF1nZs1.js";
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
  setup(e, { emit: p }) {
    const t = e, o = p, s = I(), b = d(() => {
      const a = {};
      for (const l of Object.keys(s))
        l !== "class" && l !== "style" && (a[l] = s[l]);
      return a;
    }), { config: w, resolveProp: z } = $(), N = d(() => {
      var a;
      return z(t.size, (a = w.value.textarea) == null ? void 0 : a.size, "medium");
    }), { fieldId: i, errorMessage: f, baseClassList: k, handleFocus: B, handleBlur: V } = P(() => ({
      id: t.id,
      size: N.value,
      disabled: t.disabled,
      error: t.error,
      prefix: "textarea"
    })), n = A(), C = d(() => {
      var a;
      return ((a = t.modelValue) == null ? void 0 : a.length) || 0;
    }), q = d(() => [
      ...k("nm-textarea").value,
      {
        "nm-textarea--readonly": t.readonly,
        "nm-textarea--has-label": !!t.label
      }
    ]);
    function u() {
      !t.autoResize || !n.value || (n.value.style.height = "auto", n.value.style.height = n.value.scrollHeight + "px");
    }
    function F(a) {
      const l = a.target;
      o("update:modelValue", l.value), o("input", a), u();
    }
    function R(a) {
      o("change", a);
    }
    function S(a) {
      o("keydown", a), a.key === "Enter" && !a.shiftKey && o("enter", t.modelValue);
    }
    return K(() => {
      u();
    }), L(
      () => t.modelValue,
      () => {
        t.autoResize && T(u);
      }
    ), (a, l) => (h(), g("div", {
      class: y(["nm-textarea__wrapper", r(s).class]),
      style: j(r(s).style)
    }, [
      x(D, {
        label: e.label,
        required: e.required,
        "for-id": r(i)
      }, null, 8, ["label", "required", "for-id"]),
      c("div", {
        class: y(q.value)
      }, [
        c("textarea", H({
          id: r(i),
          ref_key: "textareaRef",
          ref: n,
          class: ["nm-textarea__field", { "nm-textarea__field--auto-resize": e.autoResize }],
          value: e.modelValue,
          placeholder: e.placeholder,
          disabled: e.disabled,
          readonly: e.readonly,
          required: e.required,
          maxlength: e.maxlength,
          minlength: e.minlength,
          rows: e.rows,
          name: e.name,
          inputmode: e.inputmode,
          "aria-invalid": !!e.error,
          "aria-errormessage": r(f) ? `${r(i)}-error` : void 0
        }, b.value, {
          onInput: F,
          onChange: R,
          onFocus: l[0] || (l[0] = (m) => r(B)(m, o)),
          onBlur: l[1] || (l[1] = (m) => r(V)(m, o)),
          onKeydown: S
        }), null, 16, J)
      ], 2),
      c("div", Q, [
        x(O, {
          id: `${r(i)}-error`,
          message: r(f)
        }, null, 8, ["id", "message"]),
        e.showCount && e.maxlength ? (h(), g("span", U, v(C.value) + " / " + v(e.maxlength), 1)) : M("", !0)
      ])
    ], 6));
  }
}), te = /* @__PURE__ */ G(W, [["__scopeId", "data-v-3fc10468"]]);
export {
  te as N
};

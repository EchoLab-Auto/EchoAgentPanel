import { defineComponent as S, computed as m, reactive as D, provide as M, onBeforeUnmount as z, openBlock as p, createElementBlock as _, normalizeClass as I, renderSlot as N, inject as L, ref as R, watch as A, normalizeStyle as K, unref as k, createTextVNode as T, toDisplayString as E, createCommentVNode as g, createElementVNode as U } from "vue";
import { validateFieldValue as W } from "../composables/useFormValidation.js";
import { FormKey as V } from "../composables/injectionKeys.js";
import { useConfig as G } from "../composables/useConfig.js";
import { _ as x } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import { generateId as H } from "../utils/index.js";
import '../NeumorphismFormItem.css';const J = /* @__PURE__ */ S({
  __name: "NeumorphismForm",
  props: {
    model: { default: () => ({}) },
    rules: { default: () => ({}) },
    labelWidth: {},
    size: {},
    direction: {}
  },
  emits: ["submit", "validate"],
  setup(u, { expose: h, emit: l }) {
    const t = u, a = G(), b = m(() => {
      var e;
      return t.labelWidth ?? ((e = a.value.form) == null ? void 0 : e.labelWidth);
    }), c = m(() => {
      var e;
      return t.size ?? ((e = a.value.form) == null ? void 0 : e.size);
    }), v = m(
      () => {
        var e;
        return t.direction ?? ((e = a.value.form) == null ? void 0 : e.direction) ?? "vertical";
      }
    ), f = l, r = D({}), o = /* @__PURE__ */ new Map();
    function i(e) {
      const s = t.rules[e];
      if (s) {
        const q = t.model[e], y = W(q, s);
        if (y)
          return r[e] = y, !1;
      }
      const d = o.get(e);
      if (d) {
        if (!d(t.model[e]))
          return !1;
      } else if (!s)
        return delete r[e], !0;
      return delete r[e], !0;
    }
    function n() {
      let e = !0;
      const s = /* @__PURE__ */ new Set([...Object.keys(t.rules), ...o.keys()]);
      for (const d of s)
        i(d) || (e = !1);
      for (const d of Object.keys(r))
        s.has(d) || delete r[d];
      return f("validate", e), e;
    }
    function B(e, s) {
      o.set(e, s);
    }
    function $(e) {
      o.delete(e), delete r[e];
    }
    function j(e) {
      e.preventDefault(), n() && f("submit", { ...t.model });
    }
    function F() {
      Object.keys(r).forEach((e) => delete r[e]);
    }
    const w = /* @__PURE__ */ new Set();
    function C(e) {
      w.add(e), i(e);
    }
    M(V, {
      get model() {
        return t.model;
      },
      get rules() {
        return t.rules;
      },
      errors: r,
      // Use getters (like model/rules above) so children read the latest values
      // when the parent updates these props at runtime, instead of a setup-time
      // snapshot.
      get labelWidth() {
        return b.value;
      },
      get size() {
        return c.value;
      },
      validateField: i,
      validateFieldOnBlur: C,
      registerField: B,
      unregisterField: $
    }), z(() => {
      o.clear();
    });
    const O = m(() => ["nm-form", `nm-form--${v.value}`]);
    return h({ validateAll: n, validateField: i, clearErrors: F }), (e, s) => (p(), _("form", {
      class: I(O.value),
      novalidate: "",
      onSubmit: j
    }, [
      N(e.$slots, "default", {
        errors: r,
        validateAll: n,
        clearErrors: F
      }, void 0, !0)
    ], 34));
  }
}), ne = /* @__PURE__ */ x(J, [["__scopeId", "data-v-3bb3ab80"]]), P = ["for"], Q = {
  key: 0,
  class: "nm-form-item__required"
}, X = { class: "nm-form-item__content" }, Y = {
  key: 1,
  class: "nm-form-item__error",
  role: "alert"
}, Z = /* @__PURE__ */ S({
  __name: "NeumorphismFormItem",
  props: {
    label: {},
    required: { type: Boolean },
    error: {},
    rules: { default: () => [] },
    name: {}
  },
  setup(u, { expose: h }) {
    const l = u, t = L(V, null), a = R(""), b = m(() => l.name ? t == null ? void 0 : t.errors[l.name] : void 0), c = m(() => l.error || b.value || a.value), v = m(() => l.name ? `nm-field-${l.name}` : H("nm-field"));
    function f(o) {
      const i = l.rules;
      if (!i.length) return !0;
      const n = W(o, i);
      return n ? (a.value = n, !1) : (a.value = "", !0);
    }
    function r() {
      a.value = "";
    }
    return A(
      () => l.name,
      (o, i) => {
        i && t && t.unregisterField(i), o && t && t.registerField(o, f);
      },
      { immediate: !0 }
    ), z(() => {
      l.name && t && t.unregisterField(l.name);
    }), h({ validate: f, clearError: r, fieldId: v }), (o, i) => {
      var n;
      return p(), _("div", {
        class: I(["nm-form-item", { "nm-form-item--error": !!c.value }])
      }, [
        u.label ? (p(), _("label", {
          key: 0,
          for: u.name ? v.value : void 0,
          class: "nm-form-item__label",
          style: K((n = k(t)) != null && n.labelWidth ? { width: k(t).labelWidth } : void 0)
        }, [
          T(E(u.label) + " ", 1),
          u.required ? (p(), _("span", Q, "*")) : g("", !0)
        ], 12, P)) : g("", !0),
        U("div", X, [
          N(o.$slots, "default", {
            error: c.value,
            validate: f,
            fieldId: v.value
          }, void 0, !0)
        ]),
        c.value ? (p(), _("div", Y, E(c.value), 1)) : g("", !0)
      ], 2);
    };
  }
}), se = /* @__PURE__ */ x(Z, [["__scopeId", "data-v-3d7529ae"]]);
export {
  ne as N,
  se as a
};

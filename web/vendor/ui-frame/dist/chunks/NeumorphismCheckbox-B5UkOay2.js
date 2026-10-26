import { defineComponent as V, computed as a, useAttrs as w, ref as A, watch as E, openBlock as d, createElementBlock as p, unref as n, normalizeStyle as D, normalizeClass as I, createElementVNode as u, mergeProps as L, createBlock as b, createCommentVNode as k, renderSlot as O, createTextVNode as P, toDisplayString as R } from "vue";
import { useCheckable as $ } from "../composables/useCheckable.js";
import { u as j } from "./createComponent-jnXBYqCm.js";
import { n as H, r as K, c as v } from "./controlScales-CPj0Htdh.js";
import { N as _ } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as T } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismCheckbox.css';const X = ["for"], q = { class: "nm-checkbox__input-wrapper" }, F = ["id", "checked", "disabled", "name"], G = {
  class: "nm-checkbox__box",
  "aria-hidden": "true"
}, J = {
  key: 0,
  class: "nm-checkbox__label"
}, M = /* @__PURE__ */ V({
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
  setup(s, { emit: y }) {
    const t = s, { config: x, resolveProp: C } = j(), i = a(
      () => {
        var e;
        return C(t.size, (e = x.value.checkbox) == null ? void 0 : e.size, "medium");
      }
    ), l = a(
      () => typeof i.value == "number" ? H(i.value, v.primary.md) : void 0
    ), z = a(
      () => typeof i.value == "string" ? i.value : "medium"
    ), S = a(
      () => l.value === void 0 ? void 0 : K(v, l.value)
    ), h = y, c = a({
      get: () => t.modelValue,
      set: (e) => {
        t.disabled || (h("update:modelValue", e), h("change", e));
      }
    }), r = w(), m = A(), g = a(() => {
      const e = {};
      for (const o of Object.keys(r))
        o !== "class" && o !== "style" && (e[o] = r[o]);
      return e;
    }), { inputId: f, classList: N } = $(() => ({
      prefix: "checkbox",
      isChecked: c.value,
      isDisabled: t.disabled,
      // 数字路径不挂档位类：几何全由内联 `--nm-checkbox-sz-*` 决定，与档位类互斥，
      // 避免两套尺寸声明同时命中时靠顺序取胜
      size: l.value === void 0 ? z.value : void 0,
      extraClasses: {
        "nm-checkbox--indeterminate": t.indeterminate,
        "nm-checkbox--sized": l.value !== void 0
      }
    }));
    E(
      () => t.indeterminate,
      (e) => {
        m.value && (m.value.indeterminate = e);
      },
      { immediate: !0 }
    );
    function B(e) {
      if (t.disabled) {
        e.preventDefault();
        return;
      }
      c.value = e.target.checked;
    }
    return (e, o) => (d(), p("label", {
      class: I([n(N), n(r).class]),
      style: D([n(r).style, S.value]),
      for: n(f)
    }, [
      u("span", q, [
        u("input", L({
          id: n(f),
          ref_key: "inputRef",
          ref: m,
          type: "checkbox",
          class: "nm-checkbox__input",
          checked: c.value,
          disabled: s.disabled,
          name: s.name
        }, g.value, { onChange: B }), null, 16, F),
        u("span", G, [
          s.indeterminate ? (d(), b(_, {
            key: 0,
            name: "minus",
            class: "nm-checkbox__icon",
            "stroke-width": 3
          })) : c.value ? (d(), b(_, {
            key: 1,
            name: "check",
            class: "nm-checkbox__icon",
            "stroke-width": 3
          })) : k("", !0)
        ])
      ]),
      s.label || e.$slots.default ? (d(), p("span", J, [
        O(e.$slots, "default", {}, () => [
          P(R(s.label), 1)
        ], !0)
      ])) : k("", !0)
    ], 14, X));
  }
}), te = /* @__PURE__ */ T(M, [["__scopeId", "data-v-191fb21c"]]);
export {
  te as N
};

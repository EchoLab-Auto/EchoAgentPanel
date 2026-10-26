import { defineComponent as C, useAttrs as w, computed as s, inject as E, openBlock as z, createElementBlock as b, unref as r, normalizeStyle as L, normalizeClass as N, createElementVNode as h, mergeProps as P, renderSlot as k, createTextVNode as j, toDisplayString as G, createCommentVNode as O, provide as K, toRef as V } from "vue";
import { useCheckable as T } from "../composables/useCheckable.js";
import { RadioGroupKey as R } from "../composables/injectionKeys.js";
import { u as $ } from "./createComponent-jnXBYqCm.js";
import { n as q, r as F, R as S } from "./controlScales-CPj0Htdh.js";
import { _ as A } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import { generateId as H } from "../utils/index.js";
import '../NeumorphismRadioGroup.css';const J = ["for"], M = { class: "nm-radio__input-wrapper" }, Q = ["id", "checked", "disabled", "name", "value"], U = {
  key: 0,
  class: "nm-radio__label"
}, W = /* @__PURE__ */ C({
  inheritAttrs: !1,
  __name: "NeumorphismRadio",
  props: {
    modelValue: {},
    value: {},
    disabled: { type: Boolean, default: !1 },
    label: {},
    size: {},
    name: {},
    id: {}
  },
  emits: ["update:modelValue", "change"],
  setup(i, { emit: _ }) {
    const a = i, { config: m, resolveProp: c } = $(), p = _, n = w(), v = s(() => {
      const l = {};
      for (const t of Object.keys(n))
        t !== "class" && t !== "style" && (l[t] = n[t]);
      return l;
    }), o = E(R, null), f = s(() => o ? o.modelValue.value === a.value : a.modelValue === a.value), u = s(() => a.disabled || (o == null ? void 0 : o.disabled.value) || !1), e = s(() => {
      var t;
      const l = c(a.size, (t = m.value.radio) == null ? void 0 : t.size, "medium");
      return (o == null ? void 0 : o.size.value) || l;
    }), d = s(
      () => typeof e.value == "number" ? q(e.value, S.primary.md) : void 0
    ), D = s(
      () => typeof e.value == "string" ? e.value : "medium"
    ), I = s(
      () => d.value === void 0 ? void 0 : F(S, d.value)
    ), { inputId: g, classList: x } = T(() => ({
      prefix: "radio",
      isChecked: f.value,
      isDisabled: u.value,
      // 数字路径不挂档位类：几何全由内联 `--nm-radio-sz-*` 决定，两条通道互斥
      size: d.value === void 0 ? D.value : void 0,
      extraClasses: { "nm-radio--sized": d.value !== void 0 }
    }));
    function B() {
      u.value || (o ? o.setValue(a.value) : (p("update:modelValue", a.value), p("change", a.value)));
    }
    return (l, t) => {
      var y;
      return z(), b("label", {
        class: N([r(x), r(n).class]),
        style: L([r(n).style, I.value]),
        for: r(g)
      }, [
        h("span", M, [
          h("input", P({
            id: r(g),
            type: "radio",
            class: "nm-radio__input",
            checked: f.value,
            disabled: u.value,
            name: ((y = r(o)) == null ? void 0 : y.name.value) || i.name,
            value: i.value
          }, v.value, { onChange: B }), null, 16, Q),
          t[0] || (t[0] = h("span", {
            class: "nm-radio__circle",
            "aria-hidden": "true"
          }, [
            h("span", { class: "nm-radio__dot" })
          ], -1))
        ]),
        i.label || l.$slots.default ? (z(), b("span", U, [
          k(l.$slots, "default", {}, () => [
            j(G(i.label), 1)
          ], !0)
        ])) : O("", !0)
      ], 14, J);
    };
  }
}), le = /* @__PURE__ */ A(W, [["__scopeId", "data-v-4a8223fd"]]), X = ["aria-orientation"], Y = /* @__PURE__ */ C({
  __name: "NeumorphismRadioGroup",
  props: {
    modelValue: {},
    disabled: { type: Boolean, default: !1 },
    size: {},
    name: {},
    direction: {}
  },
  emits: ["update:modelValue", "change"],
  setup(i, { emit: _ }) {
    const a = i, { config: m, resolveProp: c } = $(), p = s(
      () => {
        var e;
        return c(a.size, (e = m.value.radioGroup) == null ? void 0 : e.size, "medium");
      }
    ), n = s(
      () => {
        var e;
        return c(a.direction, (e = m.value.radioGroup) == null ? void 0 : e.direction, "horizontal");
      }
    ), v = _, o = s(() => a.name || H("nm-radio-group"));
    function f(e) {
      v("update:modelValue", e), v("change", e);
    }
    K(R, {
      modelValue: V(a, "modelValue"),
      name: o,
      disabled: V(a, "disabled"),
      size: s(() => p.value),
      setValue: f
    });
    const u = s(() => ["nm-radio-group", `nm-radio-group--${n.value}`]);
    return (e, d) => (z(), b("div", {
      class: N(u.value),
      role: "radiogroup",
      "aria-orientation": i.direction
    }, [
      k(e.$slots, "default", {}, void 0, !0)
    ], 10, X));
  }
}), ne = /* @__PURE__ */ A(Y, [["__scopeId", "data-v-b2d6a4e8"]]);
export {
  le as N,
  ne as a
};

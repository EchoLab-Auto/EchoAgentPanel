import { defineComponent as L, computed as t, watch as E, openBlock as n, createElementBlock as u, unref as A, normalizeStyle as x, normalizeClass as b, Fragment as B, renderList as I, createVNode as w, toDisplayString as D, createCommentVNode as G } from "vue";
import { useTheme as H } from "../composables/useTheme.js";
import { useLocale as M } from "../composables/useLocale.js";
import { u as O } from "./createComponent-jnXBYqCm.js";
import { n as $, r as F, k as c } from "./controlScales-CPj0Htdh.js";
import { N as P } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as j } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismThemeToggle.css';const q = ["aria-label"], J = ["aria-pressed", "disabled", "onClick"], K = {
  key: 0,
  class: "nm-theme-toggle__label"
}, Q = /* @__PURE__ */ L({
  __name: "NeumorphismThemeToggle",
  props: {
    modelValue: { default: "auto" },
    size: {},
    disableAuto: { type: Boolean, default: void 0 },
    disabled: { type: Boolean, default: !1 }
  },
  emits: ["update:modelValue", "change"],
  setup(s, { emit: f }) {
    const l = s, { config: g, resolveProp: v } = O(), m = t(
      () => {
        var e;
        return v(l.size, (e = g.value.themeToggle) == null ? void 0 : e.size, "medium");
      }
    ), a = t(
      () => typeof m.value == "number" ? $(m.value, c.primary.md) : void 0
    ), r = t(
      () => typeof m.value == "string" ? m.value : "medium"
    ), _ = t(
      () => a.value === void 0 ? void 0 : F(c, a.value)
    ), T = t(
      () => a.value === void 0 ? r.value !== "small" : a.value >= c.primary.md
    ), z = t(
      () => {
        var e;
        return v(l.disableAuto, (e = g.value.themeToggle) == null ? void 0 : e.disableAuto, !1);
      }
    ), h = f, { t: i } = M(), y = t(() => {
      const e = [
        { value: "light", label: i("themeToggleLight") },
        { value: "auto", label: i("themeToggleAuto") },
        { value: "dark", label: i("themeToggleDark") }
      ];
      return z.value ? e.filter((p) => p.value !== "auto") : e;
    }), d = H();
    E(
      () => l.modelValue,
      (e) => {
        e !== d.theme.value && d.setTheme(e);
      },
      { immediate: !0 }
    );
    const N = t(() => [
      "nm-theme-toggle",
      // 数字与档位类互斥：几何全由内联 `--nm-theme-toggle-sz-*` 决定
      a.value === void 0 ? `nm-theme-toggle--${r.value}` : "nm-theme-toggle--sized",
      {
        "nm-theme-toggle--disabled": l.disabled
      }
    ]);
    function S(e) {
      l.disabled || e !== l.modelValue && (d.setTheme(e), h("update:modelValue", e), h("change", e));
    }
    const k = t(() => r.value === "small" ? "sm" : "lg"), C = {
      light: "sun",
      auto: "monitor",
      dark: "moon"
    };
    function V(e) {
      return C[e] ?? "monitor";
    }
    return (e, p) => (n(), u("div", {
      class: b(N.value),
      style: x(_.value),
      role: "radiogroup",
      "aria-label": A(i)("themeToggleLabel")
    }, [
      (n(!0), u(B, null, I(y.value, (o) => (n(), u("button", {
        key: o.value,
        type: "button",
        class: b(["nm-theme-toggle__btn", {
          "nm-theme-toggle__btn--active": s.modelValue === o.value
        }]),
        "aria-pressed": s.modelValue === o.value,
        disabled: s.disabled,
        onClick: (R) => S(o.value)
      }, [
        w(P, {
          name: V(o.value),
          size: k.value,
          class: "nm-theme-toggle__icon"
        }, null, 8, ["name", "size"]),
        T.value ? (n(), u("span", K, D(o.label), 1)) : G("", !0)
      ], 10, J))), 128))
    ], 14, q));
  }
}), le = /* @__PURE__ */ j(Q, [["__scopeId", "data-v-6b108a0b"]]);
export {
  le as N
};

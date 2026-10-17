import { defineComponent as V, computed as o, watch as z, openBlock as m, createElementBlock as n, unref as C, normalizeClass as h, Fragment as y, renderList as A, createVNode as L, toDisplayString as x, createCommentVNode as B } from "vue";
import { useTheme as I } from "../composables/useTheme.js";
import { useLocale as S } from "../composables/useLocale.js";
import { u as D } from "./createComponent-jnXBYqCm.js";
import { N as E } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as $ } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismThemeToggle.css';const w = ["aria-label"], F = ["aria-pressed", "disabled", "onClick"], H = {
  key: 0,
  class: "nm-theme-toggle__label"
}, M = /* @__PURE__ */ V({
  __name: "NeumorphismThemeToggle",
  props: {
    modelValue: { default: "auto" },
    size: {},
    disableAuto: { type: Boolean, default: void 0 },
    disabled: { type: Boolean, default: !1 }
  },
  emits: ["update:modelValue", "change"],
  setup(a, { emit: b }) {
    const t = a, { config: r, resolveProp: c } = D(), i = o(
      () => {
        var e;
        return c(t.size, (e = r.value.themeToggle) == null ? void 0 : e.size, "medium");
      }
    ), f = o(
      () => {
        var e;
        return c(t.disableAuto, (e = r.value.themeToggle) == null ? void 0 : e.disableAuto, !1);
      }
    ), d = b, { t: s } = S(), p = o(() => {
      const e = [
        { value: "light", label: s("themeToggleLight") },
        { value: "auto", label: s("themeToggleAuto") },
        { value: "dark", label: s("themeToggleDark") }
      ];
      return f.value ? e.filter((g) => g.value !== "auto") : e;
    }), u = I();
    z(
      () => t.modelValue,
      (e) => {
        e !== u.theme.value && u.setTheme(e);
      },
      { immediate: !0 }
    );
    const v = o(() => [
      "nm-theme-toggle",
      `nm-theme-toggle--${i.value}`,
      {
        "nm-theme-toggle--disabled": t.disabled
      }
    ]);
    function _(e) {
      t.disabled || e !== t.modelValue && (u.setTheme(e), d("update:modelValue", e), d("change", e));
    }
    const T = o(() => i.value === "small" ? "sm" : "lg"), N = {
      light: "sun",
      auto: "monitor",
      dark: "moon"
    };
    function k(e) {
      return N[e] ?? "monitor";
    }
    return (e, g) => (m(), n("div", {
      class: h(v.value),
      role: "radiogroup",
      "aria-label": C(s)("themeToggleLabel")
    }, [
      (m(!0), n(y, null, A(p.value, (l) => (m(), n("button", {
        key: l.value,
        type: "button",
        class: h(["nm-theme-toggle__btn", {
          "nm-theme-toggle__btn--active": a.modelValue === l.value
        }]),
        "aria-pressed": a.modelValue === l.value,
        disabled: a.disabled,
        onClick: (O) => _(l.value)
      }, [
        L(E, {
          name: k(l.value),
          size: T.value,
          class: "nm-theme-toggle__icon"
        }, null, 8, ["name", "size"]),
        i.value !== "small" ? (m(), n("span", H, x(l.label), 1)) : B("", !0)
      ], 10, F))), 128))
    ], 10, w));
  }
}), Q = /* @__PURE__ */ $(M, [["__scopeId", "data-v-d7cc7e81"]]);
export {
  Q as N
};

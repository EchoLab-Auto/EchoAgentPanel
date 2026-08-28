import { defineComponent as x, computed as u, watch as T, openBlock as o, createElementBlock as s, unref as C, normalizeClass as v, Fragment as y, renderList as V, createElementVNode as r, createCommentVNode as m, toDisplayString as z } from "vue";
import { useTheme as B } from "../composables/useTheme.js";
import { useLocale as M } from "../composables/useLocale.js";
import { u as A } from "./createComponent-jnXBYqCm.js";
import { _ as N } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismThemeToggle.css';const L = ["aria-label"], D = ["aria-pressed", "disabled", "onClick"], S = {
  key: 0,
  class: "nm-theme-toggle__icon",
  viewBox: "0 0 24 24",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg"
}, E = {
  key: 1,
  class: "nm-theme-toggle__icon",
  viewBox: "0 0 24 24",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg"
}, $ = {
  key: 2,
  class: "nm-theme-toggle__icon",
  viewBox: "0 0 24 24",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg"
}, j = {
  key: 3,
  class: "nm-theme-toggle__label"
}, F = /* @__PURE__ */ x({
  __name: "NeumorphismThemeToggle",
  props: {
    modelValue: { default: "auto" },
    size: {},
    disableAuto: { type: Boolean, default: void 0 },
    disabled: { type: Boolean, default: !1 }
  },
  emits: ["update:modelValue", "change"],
  setup(a, { emit: f }) {
    const n = a, { config: c, resolveProp: g } = A(), p = u(
      () => {
        var e;
        return g(n.size, (e = c.value.themeToggle) == null ? void 0 : e.size, "medium");
      }
    ), k = u(
      () => {
        var e;
        return g(n.disableAuto, (e = c.value.themeToggle) == null ? void 0 : e.disableAuto, !1);
      }
    ), h = f, { t: i } = M(), b = u(() => {
      const e = [
        { value: "light", label: i("themeToggleLight") },
        { value: "auto", label: i("themeToggleAuto") },
        { value: "dark", label: i("themeToggleDark") }
      ];
      return k.value ? e.filter((t) => t.value !== "auto") : e;
    }), d = B();
    T(
      () => n.modelValue,
      (e) => {
        e !== d.theme.value && d.setTheme(e);
      },
      { immediate: !0 }
    );
    const w = u(() => [
      "nm-theme-toggle",
      `nm-theme-toggle--${p.value}`,
      {
        "nm-theme-toggle--disabled": n.disabled
      }
    ]);
    function _(e) {
      n.disabled || e !== n.modelValue && (d.setTheme(e), h("update:modelValue", e), h("change", e));
    }
    return (e, t) => (o(), s("div", {
      class: v(w.value),
      role: "radiogroup",
      "aria-label": C(i)("themeToggleLabel")
    }, [
      (o(!0), s(y, null, V(b.value, (l) => (o(), s("button", {
        key: l.value,
        type: "button",
        class: v(["nm-theme-toggle__btn", {
          "nm-theme-toggle__btn--active": a.modelValue === l.value
        }]),
        "aria-pressed": a.modelValue === l.value,
        disabled: a.disabled,
        onClick: (I) => _(l.value)
      }, [
        l.value === "light" ? (o(), s("svg", S, [...t[0] || (t[0] = [
          r("circle", {
            cx: "12",
            cy: "12",
            r: "4",
            fill: "currentColor"
          }, null, -1),
          r("path", {
            stroke: "currentColor",
            "stroke-width": "2",
            "stroke-linecap": "round",
            d: "M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41"
          }, null, -1)
        ])])) : m("", !0),
        l.value === "auto" ? (o(), s("svg", E, [...t[1] || (t[1] = [
          r("rect", {
            x: "2",
            y: "3",
            width: "20",
            height: "14",
            rx: "2",
            stroke: "currentColor",
            "stroke-width": "2"
          }, null, -1),
          r("path", {
            stroke: "currentColor",
            "stroke-width": "2",
            "stroke-linecap": "round",
            d: "M8 21h8m-4-4v4"
          }, null, -1),
          r("path", {
            stroke: "currentColor",
            "stroke-width": "2",
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M12 9v3l2 1.5"
          }, null, -1),
          r("circle", {
            cx: "12",
            cy: "12",
            r: "1",
            fill: "currentColor"
          }, null, -1)
        ])])) : m("", !0),
        l.value === "dark" ? (o(), s("svg", $, [...t[2] || (t[2] = [
          r("path", {
            fill: "currentColor",
            d: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
          }, null, -1)
        ])])) : m("", !0),
        a.size !== "small" ? (o(), s("span", j, z(l.label), 1)) : m("", !0)
      ], 10, D))), 128))
    ], 10, L));
  }
}), K = /* @__PURE__ */ N(F, [["__scopeId", "data-v-f9dedc69"]]);
export {
  K as N
};

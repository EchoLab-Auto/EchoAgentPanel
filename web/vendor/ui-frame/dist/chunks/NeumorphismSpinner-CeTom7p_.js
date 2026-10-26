import { defineComponent as f, computed as n, openBlock as v, createElementBlock as x, normalizeStyle as b, createElementVNode as r } from "vue";
import { useLocale as N } from "../composables/useLocale.js";
import { u as S } from "./createComponent-jnXBYqCm.js";
import { _ as h } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismSpinner.css';const z = ["aria-label"], t = 20, k = /* @__PURE__ */ f({
  __name: "NeumorphismSpinner",
  props: {
    size: { default: void 0 },
    label: { default: "" }
  },
  setup(a) {
    const o = a, { t: i } = N(), { config: l, resolveProp: c } = S(), p = {
      small: 14,
      medium: 20,
      large: 28
    }, m = n(
      () => {
        var e;
        return c(o.size, (e = l.value.spinner) == null ? void 0 : e.size, t);
      }
    ), u = n(() => o.label || i("spinnerLoading")), _ = n(() => {
      const e = m.value, s = typeof e == "number" ? e : p[e];
      return Number.isFinite(s) ? Math.max(8, s) : t;
    }), d = n(() => ({ "--nm-spinner-size": `${_.value}px` }));
    return (e, s) => (v(), x("span", {
      class: "nm-spinner",
      role: "status",
      "aria-label": u.value,
      style: b(d.value)
    }, [...s[0] || (s[0] = [
      r("svg", {
        class: "nm-spinner__svg",
        viewBox: "0 0 24 24",
        fill: "none",
        "aria-hidden": "true",
        focusable: "false"
      }, [
        r("circle", {
          class: "nm-spinner__track",
          cx: "12",
          cy: "12",
          r: "9",
          "stroke-width": "2.5"
        }),
        r("circle", {
          class: "nm-spinner__arc",
          cx: "12",
          cy: "12",
          r: "9",
          "stroke-width": "2.5",
          "stroke-linecap": "round"
        })
      ], -1)
    ])], 12, z));
  }
}), L = /* @__PURE__ */ h(k, [["__scopeId", "data-v-5492d1fc"]]);
export {
  L as N
};

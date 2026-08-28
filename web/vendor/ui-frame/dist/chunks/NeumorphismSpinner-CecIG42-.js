import { defineComponent as _, computed as e, openBlock as v, createElementBlock as f, normalizeStyle as b, createElementVNode as o } from "vue";
import { useLocale as x } from "../composables/useLocale.js";
import { u as z } from "./createComponent-jnXBYqCm.js";
import { _ as S } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismSpinner.css';const h = ["aria-label"], k = /* @__PURE__ */ _({
  __name: "NeumorphismSpinner",
  props: {
    size: { default: void 0 },
    label: { default: "" }
  },
  setup(l) {
    const r = l, { t } = x(), { config: i, resolveProp: c } = z(), s = e(
      () => {
        var n;
        return c(r.size, (n = i.value.spinner) == null ? void 0 : n.size, "medium");
      }
    ), p = e(() => r.label || t("spinnerLoading")), m = {
      small: 14,
      medium: 20,
      large: 28
    }, u = e(
      () => typeof s.value == "number" ? s.value : m[s.value]
    ), d = e(() => ({ "--nm-spinner-size": `${u.value}px` }));
    return (n, a) => (v(), f("span", {
      class: "nm-spinner",
      role: "status",
      "aria-label": p.value,
      style: b(d.value)
    }, [...a[0] || (a[0] = [
      o("svg", {
        class: "nm-spinner__svg",
        viewBox: "0 0 24 24",
        fill: "none",
        "aria-hidden": "true",
        focusable: "false"
      }, [
        o("circle", {
          class: "nm-spinner__track",
          cx: "12",
          cy: "12",
          r: "9",
          "stroke-width": "2.5"
        }),
        o("circle", {
          class: "nm-spinner__arc",
          cx: "12",
          cy: "12",
          r: "9",
          "stroke-width": "2.5",
          "stroke-linecap": "round"
        })
      ], -1)
    ])], 12, h));
  }
}), B = /* @__PURE__ */ S(k, [["__scopeId", "data-v-8cb9aa0b"]]);
export {
  B as N
};

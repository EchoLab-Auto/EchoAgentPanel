import { defineComponent as v, computed as o, openBlock as s, createElementBlock as i, normalizeClass as k, Fragment as _, renderList as b } from "vue";
import { u as I } from "./createComponent-jnXBYqCm.js";
import { ICON_SIZE_PX as r, defaultStrokeWidth as N, ICON_REGISTRY as u } from "../icons/index.js";
import { _ as g } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismIcon.css';const w = ["width", "height", "stroke-width", "aria-hidden", "role", "aria-label"], x = ["d"], B = /* @__PURE__ */ v({
  __name: "NeumorphismIcon",
  props: {
    name: {},
    size: { default: void 0 },
    strokeWidth: { default: void 0 },
    spin: { type: Boolean, default: !1 },
    pulse: { type: Boolean, default: !1 },
    label: { default: "" }
  },
  setup(t) {
    const e = t, { resolveProp: d } = I(), c = o(
      () => d(e.size, void 0, "sm")
    ), l = o(() => {
      const n = c.value;
      return typeof n == "number" ? n : r[n] ?? r.sm;
    }), m = o(() => e.strokeWidth ?? N(l.value)), a = o(
      () => u[e.name] ?? u.close
    ), p = o(() => [
      "nm-icon",
      `nm-icon--${e.name}`,
      {
        "nm-icon--spin": e.spin,
        "nm-icon--pulse": e.pulse,
        "nm-icon--filled": a.value.filled === !0
      }
    ]);
    return (n, C) => (s(), i("svg", {
      class: k(p.value),
      width: l.value,
      height: l.value,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": m.value,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": t.label ? void 0 : "true",
      role: t.label ? "img" : void 0,
      "aria-label": t.label || void 0,
      focusable: "false"
    }, [
      (s(!0), i(_, null, b(a.value.paths, (f, h) => (s(), i("path", {
        key: h,
        d: f
      }, null, 8, x))), 128))
    ], 10, w));
  }
}), E = /* @__PURE__ */ g(B, [["__scopeId", "data-v-ff1ea961"]]);
export {
  E as N
};

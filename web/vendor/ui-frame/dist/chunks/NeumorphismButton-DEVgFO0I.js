import { defineComponent as y, computed as o, openBlock as l, createElementBlock as r, normalizeClass as d, setBlockTracking as u, createElementVNode as c, createCommentVNode as h, renderSlot as B } from "vue";
import { useConfig as C } from "../composables/useConfig.js";
import { _ as w } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismButton.css';const x = ["type", "form", "disabled", "aria-label", "aria-busy", "aria-pressed", "aria-disabled"], z = {
  key: 0,
  class: "nm-button__spinner"
}, N = /* @__PURE__ */ y({
  __name: "NeumorphismButton",
  props: {
    variant: {},
    size: {},
    shape: {},
    disabled: { type: Boolean, default: !1 },
    loading: { type: Boolean, default: !1 },
    pressed: { type: Boolean },
    type: { default: "button" },
    form: {},
    ariaLabel: {}
  },
  emits: ["click"],
  setup(t, { emit: m }) {
    const a = t, i = C(), b = o(() => {
      var e;
      return a.variant ?? ((e = i.value.button) == null ? void 0 : e.variant) ?? "raised";
    }), v = o(() => {
      var e;
      return a.size ?? ((e = i.value.button) == null ? void 0 : e.size) ?? "medium";
    }), f = o(() => {
      var e;
      return a.shape ?? ((e = i.value.button) == null ? void 0 : e.shape) ?? "rounded";
    }), p = m, s = o(() => a.disabled || a.loading), g = o(() => [
      "nm-button",
      `nm-button--${b.value}`,
      `nm-button--${v.value}`,
      `nm-button--${f.value}`,
      {
        "nm-button--disabled": s.value,
        "nm-button--loading": a.loading
      }
    ]);
    function k(e) {
      s.value || p("click", e);
    }
    return (e, n) => (l(), r("button", {
      class: d(g.value),
      type: t.type,
      form: t.form,
      disabled: s.value,
      "aria-label": t.ariaLabel,
      "aria-busy": t.loading ? !0 : void 0,
      "aria-pressed": t.pressed !== void 0 ? t.pressed : void 0,
      "aria-disabled": s.value ? !0 : void 0,
      onClick: k
    }, [
      t.loading ? (l(), r("span", z, [
        n[0] || (u(-1, !0), (n[0] = (l(), r("svg", {
          class: "nm-button__spinner-svg",
          viewBox: "0 0 24 24",
          fill: "none",
          xmlns: "http://www.w3.org/2000/svg"
        }, [
          n[1] || (n[1] = c("circle", {
            cx: "12",
            cy: "12",
            r: "10",
            stroke: "currentColor",
            "stroke-width": "3",
            "stroke-linecap": "round",
            "stroke-dasharray": "31.42",
            "stroke-dashoffset": "10"
          }, null, -1))
        ]))).cacheIndex = 0, u(1), n[0])
      ])) : h("", !0),
      c("span", {
        class: d(["nm-button__content", { "nm-button__content--hidden": t.loading }])
      }, [
        B(e.$slots, "default", {}, void 0, !0)
      ], 2)
    ], 10, x));
  }
}), V = /* @__PURE__ */ w(N, [["__scopeId", "data-v-7f2c0fbc"]]);
export {
  V as N
};

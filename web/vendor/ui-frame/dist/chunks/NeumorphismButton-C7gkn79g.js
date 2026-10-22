import { defineComponent as C, computed as s, openBlock as r, createElementBlock as d, normalizeClass as c, setBlockTracking as m, createElementVNode as v, createCommentVNode as N, renderSlot as S } from "vue";
import { useConfig as w } from "../composables/useConfig.js";
import { n as x, g as z } from "./glass-BqY-XLAc.js";
import { _ as L } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismButton.css';const V = ["type", "form", "disabled", "aria-label", "aria-busy", "aria-pressed", "aria-disabled"], A = {
  key: 0,
  class: "nm-button__spinner"
}, G = /* @__PURE__ */ C({
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
    ariaLabel: {},
    glass: { type: [Boolean, String], default: void 0 }
  },
  emits: ["click"],
  setup(a, { emit: b }) {
    const u = {
      glass: "float",
      "glass-raised": "raised"
    }, t = a, n = w(), i = s(
      () => {
        var e;
        return t.variant ?? ((e = n.value.button) == null ? void 0 : e.variant) ?? "raised";
      }
    ), f = s(
      () => {
        var e;
        return x(
          t.glass ?? ((e = n.value.button) == null ? void 0 : e.glass) ?? u[i.value]
        );
      }
    ), p = s(
      () => u[i.value] ? "raised" : i.value
    ), g = s(() => {
      var e;
      return t.size ?? ((e = n.value.button) == null ? void 0 : e.size) ?? "medium";
    }), k = s(() => {
      var e;
      return t.shape ?? ((e = n.value.button) == null ? void 0 : e.shape) ?? "rounded";
    }), y = b, l = s(() => t.disabled || t.loading), h = s(() => [
      "nm-button",
      `nm-button--${p.value}`,
      `nm-button--${g.value}`,
      `nm-button--${k.value}`,
      ...z("nm-button", f.value),
      {
        "nm-button--disabled": l.value,
        "nm-button--loading": t.loading
      }
    ]);
    function B(e) {
      l.value || y("click", e);
    }
    return (e, o) => (r(), d("button", {
      class: c(h.value),
      type: a.type,
      form: a.form,
      disabled: l.value,
      "aria-label": a.ariaLabel,
      "aria-busy": a.loading ? !0 : void 0,
      "aria-pressed": a.pressed !== void 0 ? a.pressed : void 0,
      "aria-disabled": l.value ? !0 : void 0,
      onClick: B
    }, [
      a.loading ? (r(), d("span", A, [
        o[0] || (m(-1, !0), (o[0] = (r(), d("svg", {
          class: "nm-button__spinner-svg",
          viewBox: "0 0 24 24",
          fill: "none",
          xmlns: "http://www.w3.org/2000/svg"
        }, [
          o[1] || (o[1] = v("circle", {
            cx: "12",
            cy: "12",
            r: "10",
            stroke: "currentColor",
            "stroke-width": "2.5",
            "stroke-linecap": "round",
            "stroke-dasharray": "31.42",
            "stroke-dashoffset": "10"
          }, null, -1))
        ]))).cacheIndex = 0, m(1), o[0])
      ])) : N("", !0),
      v("span", {
        class: c(["nm-button__content", { "nm-button__content--hidden": a.loading }])
      }, [
        S(e.$slots, "default", {}, void 0, !0)
      ], 2)
    ], 10, V));
  }
}), T = /* @__PURE__ */ L(G, [["__scopeId", "data-v-22ae5ccc"]]);
export {
  T as N
};

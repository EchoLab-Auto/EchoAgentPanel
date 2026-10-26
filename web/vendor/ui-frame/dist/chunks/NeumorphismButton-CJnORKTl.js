import { defineComponent as C, computed as s, openBlock as d, createElementBlock as u, normalizeStyle as N, normalizeClass as c, setBlockTracking as v, createElementVNode as b, createCommentVNode as w, renderSlot as _ } from "vue";
import { useConfig as x } from "../composables/useConfig.js";
import { n as E, g as L } from "./glass-BqY-XLAc.js";
import { n as T, r as A, b as I } from "./controlScales-CPj0Htdh.js";
import { _ as V } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismButton.css';const $ = ["type", "form", "disabled", "aria-label", "aria-busy", "aria-pressed", "aria-disabled"], G = {
  key: 0,
  class: "nm-button__spinner"
}, D = 44, F = /* @__PURE__ */ C({
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
  setup(a, { emit: f }) {
    const m = {
      glass: "float",
      "glass-raised": "raised",
      "glass-pressed": "pressed"
    }, o = a, n = x(), i = s(
      () => {
        var e;
        return o.variant ?? ((e = n.value.button) == null ? void 0 : e.variant) ?? "raised";
      }
    ), p = s(
      () => E(m[i.value])
    ), g = s(
      () => m[i.value] ? "raised" : i.value
    ), r = s(() => {
      var t;
      const e = o.size ?? ((t = n.value.button) == null ? void 0 : t.size);
      return typeof e == "number" ? T(e, D) : void 0;
    }), y = s(() => {
      var t;
      const e = o.size ?? ((t = n.value.button) == null ? void 0 : t.size);
      return typeof e == "string" ? e : "medium";
    }), k = s(
      () => r.value === void 0 ? void 0 : A(I, r.value)
    ), z = s(() => {
      var e;
      return o.shape ?? ((e = n.value.button) == null ? void 0 : e.shape) ?? "rounded";
    }), S = f, l = s(() => o.disabled || o.loading), h = s(() => [
      "nm-button",
      `nm-button--${g.value}`,
      r.value === void 0 ? `nm-button--${y.value}` : "nm-button--sized",
      `nm-button--${z.value}`,
      ...L("nm-button", p.value),
      {
        "nm-button--disabled": l.value,
        "nm-button--loading": o.loading
      }
    ]);
    function B(e) {
      l.value || S("click", e);
    }
    return (e, t) => (d(), u("button", {
      class: c(h.value),
      style: N(k.value),
      type: a.type,
      form: a.form,
      disabled: l.value,
      "aria-label": a.ariaLabel,
      "aria-busy": a.loading ? !0 : void 0,
      "aria-pressed": a.pressed !== void 0 ? a.pressed : void 0,
      "aria-disabled": l.value ? !0 : void 0,
      onClick: B
    }, [
      a.loading ? (d(), u("span", G, [
        t[0] || (v(-1, !0), (t[0] = (d(), u("svg", {
          class: "nm-button__spinner-svg",
          viewBox: "0 0 24 24",
          fill: "none",
          xmlns: "http://www.w3.org/2000/svg"
        }, [
          t[1] || (t[1] = b("circle", {
            cx: "12",
            cy: "12",
            r: "10",
            stroke: "currentColor",
            "stroke-width": "2.5",
            "stroke-linecap": "round",
            "stroke-dasharray": "31.42",
            "stroke-dashoffset": "10"
          }, null, -1))
        ]))).cacheIndex = 0, v(1), t[0])
      ])) : w("", !0),
      b("span", {
        class: c(["nm-button__content", { "nm-button__content--hidden": a.loading }])
      }, [
        _(e.$slots, "default", {}, void 0, !0)
      ], 2)
    ], 14, $));
  }
}), Z = /* @__PURE__ */ V(F, [["__scopeId", "data-v-4e496054"]]);
export {
  Z as N
};

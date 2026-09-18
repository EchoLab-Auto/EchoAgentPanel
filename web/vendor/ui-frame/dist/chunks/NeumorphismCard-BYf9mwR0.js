import { defineComponent as f, computed as r, openBlock as s, createElementBlock as t, normalizeClass as _, renderSlot as l, createCommentVNode as i, createElementVNode as h } from "vue";
import { u as b } from "./createComponent-jnXBYqCm.js";
import { _ as g } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismCard.css';const y = {
  key: 0,
  class: "nm-card__header"
}, N = { class: "nm-card__body" }, $ = {
  key: 1,
  class: "nm-card__footer"
}, k = /* @__PURE__ */ f({
  __name: "NeumorphismCard",
  props: {
    elevation: {},
    variant: {},
    depth: {},
    radius: {},
    noPadding: { type: Boolean, default: !1 },
    hoverable: { type: [Boolean, String], default: void 0 },
    glass: { type: Boolean, default: !1 },
    flexible: { type: Boolean, default: !1 }
  },
  setup(u) {
    const c = {
      shallow: 1,
      medium: 2,
      deep: 3,
      "very-deep": 4
    }, a = u, { config: d, resolveProp: n } = b(), m = r(() => {
      var e;
      return n(a.radius, (e = d.value.card) == null ? void 0 : e.radius, "large");
    }), o = r(
      () => {
        var e;
        return n(a.hoverable, (e = d.value.card) == null ? void 0 : e.hoverable, !1);
      }
    ), v = r(() => {
      if (a.elevation !== void 0) return a.elevation;
      const e = c[a.depth ?? "medium"];
      return a.variant === "pressed" ? -e : e;
    }), p = r(() => [
      "nm-card",
      `nm-card--elevation-${v.value}`,
      `nm-card--radius-${m.value}`,
      {
        "nm-card--glass": a.glass,
        "nm-card--flexible": a.flexible,
        "nm-card--no-padding": a.noPadding,
        "nm-card--hoverable": !!o.value,
        "nm-card--hover-bulge": o.value === !0 || o.value === "bulge",
        "nm-card--hover-sink": o.value === "sink"
      }
    ]);
    return (e, B) => (s(), t("div", {
      class: _(p.value)
    }, [
      e.$slots.header ? (s(), t("div", y, [
        l(e.$slots, "header", {}, void 0, !0)
      ])) : i("", !0),
      h("div", N, [
        l(e.$slots, "default", {}, void 0, !0)
      ]),
      e.$slots.footer ? (s(), t("div", $, [
        l(e.$slots, "footer", {}, void 0, !0)
      ])) : i("", !0)
    ], 2));
  }
}), S = /* @__PURE__ */ g(k, [["__scopeId", "data-v-ae37bb8f"]]);
export {
  S as N
};

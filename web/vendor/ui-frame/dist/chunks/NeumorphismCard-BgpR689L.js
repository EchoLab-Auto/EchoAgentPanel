import { defineComponent as f, computed as o, openBlock as d, createElementBlock as l, normalizeClass as h, renderSlot as n, createCommentVNode as i, createElementVNode as g } from "vue";
import { u as b } from "./createComponent-jnXBYqCm.js";
import { n as N, g as y } from "./glass-BqY-XLAc.js";
import { _ as $ } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismCard.css';const k = {
  key: 0,
  class: "nm-card__header"
}, C = { class: "nm-card__body" }, B = {
  key: 1,
  class: "nm-card__footer"
}, E = /* @__PURE__ */ f({
  __name: "NeumorphismCard",
  props: {
    elevation: {},
    variant: {},
    depth: {},
    radius: {},
    noPadding: { type: Boolean, default: !1 },
    hoverable: { type: [Boolean, String], default: void 0 },
    glass: { type: [Boolean, String], default: void 0 }
  },
  setup(m) {
    const u = {
      shallow: 1,
      medium: 2,
      deep: 3,
      "very-deep": 4
    }, a = m, { config: r, resolveProp: t } = b(), c = o(() => {
      var e;
      return t(a.radius, (e = r.value.card) == null ? void 0 : e.radius, "large");
    }), v = o(
      () => {
        var e;
        return N(t(a.glass, (e = r.value.card) == null ? void 0 : e.glass, void 0));
      }
    ), s = o(
      () => {
        var e;
        return t(a.hoverable, (e = r.value.card) == null ? void 0 : e.hoverable, !1);
      }
    ), p = o(() => {
      if (a.elevation !== void 0) return a.elevation;
      const e = u[a.depth ?? "medium"];
      return a.variant === "pressed" ? -e : e;
    }), _ = o(() => [
      "nm-card",
      `nm-card--elevation-${p.value}`,
      `nm-card--radius-${c.value}`,
      {
        ...Object.fromEntries(y("nm-card", v.value).map((e) => [e, !0])),
        "nm-card--no-padding": a.noPadding,
        "nm-card--hoverable": !!s.value,
        "nm-card--hover-bulge": s.value === !0 || s.value === "bulge",
        "nm-card--hover-sink": s.value === "sink"
      }
    ]);
    return (e, P) => (d(), l("div", {
      class: h(_.value)
    }, [
      e.$slots.header ? (d(), l("div", k, [
        n(e.$slots, "header", {}, void 0, !0)
      ])) : i("", !0),
      g("div", C, [
        n(e.$slots, "default", {}, void 0, !0)
      ]),
      e.$slots.footer ? (d(), l("div", B, [
        n(e.$slots, "footer", {}, void 0, !0)
      ])) : i("", !0)
    ], 2));
  }
}), D = /* @__PURE__ */ $(E, [["__scopeId", "data-v-ad14aa49"]]);
export {
  D as N
};

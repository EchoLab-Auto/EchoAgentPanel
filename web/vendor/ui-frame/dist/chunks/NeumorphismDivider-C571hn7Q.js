import { defineComponent as m, computed as o, openBlock as a, createElementBlock as d, normalizeClass as p, renderSlot as _, createCommentVNode as f } from "vue";
import { u as h } from "./createComponent-jnXBYqCm.js";
import { _ as g } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismDivider.css';const N = ["aria-orientation"], B = {
  key: 0,
  class: "nm-divider__text"
}, D = /* @__PURE__ */ m({
  __name: "NeumorphismDivider",
  props: {
    direction: {},
    align: {},
    dashed: { type: Boolean, default: void 0 },
    inset: { type: Boolean, default: void 0 }
  },
  setup(n) {
    const i = n, { config: t, resolveProp: s } = h(), r = o(
      () => {
        var e;
        return s(i.direction, (e = t.value.divider) == null ? void 0 : e.direction, "horizontal");
      }
    ), l = o(
      () => {
        var e;
        return s(i.align, (e = t.value.divider) == null ? void 0 : e.align, "center");
      }
    ), v = o(
      () => {
        var e;
        return s(i.dashed, (e = t.value.divider) == null ? void 0 : e.dashed, !1);
      }
    ), c = o(() => {
      var e;
      return s(i.inset, (e = t.value.divider) == null ? void 0 : e.inset, !1);
    }), u = o(() => [
      "nm-divider",
      `nm-divider--${r.value}`,
      ...r.value === "horizontal" ? [`nm-divider--${l.value}`] : [],
      {
        "nm-divider--dashed": v.value,
        "nm-divider--inset": c.value
      }
    ]);
    return (e, $) => (a(), d("div", {
      class: p(u.value),
      role: "separator",
      "aria-orientation": r.value
    }, [
      e.$slots.default ? (a(), d("span", B, [
        _(e.$slots, "default", {}, void 0, !0)
      ])) : f("", !0)
    ], 10, N));
  }
}), C = /* @__PURE__ */ g(D, [["__scopeId", "data-v-50126a6e"]]);
export {
  C as N
};

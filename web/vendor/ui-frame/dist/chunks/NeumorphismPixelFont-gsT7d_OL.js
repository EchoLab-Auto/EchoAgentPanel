import { defineComponent as i, computed as t, openBlock as a, createElementBlock as o, normalizeStyle as s, normalizeClass as c, createElementVNode as m, createTextVNode as d, toDisplayString as u, createCommentVNode as f } from "vue";
import { _ as x } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismPixelFont.css';const p = ["role", "aria-label"], _ = { class: "nm-pixel-font__text" }, h = {
  key: 0,
  class: "nm-pixel-font__cursor",
  "aria-hidden": "true"
}, b = /* @__PURE__ */ i({
  __name: "NeumorphismPixelFont",
  props: {
    text: {},
    scale: { default: 3 },
    cursor: { type: Boolean, default: !1 },
    align: { default: "left" },
    ariaLabel: {}
  },
  setup(e) {
    const l = e, n = t(() => Math.max(1, Math.round(l.scale))), r = t(() => ({
      "--nm-pixel-font-scale": String(n.value)
    }));
    return (v, y) => (a(), o("div", {
      class: c(["nm-pixel-font", `nm-pixel-font--${e.align}`]),
      style: s(r.value),
      role: e.ariaLabel ? "img" : void 0,
      "aria-label": e.ariaLabel || void 0
    }, [
      m("span", _, [
        d(u(e.text), 1),
        e.cursor ? (a(), o("span", h)) : f("", !0)
      ])
    ], 14, p));
  }
}), S = /* @__PURE__ */ x(b, [["__scopeId", "data-v-eebd7719"]]);
export {
  S as N
};

import { defineComponent as d, ref as m, computed as t, openBlock as r, createElementBlock as o, normalizeStyle as p, createElementVNode as f, renderSlot as u, createCommentVNode as _ } from "vue";
import { useArtRenderer as h } from "../composables/useArtRenderer.js";
import { useLocale as v } from "../composables/useLocale.js";
import { _ as y } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismAsciiArt.css';const b = ["aria-label"], g = {
  key: 0,
  class: "nm-ascii-art__overlay"
}, A = /* @__PURE__ */ d({
  __name: "NeumorphismAsciiArt",
  props: {
    src: {},
    density: { default: 1 },
    height: { default: 240 },
    reactive: { type: Boolean, default: !1 },
    speed: { default: 1 },
    palette: {},
    ariaLabel: {}
  },
  setup(i) {
    const e = i, { t: l } = v(), a = m(null);
    h({
      canvas: a,
      effect: t(() => "ascii"),
      reactive: t(() => e.reactive),
      speed: t(() => e.speed),
      density: t(() => e.density),
      palette: t(() => e.palette),
      seed: t(() => {
      }),
      src: t(() => e.src)
    });
    const c = t(() => e.ariaLabel || l("asciiArtLabel")), n = t(
      () => typeof e.height == "number" ? `${e.height}px` : e.height
    );
    return (s, L) => (r(), o("div", {
      class: "nm-ascii-art",
      style: p({ height: n.value })
    }, [
      f("canvas", {
        ref_key: "canvasRef",
        ref: a,
        class: "nm-ascii-art__canvas",
        role: "img",
        "aria-label": c.value
      }, null, 8, b),
      s.$slots.default ? (r(), o("div", g, [
        u(s.$slots, "default", {}, void 0, !0)
      ])) : _("", !0)
    ], 4));
  }
}), S = /* @__PURE__ */ y(A, [["__scopeId", "data-v-31da1d05"]]);
export {
  S as N
};

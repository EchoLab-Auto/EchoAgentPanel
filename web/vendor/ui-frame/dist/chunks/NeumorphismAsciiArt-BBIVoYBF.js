import { defineComponent as h, ref as n, watch as v, computed as a, openBlock as l, createElementBlock as d, normalizeStyle as _, createElementVNode as g, renderSlot as b, createCommentVNode as y } from "vue";
import { useArtRenderer as A } from "../composables/useArtRenderer.js";
import { useLocale as w } from "../composables/useLocale.js";
import { _ as R } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismAsciiArt.css';const x = ["aria-label"], L = {
  key: 0,
  class: "nm-ascii-art__overlay"
}, N = /* @__PURE__ */ h({
  __name: "NeumorphismAsciiArt",
  props: {
    src: {},
    density: { default: 1 },
    width: {},
    height: {},
    reactive: { type: Boolean, default: !1 },
    speed: { default: 1 },
    palette: {},
    radius: { default: "large" },
    ariaLabel: {}
  },
  setup(c) {
    const e = c, m = {
      none: "0",
      small: "var(--nm-border-radius-sm)",
      medium: "var(--nm-border-radius-md)",
      large: "var(--nm-border-radius-lg)",
      xl: "var(--nm-border-radius-xl)"
    }, i = n(0);
    v(
      () => e.src,
      (t) => {
        if (i.value = 0, !t || typeof Image > "u") return;
        const r = new Image();
        r.onload = () => {
          r.height && (i.value = r.width / r.height);
        }, r.src = t;
      },
      { immediate: !0 }
    );
    const { t: u } = w(), s = n(null);
    A({
      canvas: s,
      effect: a(() => "ascii"),
      reactive: a(() => e.reactive),
      speed: a(() => e.speed),
      density: a(() => e.density),
      palette: a(() => e.palette),
      seed: a(() => {
      }),
      src: a(() => e.src)
    });
    const f = a(() => e.ariaLabel || u("asciiArtLabel"));
    function o(t) {
      return typeof t == "number" ? `${t}px` : t;
    }
    const p = a(() => ({
      borderRadius: m[e.radius],
      width: e.width !== void 0 ? o(e.width) : "100%",
      ...e.height !== void 0 ? { height: o(e.height) } : i.value ? { aspectRatio: String(i.value) } : { height: "240px" }
    }));
    return (t, r) => (l(), d("div", {
      class: "nm-ascii-art",
      style: _(p.value)
    }, [
      g("canvas", {
        ref_key: "canvasRef",
        ref: s,
        class: "nm-ascii-art__canvas",
        role: "img",
        "aria-label": f.value
      }, null, 8, x),
      t.$slots.default ? (l(), d("div", L, [
        b(t.$slots, "default", {}, void 0, !0)
      ])) : y("", !0)
    ], 4));
  }
}), C = /* @__PURE__ */ R(N, [["__scopeId", "data-v-b0f6e7fd"]]);
export {
  C as N
};

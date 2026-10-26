import { defineComponent as v, computed as t, ref as n, watch as A, openBlock as c, createElementBlock as d, normalizeStyle as y, createElementVNode as g, renderSlot as b, createCommentVNode as x } from "vue";
import { D as L, a as D, b as M, u as k } from "./useArtRenderer-CTcyDtd9.js";
import { useLocale as w } from "../composables/useLocale.js";
import { _ as N } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismAsciiArt.css';const R = ["aria-label"], C = {
  key: 0,
  class: "nm-ascii-art__overlay"
}, l = 24, E = /* @__PURE__ */ v({
  __name: "NeumorphismAsciiArt",
  props: {
    src: {},
    mask: { default: "ascii" },
    dotMin: { default: M },
    dotMax: { default: D },
    occupancy: { default: L },
    density: { default: 1 },
    width: {},
    height: {},
    reactive: { type: Boolean, default: !1 },
    speed: { default: 1 },
    palette: {},
    radius: { default: void 0 },
    ariaLabel: {}
  },
  setup(u) {
    const e = u, m = {
      none: 0,
      small: 8,
      medium: 16,
      large: 24,
      xl: 32
    }, p = t(() => {
      const a = e.radius ?? l, s = typeof a == "number" ? a : m[a];
      return Number.isFinite(s) ? Math.max(0, s) : l;
    }), i = n(0);
    A(
      () => e.src,
      (a) => {
        if (i.value = 0, !a || typeof Image > "u") return;
        const s = new Image();
        s.onload = () => {
          s.height && (i.value = s.width / s.height);
        }, s.src = a;
      },
      { immediate: !0 }
    );
    const { t: f } = w(), o = n(null);
    k({
      canvas: o,
      effect: t(() => "ascii"),
      reactive: t(() => e.reactive),
      speed: t(() => e.speed),
      density: t(() => e.density),
      palette: t(() => e.palette),
      seed: t(() => {
      }),
      src: t(() => e.src),
      mask: t(() => e.mask),
      dotMin: t(() => e.dotMin),
      dotMax: t(() => e.dotMax),
      occupancy: t(() => e.occupancy),
      // 呼吸流光为低频缓动：30fps 上限于观感无差别，空闲常驻开销减半
      // （指针交互中不节流；滚动期间降到 20fps 继续走，视口外才完全停摆）
      idleFps: 30
    });
    const h = t(
      () => e.ariaLabel || f(e.mask === "dots" ? "dotArtLabel" : "asciiArtLabel")
    );
    function r(a) {
      return typeof a == "number" ? `${a}px` : a;
    }
    const _ = t(() => ({
      borderRadius: `${p.value}px`,
      width: e.width !== void 0 ? r(e.width) : "100%",
      ...e.height !== void 0 ? { height: r(e.height) } : i.value ? { aspectRatio: String(i.value) } : { height: "240px" }
    }));
    return (a, s) => (c(), d("div", {
      class: "nm-ascii-art",
      style: y(_.value)
    }, [
      g("canvas", {
        ref_key: "canvasRef",
        ref: o,
        class: "nm-ascii-art__canvas",
        role: "img",
        "aria-label": h.value
      }, null, 8, R),
      a.$slots.default ? (c(), d("div", C, [
        b(a.$slots, "default", {}, void 0, !0)
      ])) : x("", !0)
    ], 4));
  }
}), T = /* @__PURE__ */ N(E, [["__scopeId", "data-v-abe36d43"]]);
export {
  T as N
};

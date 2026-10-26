import { defineComponent as g, computed as a, ref as y, watch as b, openBlock as l, createElementBlock as n, normalizeStyle as N, createElementVNode as R, normalizeClass as L, renderSlot as k, createCommentVNode as A } from "vue";
import { u as S } from "./createComponent-jnXBYqCm.js";
import { u as x } from "./useArtRenderer-CTcyDtd9.js";
import { useLocale as B } from "../composables/useLocale.js";
import { _ as C } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismArt.css';const E = ["aria-label"], $ = {
  key: 0,
  class: "nm-art__overlay"
}, z = /* @__PURE__ */ g({
  __name: "NeumorphismArt",
  props: {
    effect: {},
    reactive: { type: Boolean },
    speed: { default: 1 },
    density: { default: 1 },
    palette: {},
    seed: {},
    src: {},
    height: { default: 240 },
    ariaLabel: {}
  },
  emits: ["effect-change"],
  setup(i, { emit: f }) {
    const e = i, m = f, { config: o, resolveProp: r } = S(), { t: d } = B(), s = a(
      () => {
        var t;
        return r(e.effect, (t = o.value.art) == null ? void 0 : t.effect, "pixel-field");
      }
    ), p = a(
      () => {
        var t;
        return r(e.reactive, (t = o.value.art) == null ? void 0 : t.reactive, !1);
      }
    ), u = a(() => e.ariaLabel || d("artLabel")), c = y(null), v = a(() => e.palette), h = a(() => e.seed);
    x({
      canvas: c,
      effect: s,
      reactive: p,
      speed: a(() => e.speed),
      density: a(() => e.density),
      palette: v,
      seed: h,
      src: a(() => e.src)
    }), b(s, (t) => m("effect-change", t));
    const _ = a(
      () => typeof e.height == "number" ? `${e.height}px` : e.height
    );
    return (t, V) => (l(), n("div", {
      class: "nm-art",
      style: N({ height: _.value })
    }, [
      R("canvas", {
        ref_key: "canvasRef",
        ref: c,
        class: L(["nm-art__canvas", { "nm-art__canvas--goo": s.value === "goo" }]),
        role: "img",
        "aria-label": u.value
      }, null, 10, E),
      t.$slots.default ? (l(), n("div", $, [
        k(t.$slots, "default", {}, void 0, !0)
      ])) : A("", !0)
    ], 4));
  }
}), D = /* @__PURE__ */ C(z, [["__scopeId", "data-v-4ca82db1"]]);
export {
  D as N
};

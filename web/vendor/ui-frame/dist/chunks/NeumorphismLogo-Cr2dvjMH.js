import { defineComponent as D, computed as n, ref as u, watch as V, openBlock as d, createElementBlock as m, unref as i, normalizeStyle as W, normalizeClass as H, createElementVNode as t, renderSlot as T, createCommentVNode as X } from "vue";
import { u as Y } from "./createComponent-jnXBYqCm.js";
import j from "../composables/usePixelLogoAnimation.js";
import { generateId as q } from "../utils/index.js";
import { _ as J } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismLogo.css';const K = ["aria-label"], O = { class: "nm-logo__stage" }, Q = { class: "nm-logo__wrap" }, U = ["id"], Z = ["filter"], oo = {
  key: 0,
  class: "nm-logo__panel"
}, eo = /* @__PURE__ */ D({
  __name: "NeumorphismLogo",
  props: {
    mode: {},
    size: {},
    width: {},
    goo: { type: Boolean, default: void 0 },
    autoplay: { type: Boolean, default: void 0 },
    floating: { type: Boolean, default: void 0 },
    ariaLabel: { default: "动态像素 Logo" }
  },
  emits: ["update:mode", "mode-change"],
  setup(f, { emit: R }) {
    const l = f, p = R, { config: s, resolveProp: r } = Y(), v = n(
      () => {
        var o;
        return r(l.mode, (o = s.value.logo) == null ? void 0 : o.mode, "pulse");
      }
    ), L = { small: 120, medium: 220, large: 360 }, M = n(() => {
      var G;
      const o = typeof l.size == "number" ? void 0 : l.size, e = (G = s.value.logo) == null ? void 0 : G.size;
      return r(o, typeof e == "number" ? void 0 : e, "medium");
    }), g = n(
      () => typeof l.size == "number" ? void 0 : `nm-logo--${M.value}`
    ), S = n(() => {
      const o = l.width ?? l.size;
      if (o !== void 0 && typeof o != "string")
        return typeof o == "number" ? Number.isFinite(o) && o > 0 ? o : void 0 : L[o];
    }), B = n(() => {
      var o;
      return r(l.goo, (o = s.value.logo) == null ? void 0 : o.goo, !0);
    }), C = n(
      () => {
        var o;
        return r(l.autoplay, (o = s.value.logo) == null ? void 0 : o.autoplay, !0);
      }
    ), N = n(
      () => {
        var o;
        return r(l.floating, (o = s.value.logo) == null ? void 0 : o.floating, !0);
      }
    ), c = u(null), y = u(null), _ = u(null), h = u(null), {
      mode: P,
      isReducedMotion: w,
      setMode: x,
      replay: $,
      handlePointerMove: b,
      handlePointerLeave: z
    } = j({
      linksGroupRef: y,
      pixelsGroupRef: _,
      sparksGroupRef: h,
      svgRef: c,
      mode: v.value,
      autoplay: C.value
    }), k = q("nm-logo-goo"), A = n(() => B.value ? `url(#${k})` : void 0);
    V(v, (o) => {
      x(o);
    });
    function F(o) {
      x(o), p("update:mode", o), p("mode-change", o);
    }
    const I = n(() => {
      const o = S.value;
      if (o !== void 0) return `${o}px`;
      const e = l.width;
      if (e !== void 0)
        return typeof e == "number" ? `${e}px` : e;
    }), E = n(() => [
      "nm-logo",
      ...g.value ? [g.value] : [],
      { "nm-logo--reduced-motion": w.value },
      { "nm-logo--no-float": !N.value }
    ]);
    return (o, e) => (d(), m("div", {
      class: H(E.value),
      style: W({ width: I.value }),
      role: "img",
      "aria-label": f.ariaLabel,
      onPointermove: e[0] || (e[0] = //@ts-ignore
      (...a) => i(b) && i(b)(...a)),
      onPointerleave: e[1] || (e[1] = //@ts-ignore
      (...a) => i(z) && i(z)(...a))
    }, [
      t("div", O, [
        e[4] || (e[4] = t("div", {
          class: "nm-logo__halo",
          "aria-hidden": "true"
        }, null, -1)),
        t("div", Q, [
          (d(), m("svg", {
            ref_key: "svgRef",
            ref: c,
            class: "nm-logo__svg",
            viewBox: "0 0 512 512",
            xmlns: "http://www.w3.org/2000/svg"
          }, [
            t("defs", null, [
              t("filter", {
                id: i(k),
                x: "-20%",
                y: "-20%",
                width: "140%",
                height: "140%"
              }, [...e[2] || (e[2] = [
                t("feGaussianBlur", {
                  in: "SourceGraphic",
                  stdDeviation: "3.2",
                  result: "b"
                }, null, -1),
                t("feColorMatrix", {
                  in: "b",
                  values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -9.5"
                }, null, -1)
              ])], 8, U)
            ]),
            e[3] || (e[3] = t("rect", {
              x: "0",
              y: "0",
              width: "512",
              height: "512",
              rx: "96",
              fill: "#000"
            }, null, -1)),
            t("g", { filter: A.value }, [
              t("g", {
                ref_key: "linksGroupRef",
                ref: y
              }, null, 512),
              t("g", {
                ref_key: "pixelsGroupRef",
                ref: _
              }, null, 512),
              t("g", {
                ref_key: "sparksGroupRef",
                ref: h
              }, null, 512)
            ], 8, Z)
          ], 512))
        ])
      ]),
      o.$slots.default ? (d(), m("div", oo, [
        T(o.$slots, "default", {
          mode: i(P),
          setMode: F,
          replay: i($),
          isReducedMotion: i(w)
        }, void 0, !0)
      ])) : X("", !0)
    ], 46, K));
  }
}), ro = /* @__PURE__ */ J(eo, [["__scopeId", "data-v-d5c03f81"]]);
export {
  ro as N
};

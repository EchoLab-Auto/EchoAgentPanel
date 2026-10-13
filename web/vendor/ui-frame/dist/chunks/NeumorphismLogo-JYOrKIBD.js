import { defineComponent as A, computed as t, ref as a, watch as F, openBlock as u, createElementBlock as m, unref as n, normalizeStyle as I, normalizeClass as E, createElementVNode as e, renderSlot as V, createCommentVNode as D } from "vue";
import { u as j } from "./createComponent-jnXBYqCm.js";
import q from "../composables/usePixelLogoAnimation.js";
import { generateId as H } from "../utils/index.js";
import { _ as J } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismLogo.css';const K = ["aria-label"], O = { class: "nm-logo__stage" }, Q = { class: "nm-logo__wrap" }, T = ["id"], U = ["filter"], W = {
  key: 0,
  class: "nm-logo__panel"
}, X = /* @__PURE__ */ A({
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
  setup(f, { emit: G }) {
    const s = f, p = G, { config: i, resolveProp: r } = j(), g = t(
      () => {
        var o;
        return r(s.mode, (o = i.value.logo) == null ? void 0 : o.mode, "pulse");
      }
    ), M = t(
      () => {
        var o;
        return r(s.size, (o = i.value.logo) == null ? void 0 : o.size, "medium");
      }
    ), b = t(() => {
      var o;
      return r(s.goo, (o = i.value.logo) == null ? void 0 : o.goo, !0);
    }), L = t(
      () => {
        var o;
        return r(s.autoplay, (o = i.value.logo) == null ? void 0 : o.autoplay, !0);
      }
    ), B = t(
      () => {
        var o;
        return r(s.floating, (o = i.value.logo) == null ? void 0 : o.floating, !0);
      }
    ), v = a(null), c = a(null), _ = a(null), y = a(null), {
      mode: S,
      isReducedMotion: h,
      setMode: w,
      replay: z,
      handlePointerMove: k,
      handlePointerLeave: x
    } = q({
      linksGroupRef: c,
      pixelsGroupRef: _,
      sparksGroupRef: y,
      svgRef: v,
      mode: g.value,
      autoplay: L.value
    }), R = H("nm-logo-goo"), N = t(() => b.value ? `url(#${R})` : void 0);
    F(g, (o) => {
      w(o);
    });
    function P(o) {
      w(o), p("update:mode", o), p("mode-change", o);
    }
    const $ = t(() => {
      const o = s.width;
      if (o !== void 0)
        return typeof o == "number" ? `${o}px` : o;
    }), C = t(() => [
      "nm-logo",
      `nm-logo--${M.value}`,
      { "nm-logo--reduced-motion": h.value },
      { "nm-logo--no-float": !B.value }
    ]);
    return (o, l) => (u(), m("div", {
      class: E(C.value),
      style: I({ width: $.value }),
      role: "img",
      "aria-label": f.ariaLabel,
      onPointermove: l[0] || (l[0] = //@ts-ignore
      (...d) => n(k) && n(k)(...d)),
      onPointerleave: l[1] || (l[1] = //@ts-ignore
      (...d) => n(x) && n(x)(...d))
    }, [
      e("div", O, [
        l[4] || (l[4] = e("div", {
          class: "nm-logo__halo",
          "aria-hidden": "true"
        }, null, -1)),
        e("div", Q, [
          (u(), m("svg", {
            ref_key: "svgRef",
            ref: v,
            class: "nm-logo__svg",
            viewBox: "0 0 512 512",
            xmlns: "http://www.w3.org/2000/svg"
          }, [
            e("defs", null, [
              e("filter", {
                id: n(R),
                x: "-20%",
                y: "-20%",
                width: "140%",
                height: "140%"
              }, [...l[2] || (l[2] = [
                e("feGaussianBlur", {
                  in: "SourceGraphic",
                  stdDeviation: "3.2",
                  result: "b"
                }, null, -1),
                e("feColorMatrix", {
                  in: "b",
                  values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -9.5"
                }, null, -1)
              ])], 8, T)
            ]),
            l[3] || (l[3] = e("rect", {
              x: "0",
              y: "0",
              width: "512",
              height: "512",
              rx: "96",
              fill: "#000"
            }, null, -1)),
            e("g", { filter: N.value }, [
              e("g", {
                ref_key: "linksGroupRef",
                ref: c
              }, null, 512),
              e("g", {
                ref_key: "pixelsGroupRef",
                ref: _
              }, null, 512),
              e("g", {
                ref_key: "sparksGroupRef",
                ref: y
              }, null, 512)
            ], 8, U)
          ], 512))
        ])
      ]),
      o.$slots.default ? (u(), m("div", W, [
        V(o.$slots, "default", {
          mode: n(S),
          setMode: P,
          replay: n(z),
          isReducedMotion: n(h)
        }, void 0, !0)
      ])) : D("", !0)
    ], 46, K));
  }
}), to = /* @__PURE__ */ J(X, [["__scopeId", "data-v-5fd6bd88"]]);
export {
  to as N
};

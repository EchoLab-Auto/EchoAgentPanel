import { defineComponent as k, computed as r, ref as b, onMounted as q, onBeforeUnmount as $, watch as T, openBlock as f, createElementBlock as h, normalizeStyle as z, normalizeClass as O, renderSlot as g, createCommentVNode as y, createElementVNode as L } from "vue";
import { u as U } from "./createComponent-jnXBYqCm.js";
import { n as D, g as G } from "./glass-BqY-XLAc.js";
import { b as I } from "./squircle-D5heR-hJ.js";
import { _ as V } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismCard.css';const A = {
  key: 0,
  class: "nm-card__header"
}, F = { class: "nm-card__body" }, H = {
  key: 1,
  class: "nm-card__footer"
}, N = 2.5, M = /* @__PURE__ */ k({
  __name: "NeumorphismCard",
  props: {
    elevation: {},
    variant: {},
    depth: {},
    radius: {},
    noPadding: { type: Boolean, default: !1 },
    hoverable: { type: [Boolean, String], default: void 0 },
    glass: { type: [Boolean, String], default: void 0 },
    squircle: { type: [Boolean, Number], default: !1 },
    clipPath: { default: void 0 }
  },
  setup(w) {
    const C = {
      shallow: 1,
      medium: 2,
      deep: 3,
      "very-deep": 4
    }, o = w, { config: d, resolveProp: u } = U(), E = r(() => {
      var e;
      return u(o.radius, (e = d.value.card) == null ? void 0 : e.radius, "large");
    }), P = r(
      () => {
        var e;
        return D(u(o.glass, (e = d.value.card) == null ? void 0 : e.glass, void 0));
      }
    ), l = r(
      () => {
        var e;
        return u(o.hoverable, (e = d.value.card) == null ? void 0 : e.hoverable, !1);
      }
    ), R = r(() => {
      if (o.elevation !== void 0) return o.elevation;
      const e = C[o.depth ?? "medium"];
      return o.variant === "pressed" ? -e : e;
    }), c = b(null), s = b({ width: 0, height: 0, radius: 0 }), v = r(() => o.squircle !== !1 && o.squircle !== void 0);
    function m() {
      const e = c.value;
      if (!e || typeof window > "u") return;
      const a = e.getBoundingClientRect(), n = Number.parseFloat(getComputedStyle(e).borderTopLeftRadius) || 0, i = n > 0 ? n : s.value.radius;
      (s.value.width !== a.width || s.value.height !== a.height || s.value.radius !== i) && (s.value = { width: a.width, height: a.height, radius: i });
    }
    const p = r(() => {
      if (o.clipPath) return o.clipPath;
      if (!v.value) return;
      const { width: e, height: a, radius: n } = s.value;
      if (e < 1 || a < 1 || n < 0.5) return;
      const i = o.squircle === !0 ? N : Number(o.squircle) || N;
      return I({ width: e, height: a, radius: n, exponent: i });
    }), B = r(
      () => p.value ? { "--nm-card-clip": p.value } : void 0
    );
    let t = null;
    function _() {
      const e = c.value;
      !e || typeof ResizeObserver > "u" || (t == null || t.disconnect(), t = new ResizeObserver(() => m()), t.observe(e));
    }
    q(() => {
      v.value && (m(), _());
    }), $(() => {
      t == null || t.disconnect(), t = null;
    }), T(v, (e) => {
      e ? (m(), _()) : (t == null || t.disconnect(), t = null);
    });
    const S = r(() => [
      "nm-card",
      `nm-card--elevation-${R.value}`,
      `nm-card--radius-${E.value}`,
      {
        ...Object.fromEntries(G("nm-card", P.value).map((e) => [e, !0])),
        "nm-card--no-padding": o.noPadding,
        "nm-card--hoverable": !!l.value,
        "nm-card--hover-bulge": l.value === !0 || l.value === "bulge",
        "nm-card--hover-sink": l.value === "sink",
        "nm-card--clipped": !!p.value
      }
    ]);
    return (e, a) => (f(), h("div", {
      ref_key: "rootRef",
      ref: c,
      class: O(S.value),
      style: z(B.value)
    }, [
      e.$slots.header ? (f(), h("div", A, [
        g(e.$slots, "header", {}, void 0, !0)
      ])) : y("", !0),
      L("div", F, [
        g(e.$slots, "default", {}, void 0, !0)
      ]),
      e.$slots.footer ? (f(), h("div", H, [
        g(e.$slots, "footer", {}, void 0, !0)
      ])) : y("", !0)
    ], 6));
  }
}), K = /* @__PURE__ */ V(M, [["__scopeId", "data-v-de64946d"]]);
export {
  K as N
};

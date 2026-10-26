import { defineComponent as T, computed as r, ref as y, onMounted as $, onBeforeUnmount as U, watch as N, openBlock as h, createElementBlock as _, normalizeStyle as z, normalizeClass as D, renderSlot as g, createCommentVNode as w, createElementVNode as L } from "vue";
import { u as O } from "./createComponent-jnXBYqCm.js";
import { n as A, g as F } from "./glass-BqY-XLAc.js";
import { b as I } from "./squircle-D5heR-hJ.js";
import { _ as x } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismCard.css';const G = {
  key: 0,
  class: "nm-card__header"
}, M = { class: "nm-card__body" }, V = {
  key: 1,
  class: "nm-card__footer"
}, E = 24, C = 2.5, H = /* @__PURE__ */ T({
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
  setup(R) {
    const P = {
      shallow: 1,
      medium: 2,
      deep: 3,
      "very-deep": 4
    }, t = R, { config: c, resolveProp: v } = O(), m = r(() => {
      var a;
      const e = v(t.radius, (a = c.value.card) == null ? void 0 : a.radius, E);
      return Number.isFinite(e) ? Math.max(0, e) : E;
    }), S = r(
      () => {
        var e;
        return A(v(t.glass, (e = c.value.card) == null ? void 0 : e.glass, void 0));
      }
    ), l = r(
      () => {
        var e;
        return v(t.hoverable, (e = c.value.card) == null ? void 0 : e.hoverable, !1);
      }
    ), B = r(() => {
      if (t.elevation !== void 0) return t.elevation;
      const e = P[t.depth ?? "medium"];
      return t.variant === "pressed" ? -e : e;
    }), f = y(null), s = y({ width: 0, height: 0, radius: 0 }), i = r(() => t.squircle !== !1 && t.squircle !== void 0);
    function u() {
      const e = f.value;
      if (!e || typeof window > "u") return;
      const a = e.getBoundingClientRect(), n = Number.parseFloat(getComputedStyle(e).borderTopLeftRadius) || 0, d = n > 0 ? n : m.value;
      (s.value.width !== a.width || s.value.height !== a.height || s.value.radius !== d) && (s.value = { width: a.width, height: a.height, radius: d });
    }
    const p = r(() => {
      if (t.clipPath) return t.clipPath;
      if (!i.value) return;
      const { width: e, height: a, radius: n } = s.value;
      if (e < 1 || a < 1 || n < 0.5) return;
      const d = t.squircle === !0 ? C : Number(t.squircle) || C;
      return I({ width: e, height: a, radius: n, exponent: d });
    }), k = r(() => {
      const e = {
        "--nm-card-radius": `${m.value}px`
      };
      return p.value && (e["--nm-card-clip"] = p.value), e;
    });
    let o = null;
    function b() {
      const e = f.value;
      !e || typeof ResizeObserver > "u" || (o == null || o.disconnect(), o = new ResizeObserver(() => u()), o.observe(e));
    }
    $(() => {
      i.value && (u(), b());
    }), U(() => {
      o == null || o.disconnect(), o = null;
    }), N(i, (e) => {
      e ? (u(), b()) : (o == null || o.disconnect(), o = null);
    }), N(
      m,
      () => {
        i.value && u();
      },
      { flush: "post" }
    );
    const q = r(() => [
      "nm-card",
      `nm-card--elevation-${B.value}`,
      {
        ...Object.fromEntries(F("nm-card", S.value).map((e) => [e, !0])),
        "nm-card--no-padding": t.noPadding,
        "nm-card--hoverable": !!l.value,
        "nm-card--hover-bulge": l.value === !0 || l.value === "bulge",
        "nm-card--hover-sink": l.value === "sink",
        "nm-card--clipped": !!p.value
      }
    ]);
    return (e, a) => (h(), _("div", {
      ref_key: "rootRef",
      ref: f,
      class: D(q.value),
      style: z(k.value)
    }, [
      e.$slots.header ? (h(), _("div", G, [
        g(e.$slots, "header", {}, void 0, !0)
      ])) : w("", !0),
      L("div", M, [
        g(e.$slots, "default", {}, void 0, !0)
      ]),
      e.$slots.footer ? (h(), _("div", V, [
        g(e.$slots, "footer", {}, void 0, !0)
      ])) : w("", !0)
    ], 6));
  }
}), W = /* @__PURE__ */ x(H, [["__scopeId", "data-v-1fcc95e0"]]);
export {
  W as N
};

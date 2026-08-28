import { defineComponent as _, computed as a, openBlock as s, createElementBlock as u, normalizeClass as p, renderSlot as h, normalizeStyle as N, toDisplayString as y, createCommentVNode as f } from "vue";
import { useLocale as x } from "../composables/useLocale.js";
import { u as S } from "./createComponent-jnXBYqCm.js";
import { _ as B } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismBadge.css';const k = ["aria-label"], w = {
  key: 0,
  class: "nm-badge__text",
  "aria-hidden": "true"
}, C = /* @__PURE__ */ _({
  __name: "NeumorphismBadge",
  props: {
    value: {},
    max: {},
    dot: { type: Boolean, default: void 0 },
    color: {},
    showZero: { type: Boolean, default: void 0 }
  },
  setup(l) {
    const o = l, { config: r, resolveProp: n } = S(), d = a(() => {
      var e;
      return n(o.max, (e = r.value.badge) == null ? void 0 : e.max, 99);
    }), t = a(() => {
      var e;
      return n(o.dot, (e = r.value.badge) == null ? void 0 : e.dot, !1);
    }), i = a(
      () => {
        var e;
        return n(o.showZero, (e = r.value.badge) == null ? void 0 : e.showZero, !1);
      }
    ), c = a(() => {
      if (t.value) return "";
      const e = Number(o.value);
      return isNaN(e) ? String(o.value || "") : e <= 0 && !i.value ? "" : e > d.value ? `${d.value}+` : String(e);
    }), m = a(() => {
      if (t.value) return o.value == null || o.value === "";
      const e = Number(o.value);
      return (isNaN(e) || e <= 0) && !i.value;
    }), { t: v } = x(), b = a(
      () => o.dot ? v("badgeOnline") : v("badgeUnread", { count: c.value })
    ), g = a(() => [
      "nm-badge",
      {
        "nm-badge--dot": t.value,
        "nm-badge--hidden": m.value
      }
    ]);
    return (e, Z) => (s(), u("div", {
      class: p(g.value)
    }, [
      h(e.$slots, "default", {}, void 0, !0),
      m.value ? f("", !0) : (s(), u("sup", {
        key: 0,
        class: p(["nm-badge__content", { "nm-badge__content--dot": t.value }]),
        style: N(l.color ? { backgroundColor: l.color } : void 0),
        "aria-label": b.value
      }, [
        t.value ? f("", !0) : (s(), u("span", w, y(c.value), 1))
      ], 14, k))
    ], 2));
  }
}), $ = /* @__PURE__ */ B(C, [["__scopeId", "data-v-e0217feb"]]);
export {
  $ as N
};

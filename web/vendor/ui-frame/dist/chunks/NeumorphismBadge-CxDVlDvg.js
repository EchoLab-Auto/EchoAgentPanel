import { defineComponent as _, computed as o, openBlock as u, createElementBlock as s, normalizeClass as f, renderSlot as h, normalizeStyle as N, toDisplayString as y, createCommentVNode as p } from "vue";
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
    const a = l, { config: r, resolveProp: n } = S(), d = o(() => {
      var e;
      return n(a.max, (e = r.value.badge) == null ? void 0 : e.max, 99);
    }), t = o(() => {
      var e;
      return n(a.dot, (e = r.value.badge) == null ? void 0 : e.dot, !1);
    }), i = o(
      () => {
        var e;
        return n(a.showZero, (e = r.value.badge) == null ? void 0 : e.showZero, !1);
      }
    ), c = o(() => {
      if (t.value) return "";
      const e = Number(a.value);
      return isNaN(e) ? String(a.value || "") : e <= 0 && !i.value ? "" : e > d.value ? `${d.value}+` : String(e);
    }), m = o(() => {
      if (t.value) return a.value == null || a.value === "";
      if (a.value == null || a.value === "") return !0;
      const e = Number(a.value);
      return isNaN(e) ? !1 : e <= 0 && !i.value;
    }), { t: v } = x(), b = o(
      () => a.dot ? v("badgeOnline") : v("badgeUnread", { count: c.value })
    ), g = o(() => [
      "nm-badge",
      {
        "nm-badge--dot": t.value,
        "nm-badge--hidden": m.value
      }
    ]);
    return (e, Z) => (u(), s("div", {
      class: f(g.value)
    }, [
      h(e.$slots, "default", {}, void 0, !0),
      m.value ? p("", !0) : (u(), s("sup", {
        key: 0,
        class: f(["nm-badge__content", { "nm-badge__content--dot": t.value }]),
        style: N(l.color ? { backgroundColor: l.color } : void 0),
        "aria-label": b.value
      }, [
        t.value ? p("", !0) : (u(), s("span", w, y(c.value), 1))
      ], 14, k))
    ], 2));
  }
}), $ = /* @__PURE__ */ B(C, [["__scopeId", "data-v-5b88e84f"]]);
export {
  $ as N
};

import { defineComponent as b, computed as e, openBlock as h, createElementBlock as y, normalizeStyle as x, normalizeClass as E } from "vue";
import { useLocale as S } from "../composables/useLocale.js";
import { u as g } from "./createComponent-jnXBYqCm.js";
import { _ as z } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismStatusDot.css';const L = ["aria-label"], i = 10, N = /* @__PURE__ */ b({
  __name: "NeumorphismStatusDot",
  props: {
    status: { default: void 0 },
    size: { default: void 0 },
    pulse: { type: Boolean, default: void 0 },
    label: { default: "" }
  },
  setup(c) {
    const o = c, { t: m } = S(), { config: a, resolveProp: l } = g(), s = e(
      () => {
        var t;
        return l(o.status, (t = a.value.statusDot) == null ? void 0 : t.status, "online");
      }
    ), p = { small: 8, medium: 10, large: 12 }, n = e(() => {
      var r;
      const t = l(o.size, (r = a.value.statusDot) == null ? void 0 : r.size, i), u = typeof t == "number" ? t : p[t];
      return Number.isFinite(u) ? Math.max(4, u) : i;
    }), v = e(() => {
      var t;
      return l(o.pulse, (t = a.value.statusDot) == null ? void 0 : t.pulse, !0);
    }), d = e(() => {
      if (o.label) return o.label;
      const t = s.value === "online" ? "statusDotOnline" : s.value === "offline" ? "statusDotOffline" : s.value === "busy" ? "statusDotBusy" : "statusDotConnecting";
      return m(t);
    }), f = e(
      () => v.value && (s.value === "connecting" || s.value === "busy")
    ), _ = e(() => [
      "nm-status-dot",
      `nm-status-dot--${s.value}`,
      { "nm-status-dot--pulse": f.value }
    ]), D = e(() => ({
      width: `${n.value}px`,
      height: `${n.value}px`
    }));
    return (t, u) => (h(), y("span", {
      class: E(_.value),
      style: x(D.value),
      role: "status",
      "aria-label": d.value
    }, null, 14, L));
  }
}), w = /* @__PURE__ */ z(N, [["__scopeId", "data-v-02a53497"]]);
export {
  w as N
};

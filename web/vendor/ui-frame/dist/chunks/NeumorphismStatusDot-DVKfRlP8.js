import { defineComponent as v, computed as e, openBlock as d, createElementBlock as f, normalizeClass as _ } from "vue";
import { useLocale as D } from "../composables/useLocale.js";
import { u as b } from "./createComponent-jnXBYqCm.js";
import { _ as h } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismStatusDot.css';const y = ["aria-label"], z = /* @__PURE__ */ v({
  __name: "NeumorphismStatusDot",
  props: {
    status: { default: void 0 },
    size: { default: void 0 },
    pulse: { type: Boolean, default: void 0 },
    label: { default: "" }
  },
  setup(l) {
    const o = l, { t: n } = D(), { config: a, resolveProp: u } = b(), s = e(
      () => {
        var t;
        return u(o.status, (t = a.value.statusDot) == null ? void 0 : t.status, "online");
      }
    ), r = e(() => {
      var t;
      return u(o.size, (t = a.value.statusDot) == null ? void 0 : t.size, "medium");
    }), i = e(() => {
      var t;
      return u(o.pulse, (t = a.value.statusDot) == null ? void 0 : t.pulse, !0);
    }), c = e(() => {
      if (o.label) return o.label;
      const t = s.value === "online" ? "statusDotOnline" : s.value === "offline" ? "statusDotOffline" : s.value === "busy" ? "statusDotBusy" : "statusDotConnecting";
      return n(t);
    }), m = e(
      () => i.value && (s.value === "connecting" || s.value === "busy")
    ), p = e(() => [
      "nm-status-dot",
      `nm-status-dot--${s.value}`,
      `nm-status-dot--${r.value}`,
      { "nm-status-dot--pulse": m.value }
    ]);
    return (t, S) => (d(), f("span", {
      class: _(p.value),
      role: "status",
      "aria-label": c.value
    }, null, 10, y));
  }
}), x = /* @__PURE__ */ h(z, [["__scopeId", "data-v-3a3e8d62"]]);
export {
  x as N
};

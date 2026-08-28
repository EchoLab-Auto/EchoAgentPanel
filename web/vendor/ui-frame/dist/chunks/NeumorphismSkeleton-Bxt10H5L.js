import { defineComponent as k, computed as t, openBlock as m, createElementBlock as u, Fragment as v, renderList as _, unref as g, normalizeStyle as x, normalizeClass as y, createElementVNode as N } from "vue";
import { useLocale as S } from "../composables/useLocale.js";
import { u as L } from "./createComponent-jnXBYqCm.js";
import { _ as b } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismSkeleton.css';const w = ["aria-label"], z = /* @__PURE__ */ k({
  __name: "NeumorphismSkeleton",
  props: {
    variant: {},
    width: {},
    height: {},
    count: { default: 1 },
    animation: {}
  },
  setup(n) {
    const o = n, { config: s, resolveProp: i } = L(), c = t(
      () => {
        var e;
        return i(o.variant, (e = s.value.skeleton) == null ? void 0 : e.variant, "text");
      }
    ), p = t(
      () => {
        var e;
        return i(o.animation, (e = s.value.skeleton) == null ? void 0 : e.animation, "pulse");
      }
    ), { t: d } = S(), f = t(() => {
      const e = Math.max(0, Math.floor(o.count));
      return Array.from({ length: e }, (r, a) => a);
    }), h = t(() => [
      "nm-skeleton",
      `nm-skeleton--${c.value}`,
      `nm-skeleton--${p.value}`
    ]);
    function l(e) {
      if (e !== void 0)
        return typeof e == "number" ? `${e}px` : e;
    }
    return (e, r) => (m(!0), u(v, null, _(f.value, (a) => (m(), u("span", {
      key: a,
      class: y(h.value),
      style: x({
        width: l(n.width),
        height: l(n.height)
      }),
      role: "status",
      "aria-label": g(d)("skeletonLoading")
    }, [...r[0] || (r[0] = [
      N("span", {
        class: "nm-skeleton__shimmer",
        "aria-hidden": "true"
      }, null, -1)
    ])], 14, w))), 128));
  }
}), E = /* @__PURE__ */ b(z, [["__scopeId", "data-v-906e403c"]]);
export {
  E as N
};

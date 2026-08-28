import { defineComponent as d, computed as t, openBlock as m, createBlock as c, resolveDynamicComponent as l, normalizeClass as p, withCtx as u, renderSlot as f } from "vue";
import { u as v } from "./createComponent-jnXBYqCm.js";
import { _ } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismContainer.css';const g = /* @__PURE__ */ d({
  __name: "NeumorphismContainer",
  props: {
    mode: {},
    noPadding: { type: Boolean, default: !1 },
    tag: { default: "div" }
  },
  setup(o) {
    const n = o, { config: a, resolveProp: s } = v(), r = t(() => {
      var e;
      return s(n.mode, (e = a.value.container) == null ? void 0 : e.mode, "fixed");
    }), i = t(() => [
      "nm-container",
      { "nm-container--fluid": r.value === "fluid" },
      { "nm-container--no-padding": n.noPadding }
    ]);
    return (e, C) => (m(), c(l(o.tag), {
      class: p(i.value)
    }, {
      default: u(() => [
        f(e.$slots, "default", {}, void 0, !0)
      ]),
      _: 3
    }, 8, ["class"]));
  }
}), B = /* @__PURE__ */ _(g, [["__scopeId", "data-v-8e8e120d"]]);
export {
  B as N
};

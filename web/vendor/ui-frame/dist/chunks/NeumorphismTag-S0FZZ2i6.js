import { defineComponent as y, computed as a, openBlock as d, createElementBlock as u, normalizeStyle as h, normalizeClass as z, createElementVNode as n, renderSlot as B, createCommentVNode as L } from "vue";
import { useLocale as N } from "../composables/useLocale.js";
import { u as w } from "./createComponent-jnXBYqCm.js";
import { _ as x } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismTag.css';const S = { class: "nm-tag__text" }, V = ["aria-label"], $ = /* @__PURE__ */ y({
  __name: "NeumorphismTag",
  props: {
    closable: { type: Boolean, default: !1 },
    variant: {},
    size: {},
    disabled: { type: Boolean, default: !1 },
    rounded: { type: Boolean, default: void 0 },
    closeLabel: { default: "" }
  },
  emits: ["close", "click"],
  setup(i, { emit: m }) {
    const o = i, { config: l, resolveProp: s } = w(), r = a(
      () => {
        var e;
        return s(o.variant, (e = l.value.tag) == null ? void 0 : e.variant, "default");
      }
    ), p = a(() => {
      var e;
      return s(o.size, (e = l.value.tag) == null ? void 0 : e.size, "medium");
    }), v = a(() => {
      var e;
      return s(o.rounded, (e = l.value.tag) == null ? void 0 : e.rounded, !1);
    }), c = m, { t: f } = N(), g = a(() => o.closeLabel || f("tagClose"));
    function b(e) {
      o.disabled || (e.stopPropagation(), c("close", e));
    }
    const _ = a(() => [
      "nm-tag",
      `nm-tag--${r.value}`,
      `nm-tag--${p.value}`,
      {
        "nm-tag--rounded": v.value,
        "nm-tag--disabled": o.disabled,
        "nm-tag--closable": o.closable
      }
    ]), C = {
      default: "",
      primary: "var(--nm-primary-color)",
      success: "var(--nm-color-success)",
      warning: "var(--nm-color-warning)",
      error: "var(--nm-color-error)",
      info: "var(--nm-color-info)"
    };
    return (e, t) => (d(), u("span", {
      class: z(_.value),
      style: h(
        r.value !== "default" ? { "--tag-color": C[r.value] } : void 0
      ),
      role: "status",
      onClick: t[0] || (t[0] = (k) => c("click", k))
    }, [
      n("span", S, [
        B(e.$slots, "default", {}, void 0, !0)
      ]),
      i.closable ? (d(), u("button", {
        key: 0,
        class: "nm-tag__close",
        "aria-label": g.value,
        type: "button",
        onClick: b
      }, [...t[1] || (t[1] = [
        n("svg", {
          width: "12",
          height: "12",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          "stroke-width": "2.5"
        }, [
          n("path", { d: "M18 6L6 18M6 6l12 12" })
        ], -1)
      ])], 8, V)) : L("", !0)
    ], 6));
  }
}), I = /* @__PURE__ */ x($, [["__scopeId", "data-v-33723059"]]);
export {
  I as N
};

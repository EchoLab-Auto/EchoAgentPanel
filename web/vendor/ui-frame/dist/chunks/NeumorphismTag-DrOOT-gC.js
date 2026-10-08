import { defineComponent as w, computed as t, openBlock as u, createElementBlock as m, withKeys as v, withModifiers as f, normalizeStyle as x, normalizeClass as z, createElementVNode as i, renderSlot as B, createCommentVNode as L } from "vue";
import { useLocale as N } from "../composables/useLocale.js";
import { u as S } from "./createComponent-jnXBYqCm.js";
import { _ as K } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismTag.css';const M = ["role", "tabindex", "aria-disabled", "onKeydown"], V = { class: "nm-tag__text" }, $ = ["aria-label"], E = /* @__PURE__ */ w({
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
  setup(a, { emit: p }) {
    const o = a, { config: l, resolveProp: s } = S(), n = t(
      () => {
        var e;
        return s(o.variant, (e = l.value.tag) == null ? void 0 : e.variant, "default");
      }
    ), b = t(() => {
      var e;
      return s(o.size, (e = l.value.tag) == null ? void 0 : e.size, "medium");
    }), g = t(() => {
      var e;
      return s(o.rounded, (e = l.value.tag) == null ? void 0 : e.rounded, !1);
    }), d = p, { t: h } = N(), y = t(() => o.closeLabel || h("tagClose"));
    function C(e) {
      o.disabled || (e.stopPropagation(), d("close", e));
    }
    function r(e) {
      o.disabled || d("click", e);
    }
    const k = t(() => [
      "nm-tag",
      `nm-tag--${n.value}`,
      `nm-tag--${b.value}`,
      {
        "nm-tag--rounded": g.value,
        "nm-tag--disabled": o.disabled,
        "nm-tag--closable": o.closable
      }
    ]), _ = {
      default: "",
      primary: "var(--nm-primary-color)",
      success: "var(--nm-color-success)",
      warning: "var(--nm-color-warning)",
      error: "var(--nm-color-error)",
      info: "var(--nm-color-info)"
    };
    return (e, c) => (u(), m("span", {
      class: z(k.value),
      style: x(
        n.value !== "default" ? { "--tag-color": _[n.value] } : void 0
      ),
      role: a.disabled ? "status" : "button",
      tabindex: a.disabled ? void 0 : 0,
      "aria-disabled": a.disabled || void 0,
      onClick: r,
      onKeydown: [
        v(f(r, ["prevent"]), ["enter"]),
        v(f(r, ["prevent"]), ["space"])
      ]
    }, [
      i("span", V, [
        B(e.$slots, "default", {}, void 0, !0)
      ]),
      a.closable ? (u(), m("button", {
        key: 0,
        class: "nm-tag__close",
        "aria-label": y.value,
        type: "button",
        onClick: C
      }, [...c[0] || (c[0] = [
        i("svg", {
          width: "12",
          height: "12",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          "stroke-width": "2.5"
        }, [
          i("path", { d: "M18 6L6 18M6 6l12 12" })
        ], -1)
      ])], 8, $)) : L("", !0)
    ], 46, M));
  }
}), j = /* @__PURE__ */ K(E, [["__scopeId", "data-v-a1c69db8"]]);
export {
  j as N
};

import { defineComponent as k, computed as t, openBlock as u, createElementBlock as m, withKeys as v, withModifiers as f, normalizeStyle as w, normalizeClass as L, createElementVNode as x, renderSlot as B, createVNode as E, createCommentVNode as T } from "vue";
import { useLocale as V } from "../composables/useLocale.js";
import { u as A } from "./createComponent-jnXBYqCm.js";
import { n as I, r as K, T as P } from "./controlScales-CPj0Htdh.js";
import { N as $ } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as D } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismTag.css';const F = ["role", "tabindex", "aria-disabled", "onKeydown"], G = { class: "nm-tag__text" }, M = ["aria-label"], R = 12, U = /* @__PURE__ */ k({
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
  setup(s, { emit: p }) {
    const a = s, { config: l, resolveProp: c } = A(), n = t(
      () => {
        var e;
        return c(a.variant, (e = l.value.tag) == null ? void 0 : e.variant, "default");
      }
    ), r = t(() => {
      var o;
      const e = a.size ?? ((o = l.value.tag) == null ? void 0 : o.size);
      return typeof e == "number" ? I(e, R) : void 0;
    }), b = t(() => {
      var o;
      const e = a.size ?? ((o = l.value.tag) == null ? void 0 : o.size);
      return typeof e == "string" ? e : "medium";
    }), g = t(
      () => r.value === void 0 ? void 0 : K(P, r.value)
    ), y = t(() => {
      var e;
      return c(a.rounded, (e = l.value.tag) == null ? void 0 : e.rounded, !1);
    }), d = p, { t: z } = V(), _ = t(() => a.closeLabel || z("tagClose"));
    function h(e) {
      a.disabled || (e.stopPropagation(), d("close", e));
    }
    function i(e) {
      a.disabled || d("click", e);
    }
    const C = t(() => [
      "nm-tag",
      `nm-tag--${n.value}`,
      r.value === void 0 ? `nm-tag--${b.value}` : "nm-tag--sized",
      {
        "nm-tag--rounded": y.value,
        "nm-tag--disabled": a.disabled,
        "nm-tag--closable": a.closable
      }
    ]), S = {
      default: "",
      primary: "var(--nm-primary-color)",
      success: "var(--nm-color-success)",
      warning: "var(--nm-color-warning)",
      error: "var(--nm-color-error)",
      info: "var(--nm-color-info)"
    }, N = t(() => {
      const e = n.value === "default" ? void 0 : { "--tag-color": S[n.value] }, o = g.value;
      return e ? o ? { ...e, ...o } : e : o;
    });
    return (e, o) => (u(), m("span", {
      class: L(C.value),
      style: w(N.value),
      role: s.disabled ? "status" : "button",
      tabindex: s.disabled ? void 0 : 0,
      "aria-disabled": s.disabled || void 0,
      onClick: i,
      onKeydown: [
        v(f(i, ["prevent"]), ["enter"]),
        v(f(i, ["prevent"]), ["space"])
      ]
    }, [
      x("span", G, [
        B(e.$slots, "default", {}, void 0, !0)
      ]),
      s.closable ? (u(), m("button", {
        key: 0,
        class: "nm-tag__close",
        "aria-label": _.value,
        type: "button",
        onClick: h
      }, [
        E($, {
          name: "close",
          size: "xs"
        })
      ], 8, M)) : T("", !0)
    ], 46, F));
  }
}), O = /* @__PURE__ */ D(U, [["__scopeId", "data-v-fdade1d8"]]);
export {
  O as N
};

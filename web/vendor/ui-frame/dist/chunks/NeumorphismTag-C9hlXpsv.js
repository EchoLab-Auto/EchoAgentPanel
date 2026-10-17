import { defineComponent as C, computed as t, openBlock as d, createElementBlock as c, withKeys as m, withModifiers as u, normalizeStyle as N, normalizeClass as k, createElementVNode as z, renderSlot as w, createVNode as x, createCommentVNode as B } from "vue";
import { useLocale as L } from "../composables/useLocale.js";
import { u as S } from "./createComponent-jnXBYqCm.js";
import { N as V } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as K } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismTag.css';const $ = ["role", "tabindex", "aria-disabled", "onKeydown"], E = { class: "nm-tag__text" }, I = ["aria-label"], P = /* @__PURE__ */ C({
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
  setup(a, { emit: v }) {
    const o = a, { config: s, resolveProp: l } = S(), n = t(
      () => {
        var e;
        return l(o.variant, (e = s.value.tag) == null ? void 0 : e.variant, "default");
      }
    ), f = t(() => {
      var e;
      return l(o.size, (e = s.value.tag) == null ? void 0 : e.size, "medium");
    }), p = t(() => {
      var e;
      return l(o.rounded, (e = s.value.tag) == null ? void 0 : e.rounded, !1);
    }), i = v, { t: b } = L(), g = t(() => o.closeLabel || b("tagClose"));
    function h(e) {
      o.disabled || (e.stopPropagation(), i("close", e));
    }
    function r(e) {
      o.disabled || i("click", e);
    }
    const y = t(() => [
      "nm-tag",
      `nm-tag--${n.value}`,
      `nm-tag--${f.value}`,
      {
        "nm-tag--rounded": p.value,
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
    return (e, T) => (d(), c("span", {
      class: k(y.value),
      style: N(
        n.value !== "default" ? { "--tag-color": _[n.value] } : void 0
      ),
      role: a.disabled ? "status" : "button",
      tabindex: a.disabled ? void 0 : 0,
      "aria-disabled": a.disabled || void 0,
      onClick: r,
      onKeydown: [
        m(u(r, ["prevent"]), ["enter"]),
        m(u(r, ["prevent"]), ["space"])
      ]
    }, [
      z("span", E, [
        w(e.$slots, "default", {}, void 0, !0)
      ]),
      a.closable ? (d(), c("button", {
        key: 0,
        class: "nm-tag__close",
        "aria-label": g.value,
        type: "button",
        onClick: h
      }, [
        x(V, {
          name: "close",
          size: "xs"
        })
      ], 8, I)) : B("", !0)
    ], 46, $));
  }
}), D = /* @__PURE__ */ K(P, [["__scopeId", "data-v-9bd8ecce"]]);
export {
  D as N
};

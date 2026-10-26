import { defineComponent as g, computed as t, ref as y, watch as A, openBlock as o, createElementBlock as l, unref as C, normalizeStyle as E, normalizeClass as N, renderSlot as I, createTextVNode as L, toDisplayString as v } from "vue";
import { useLocale as $ } from "../composables/useLocale.js";
import { u as w } from "./createComponent-jnXBYqCm.js";
import { n as T, r as U, a as x } from "./controlScales-CPj0Htdh.js";
import { _ as B } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismAvatar.css';const D = ["aria-label"], F = ["src", "alt"], P = {
  key: 1,
  class: "nm-avatar__fallback nm-avatar__icon"
}, V = {
  key: 2,
  class: "nm-avatar__fallback"
}, R = 44, X = /* @__PURE__ */ g({
  __name: "NeumorphismAvatar",
  props: {
    src: {},
    alt: {},
    size: {},
    shape: {},
    initials: {},
    icon: {}
  },
  emits: ["error"],
  setup(s, { emit: f }) {
    const a = s, { config: c, resolveProp: m } = w(), r = t(
      () => {
        var e;
        return m(a.size, (e = c.value.avatar) == null ? void 0 : e.size, "medium");
      }
    ), i = t(
      () => typeof r.value == "number" ? T(r.value, R) : void 0
    ), p = t(
      () => typeof r.value == "string" ? r.value : "medium"
    ), d = t(
      () => i.value === void 0 ? void 0 : U(x, i.value)
    ), _ = t(() => {
      var e;
      return m(a.shape, (e = c.value.avatar) == null ? void 0 : e.shape, "circle");
    }), h = f, { t: S } = $(), z = t(() => !!a.src), n = y(!1);
    A(
      () => a.src,
      () => {
        n.value = !1;
      }
    );
    function b() {
      n.value = !0, h("error");
    }
    const k = t(() => [
      "nm-avatar",
      // 数字与档位互斥：数字走 `--sized`（变量来自内联样式），字符串走档位类
      i.value === void 0 ? `nm-avatar--${p.value}` : "nm-avatar--sized",
      `nm-avatar--${_.value}`
    ]), u = t(() => a.initials ? a.initials.slice(0, 2).toUpperCase() : a.alt ? a.alt.slice(0, 1).toUpperCase() : "?");
    return (e, Z) => (o(), l("div", {
      class: N(k.value),
      style: E(d.value),
      role: "img",
      "aria-label": s.alt || s.initials || C(S)("badgeAvatar")
    }, [
      z.value && !n.value ? (o(), l("img", {
        key: 0,
        src: s.src,
        alt: s.alt || "",
        class: "nm-avatar__img",
        onError: b
      }, null, 40, F)) : s.icon || e.$slots.fallback ? (o(), l("span", P, [
        I(e.$slots, "fallback", {}, () => [
          L(v(u.value), 1)
        ], !0)
      ])) : (o(), l("span", V, v(u.value), 1))
    ], 14, D));
  }
}), K = /* @__PURE__ */ B(X, [["__scopeId", "data-v-55d2f62b"]]);
export {
  K as N
};

import { defineComponent as b, computed as s, ref as g, watch as z, openBlock as r, createElementBlock as l, unref as C, normalizeClass as N, renderSlot as S, createTextVNode as y, toDisplayString as m } from "vue";
import { useLocale as $ } from "../composables/useLocale.js";
import { u as A } from "./createComponent-jnXBYqCm.js";
import { _ as E } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismAvatar.css';const I = ["aria-label"], w = ["src", "alt"], x = {
  key: 1,
  class: "nm-avatar__fallback nm-avatar__icon"
}, B = {
  key: 2,
  class: "nm-avatar__fallback"
}, L = /* @__PURE__ */ b({
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
  setup(t, { emit: u }) {
    const a = t, { config: n, resolveProp: c } = A(), v = s(() => {
      var e;
      return c(a.size, (e = n.value.avatar) == null ? void 0 : e.size, "medium");
    }), p = s(() => {
      var e;
      return c(a.shape, (e = n.value.avatar) == null ? void 0 : e.shape, "circle");
    }), f = u, { t: d } = $(), h = s(() => !!a.src), o = g(!1);
    z(
      () => a.src,
      () => {
        o.value = !1;
      }
    );
    function _() {
      o.value = !0, f("error");
    }
    const k = s(() => [
      "nm-avatar",
      `nm-avatar--${v.value}`,
      `nm-avatar--${p.value}`
    ]), i = s(() => a.initials ? a.initials.slice(0, 2).toUpperCase() : a.alt ? a.alt.slice(0, 1).toUpperCase() : "?");
    return (e, U) => (r(), l("div", {
      class: N(k.value),
      role: "img",
      "aria-label": t.alt || t.initials || C(d)("badgeAvatar")
    }, [
      h.value && !o.value ? (r(), l("img", {
        key: 0,
        src: t.src,
        alt: t.alt || "",
        class: "nm-avatar__img",
        onError: _
      }, null, 40, w)) : t.icon || e.$slots.fallback ? (r(), l("span", x, [
        S(e.$slots, "fallback", {}, () => [
          y(m(i.value), 1)
        ], !0)
      ])) : (r(), l("span", B, m(i.value), 1))
    ], 10, I));
  }
}), V = /* @__PURE__ */ E(L, [["__scopeId", "data-v-6302d30d"]]);
export {
  V as N
};

import { defineComponent as N, computed as r, provide as E, onMounted as I, onBeforeUnmount as z, openBlock as s, createBlock as P, Teleport as S, createElementVNode as o, toDisplayString as g, normalizeStyle as $, normalizeClass as _, createVNode as A, TransitionGroup as V, withCtx as Z, createElementBlock as l, Fragment as j, renderList as D, unref as d, renderSlot as F, createCommentVNode as G } from "vue";
import { useToast as K, ToastInjectionKey as U } from "../composables/useToast.js";
import { useLocale as q } from "../composables/useLocale.js";
import { u as H } from "./createComponent-jnXBYqCm.js";
import { useZIndex as J } from "../composables/useZIndex.js";
import { _ as O } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismToastProvider.css';const Q = {
  "aria-live": "assertive",
  "aria-atomic": "true",
  class: "nm-sr-only"
}, R = ["role"], W = { class: "nm-toast__icon" }, X = {
  key: 0,
  width: "18",
  height: "18",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2"
}, Y = {
  key: 1,
  width: "18",
  height: "18",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2"
}, ee = {
  key: 2,
  width: "18",
  height: "18",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2"
}, te = {
  key: 3,
  width: "18",
  height: "18",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2"
}, oe = { class: "nm-toast__message" }, ne = ["aria-label", "onClick"], se = /* @__PURE__ */ N({
  __name: "NeumorphismToastProvider",
  props: {
    position: {},
    maxCount: {},
    closeLabel: { default: "" }
  },
  setup(k, { expose: y }) {
    const i = k, { config: u, resolveProp: m } = H(), f = r(
      () => {
        var e;
        return m(i.position, (e = u.value.toast) == null ? void 0 : e.position, "top-right");
      }
    ), w = r(
      () => {
        var e;
        return m(i.maxCount, (e = u.value.toast) == null ? void 0 : e.maxCount, 5);
      }
    ), { t: x } = q(), C = r(() => i.closeLabel || x("toastClose")), { getZIndex: L } = J(), M = r(() => L("toast")), p = K({
      maxCount: w.value
    });
    E(U, p);
    const { toasts: a, addToast: b, removeToast: c, clearAll: v } = p;
    y({ addToast: b, removeToast: c, clearAll: v, toasts: a });
    function h(e) {
      e.key === "Escape" && v();
    }
    I(() => {
      document.addEventListener("keydown", h);
    }), z(() => {
      document.removeEventListener("keydown", h);
    });
    const B = r(() => {
      const e = a.value.filter((n) => !n.leaving);
      return e.length > 0 ? e[e.length - 1].message : "";
    }), T = r(() => [
      "nm-toast-container",
      `nm-toast-container--${f.value}`
    ]);
    return (e, n) => (s(), P(S, { to: "body" }, [
      o("div", Q, g(B.value), 1),
      o("div", {
        class: _(T.value),
        style: $({ zIndex: M.value })
      }, [
        A(V, { name: "nm-toast-list" }, {
          default: Z(() => [
            (s(!0), l(j, null, D(d(a), (t) => F(e.$slots, "toast-item", {
              key: t.id,
              toast: t,
              remove: () => d(c)(t.id)
            }, () => [
              o("div", {
                class: _(["nm-toast", [`nm-toast--${t.type}`, { "nm-toast--leaving": t.leaving }]]),
                role: t.type === "error" || t.type === "warning" ? "alert" : "status"
              }, [
                o("span", W, [
                  t.type === "success" ? (s(), l("svg", X, [...n[0] || (n[0] = [
                    o("path", { d: "M5 13l4 4L19 7" }, null, -1)
                  ])])) : t.type === "error" ? (s(), l("svg", Y, [...n[1] || (n[1] = [
                    o("circle", {
                      cx: "12",
                      cy: "12",
                      r: "10"
                    }, null, -1),
                    o("path", { d: "M15 9l-6 6M9 9l6 6" }, null, -1)
                  ])])) : t.type === "warning" ? (s(), l("svg", ee, [...n[2] || (n[2] = [
                    o("path", { d: "M12 2L2 22h20L12 2zM12 9v4M12 17v1" }, null, -1)
                  ])])) : (s(), l("svg", te, [...n[3] || (n[3] = [
                    o("circle", {
                      cx: "12",
                      cy: "12",
                      r: "10"
                    }, null, -1),
                    o("path", { d: "M12 16v-4M12 8v-1" }, null, -1)
                  ])]))
                ]),
                o("span", oe, g(t.message), 1),
                t.closable ? (s(), l("button", {
                  key: 0,
                  class: "nm-toast__close",
                  "aria-label": C.value,
                  type: "button",
                  onClick: (re) => d(c)(t.id)
                }, [...n[4] || (n[4] = [
                  o("svg", {
                    width: "14",
                    height: "14",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    "stroke-width": "2"
                  }, [
                    o("path", { d: "M18 6L6 18M6 6l12 12" })
                  ], -1)
                ])], 8, ne)) : G("", !0)
              ], 10, R)
            ], !0)), 128))
          ]),
          _: 3
        })
      ], 6)
    ]));
  }
}), me = /* @__PURE__ */ O(se, [["__scopeId", "data-v-c4c51f97"]]);
export {
  me as N
};

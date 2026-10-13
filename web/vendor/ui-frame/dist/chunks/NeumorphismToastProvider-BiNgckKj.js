import { defineComponent as N, computed as r, provide as E, onMounted as I, onBeforeUnmount as z, openBlock as s, createBlock as P, Teleport as S, createElementVNode as n, toDisplayString as h, normalizeStyle as $, normalizeClass as g, createVNode as A, TransitionGroup as V, withCtx as Z, createElementBlock as l, Fragment as j, renderList as D, unref as c, renderSlot as F, createCommentVNode as G } from "vue";
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
  setup(_, { expose: k }) {
    const d = _, { config: u, resolveProp: m } = H(), y = r(
      () => {
        var t;
        return m(d.position, (t = u.value.toast) == null ? void 0 : t.position, "top-right");
      }
    ), f = r(
      () => {
        var t;
        return m(d.maxCount, (t = u.value.toast) == null ? void 0 : t.maxCount, 5);
      }
    ), { t: w } = q(), x = r(() => d.closeLabel || w("toastClose")), { getZIndex: C } = J(), L = r(() => C("toast")), p = K({
      maxCount: f.value
    });
    E(U, p);
    const { toasts: i, addToast: M, removeToast: a, clearAll: b } = p;
    k({ addToast: M, removeToast: a, clearAll: b, toasts: i });
    function v(t) {
      if (t.key !== "Escape") return;
      const e = i.value[i.value.length - 1];
      e && a(e.id);
    }
    I(() => {
      document.addEventListener("keydown", v);
    }), z(() => {
      document.removeEventListener("keydown", v);
    });
    const B = r(() => {
      const t = i.value.filter((e) => !e.leaving);
      return t.length > 0 ? t[t.length - 1].message : "";
    }), T = r(() => [
      "nm-toast-container",
      `nm-toast-container--${y.value}`
    ]);
    return (t, e) => (s(), P(S, { to: "body" }, [
      n("div", Q, h(B.value), 1),
      n("div", {
        class: g(T.value),
        style: $({ zIndex: L.value })
      }, [
        A(V, { name: "nm-toast-list" }, {
          default: Z(() => [
            (s(!0), l(j, null, D(c(i), (o) => F(t.$slots, "toast-item", {
              key: o.id,
              toast: o,
              remove: () => c(a)(o.id)
            }, () => [
              n("div", {
                class: g(["nm-toast", [`nm-toast--${o.type}`, { "nm-toast--leaving": o.leaving }]]),
                role: o.type === "error" || o.type === "warning" ? "alert" : "status"
              }, [
                n("span", W, [
                  o.type === "success" ? (s(), l("svg", X, [...e[0] || (e[0] = [
                    n("path", { d: "M5 13l4 4L19 7" }, null, -1)
                  ])])) : o.type === "error" ? (s(), l("svg", Y, [...e[1] || (e[1] = [
                    n("circle", {
                      cx: "12",
                      cy: "12",
                      r: "10"
                    }, null, -1),
                    n("path", { d: "M15 9l-6 6M9 9l6 6" }, null, -1)
                  ])])) : o.type === "warning" ? (s(), l("svg", ee, [...e[2] || (e[2] = [
                    n("path", { d: "M12 2L2 22h20L12 2zM12 9v4M12 17v1" }, null, -1)
                  ])])) : (s(), l("svg", te, [...e[3] || (e[3] = [
                    n("circle", {
                      cx: "12",
                      cy: "12",
                      r: "10"
                    }, null, -1),
                    n("path", { d: "M12 16v-4M12 8v-1" }, null, -1)
                  ])]))
                ]),
                n("span", oe, h(o.message), 1),
                o.closable ? (s(), l("button", {
                  key: 0,
                  class: "nm-toast__close",
                  "aria-label": x.value,
                  type: "button",
                  onClick: (re) => c(a)(o.id)
                }, [...e[4] || (e[4] = [
                  n("svg", {
                    width: "14",
                    height: "14",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    "stroke-width": "2"
                  }, [
                    n("path", { d: "M18 6L6 18M6 6l12 12" })
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
}), me = /* @__PURE__ */ O(se, [["__scopeId", "data-v-ab41658d"]]);
export {
  me as N
};

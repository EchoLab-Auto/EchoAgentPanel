import { defineComponent as b, computed as l, onMounted as B, onBeforeUnmount as N, openBlock as n, createBlock as T, Teleport as E, createElementVNode as o, normalizeStyle as I, normalizeClass as h, createVNode as z, TransitionGroup as P, withCtx as S, createElementBlock as r, Fragment as $, renderList as V, unref as d, renderSlot as Z, toDisplayString as A, createCommentVNode as D } from "vue";
import { useToast as F } from "../composables/useToast.js";
import { useLocale as G } from "../composables/useLocale.js";
import { u as U } from "./createComponent-jnXBYqCm.js";
import { useZIndex as j } from "../composables/useZIndex.js";
import { _ as q } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismToastProvider.css';const H = ["role"], J = { class: "nm-toast__icon" }, K = {
  key: 0,
  width: "18",
  height: "18",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2"
}, O = {
  key: 1,
  width: "18",
  height: "18",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2"
}, Q = {
  key: 2,
  width: "18",
  height: "18",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2"
}, R = {
  key: 3,
  width: "18",
  height: "18",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2"
}, W = { class: "nm-toast__message" }, X = ["aria-label", "onClick"], Y = /* @__PURE__ */ b({
  __name: "NeumorphismToastProvider",
  props: {
    position: {},
    maxCount: {},
    closeLabel: { default: "" }
  },
  setup(k, { expose: y }) {
    const i = k, { config: u, resolveProp: m } = U(), f = l(
      () => {
        var s;
        return m(i.position, (s = u.value.toast) == null ? void 0 : s.position, "top-right");
      }
    ), g = l(
      () => {
        var s;
        return m(i.maxCount, (s = u.value.toast) == null ? void 0 : s.maxCount, 5);
      }
    ), { t: _ } = G(), w = l(() => i.closeLabel || _("toastClose")), { getZIndex: x } = j(), C = l(() => x("toast")), { toasts: c, addToast: L, removeToast: a, clearAll: p } = F({
      maxCount: g.value
    });
    y({ addToast: L, removeToast: a, clearAll: p, toasts: c });
    function v(s) {
      s.key === "Escape" && p();
    }
    B(() => {
      document.addEventListener("keydown", v);
    }), N(() => {
      document.removeEventListener("keydown", v);
    });
    const M = l(() => [
      "nm-toast-container",
      `nm-toast-container--${f.value}`
    ]);
    return (s, t) => (n(), T(E, { to: "body" }, [
      t[5] || (t[5] = o("div", {
        "aria-live": "assertive",
        "aria-atomic": "true",
        class: "nm-sr-only"
      }, null, -1)),
      o("div", {
        class: h(M.value),
        style: I({ zIndex: C.value })
      }, [
        z(P, { name: "nm-toast-list" }, {
          default: S(() => [
            (n(!0), r($, null, V(d(c), (e) => Z(s.$slots, "toast-item", {
              key: e.id,
              toast: e,
              remove: () => d(a)(e.id)
            }, () => [
              o("div", {
                class: h(["nm-toast", [`nm-toast--${e.type}`, { "nm-toast--leaving": e.leaving }]]),
                role: e.type === "error" || e.type === "warning" ? "alert" : "status"
              }, [
                o("span", J, [
                  e.type === "success" ? (n(), r("svg", K, [...t[0] || (t[0] = [
                    o("path", { d: "M5 13l4 4L19 7" }, null, -1)
                  ])])) : e.type === "error" ? (n(), r("svg", O, [...t[1] || (t[1] = [
                    o("circle", {
                      cx: "12",
                      cy: "12",
                      r: "10"
                    }, null, -1),
                    o("path", { d: "M15 9l-6 6M9 9l6 6" }, null, -1)
                  ])])) : e.type === "warning" ? (n(), r("svg", Q, [...t[2] || (t[2] = [
                    o("path", { d: "M12 2L2 22h20L12 2zM12 9v4M12 17v1" }, null, -1)
                  ])])) : (n(), r("svg", R, [...t[3] || (t[3] = [
                    o("circle", {
                      cx: "12",
                      cy: "12",
                      r: "10"
                    }, null, -1),
                    o("path", { d: "M12 16v-4M12 8v-1" }, null, -1)
                  ])]))
                ]),
                o("span", W, A(e.message), 1),
                e.closable ? (n(), r("button", {
                  key: 0,
                  class: "nm-toast__close",
                  "aria-label": w.value,
                  type: "button",
                  onClick: (ee) => d(a)(e.id)
                }, [...t[4] || (t[4] = [
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
                ])], 8, X)) : D("", !0)
              ], 10, H)
            ], !0)), 128))
          ]),
          _: 3
        })
      ], 6)
    ]));
  }
}), ie = /* @__PURE__ */ q(Y, [["__scopeId", "data-v-39f45443"]]);
export {
  ie as N
};

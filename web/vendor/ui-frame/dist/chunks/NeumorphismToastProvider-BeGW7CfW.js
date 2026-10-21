import { defineComponent as P, computed as s, provide as S, onMounted as $, onBeforeUnmount as A, openBlock as t, createBlock as r, Teleport as V, createElementVNode as i, toDisplayString as y, normalizeStyle as Z, normalizeClass as f, createVNode as g, TransitionGroup as M, withCtx as j, createElementBlock as h, Fragment as D, renderList as F, unref as u, renderSlot as G, createCommentVNode as K } from "vue";
import { useToast as U, ToastInjectionKey as q } from "../composables/useToast.js";
import { useLocale as H } from "../composables/useLocale.js";
import { u as J } from "./createComponent-jnXBYqCm.js";
import { useZIndex as O } from "../composables/useZIndex.js";
import { N as l } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as Q } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismToastProvider.css';const R = {
  "aria-live": "assertive",
  "aria-atomic": "true",
  class: "nm-sr-only"
}, W = ["role"], X = { class: "nm-toast__icon" }, Y = { class: "nm-toast__message" }, ee = ["aria-label", "onClick"], oe = /* @__PURE__ */ P({
  __name: "NeumorphismToastProvider",
  props: {
    position: {},
    maxCount: {},
    closeLabel: { default: "" }
  },
  setup(k, { expose: x }) {
    const m = k, { config: p, resolveProp: d } = J(), C = s(
      () => {
        var e;
        return d(m.position, (e = p.value.toast) == null ? void 0 : e.position, "top-right");
      }
    ), b = s(
      () => {
        var e;
        return d(m.maxCount, (e = p.value.toast) == null ? void 0 : e.maxCount, 5);
      }
    ), { t: N } = H(), z = s(() => m.closeLabel || N("toastClose")), { getZIndex: L } = O(), T = s(() => L("toast")), v = U({
      maxCount: b.value
    });
    S(q, v);
    const { toasts: n, addToast: I, removeToast: c, clearAll: w } = v;
    x({ addToast: I, removeToast: c, clearAll: w, toasts: n });
    function _(e) {
      if (e.key !== "Escape") return;
      const a = n.value[n.value.length - 1];
      a && c(a.id);
    }
    $(() => {
      document.addEventListener("keydown", _);
    }), A(() => {
      document.removeEventListener("keydown", _);
    });
    const E = s(() => {
      const e = n.value.filter((a) => !a.leaving);
      return e.length > 0 ? e[e.length - 1].message : "";
    }), B = s(() => [
      "nm-toast-container",
      `nm-toast-container--${C.value}`
    ]);
    return (e, a) => (t(), r(V, { to: "body" }, [
      i("div", R, y(E.value), 1),
      i("div", {
        class: f(B.value),
        style: Z({ zIndex: T.value })
      }, [
        g(M, { name: "nm-toast-list" }, {
          default: j(() => [
            (t(!0), h(D, null, F(u(n), (o) => G(e.$slots, "toast-item", {
              key: o.id,
              toast: o,
              remove: () => u(c)(o.id)
            }, () => [
              i("div", {
                class: f(["nm-toast", [`nm-toast--${o.type}`, { "nm-toast--leaving": o.leaving }]]),
                role: o.type === "error" || o.type === "warning" ? "alert" : "status"
              }, [
                i("span", X, [
                  o.type === "success" ? (t(), r(l, {
                    key: 0,
                    name: "check",
                    size: "lg"
                  })) : o.type === "error" ? (t(), r(l, {
                    key: 1,
                    name: "circle-close",
                    size: "lg"
                  })) : o.type === "warning" ? (t(), r(l, {
                    key: 2,
                    name: "warning",
                    size: "lg"
                  })) : (t(), r(l, {
                    key: 3,
                    name: "circle-info",
                    size: "lg"
                  }))
                ]),
                i("span", Y, y(o.message), 1),
                o.closable ? (t(), h("button", {
                  key: 0,
                  class: "nm-toast__close",
                  "aria-label": z.value,
                  type: "button",
                  onClick: (te) => u(c)(o.id)
                }, [
                  g(l, {
                    name: "close",
                    size: "sm"
                  })
                ], 8, ee)) : K("", !0)
              ], 10, W)
            ], !0)), 128))
          ]),
          _: 3
        })
      ], 6)
    ]));
  }
}), me = /* @__PURE__ */ Q(oe, [["__scopeId", "data-v-1af9e09a"]]);
export {
  me as N
};

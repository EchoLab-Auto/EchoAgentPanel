import { defineComponent as T, computed as o, watch as V, openBlock as t, createBlock as $, Transition as A, withCtx as I, unref as E, createElementBlock as l, normalizeClass as D, renderSlot as _, Fragment as F, renderList as P, createCommentVNode as n, createElementVNode as c, toDisplayString as b } from "vue";
import { useLocale as j } from "../composables/useLocale.js";
import { useAlert as q } from "../composables/useAlert.js";
import { u as G } from "./createComponent-jnXBYqCm.js";
import { _ as H } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismAlert.css';const J = ["aria-live"], K = {
  key: 0,
  class: "nm-alert__icon",
  "aria-hidden": "true"
}, O = ["viewBox"], Q = ["d"], R = { class: "nm-alert__content" }, U = {
  key: 0,
  class: "nm-alert__title"
}, W = {
  key: 1,
  class: "nm-alert__message"
}, X = ["aria-label"], Y = /* @__PURE__ */ T({
  __name: "NeumorphismAlert",
  props: {
    type: {},
    title: { default: "" },
    message: { default: "" },
    closable: { type: Boolean, default: void 0 },
    duration: {},
    icon: { type: Boolean, default: void 0 },
    bordered: { type: Boolean, default: void 0 },
    size: {},
    closeLabel: { default: "" }
  },
  emits: ["close"],
  setup(i, { emit: y }) {
    const s = i, z = y, { config: a, resolveProp: r } = G(), u = o(
      () => {
        var e;
        return r(s.type, (e = a.value.alert) == null ? void 0 : e.type, "info");
      }
    ), B = o(
      () => {
        var e;
        return r(s.closable, (e = a.value.alert) == null ? void 0 : e.closable, !0);
      }
    ), v = o(
      () => {
        var e;
        return r(s.duration, (e = a.value.alert) == null ? void 0 : e.duration, 0);
      }
    ), g = o(() => {
      var e;
      return r(s.icon, (e = a.value.alert) == null ? void 0 : e.icon, !0);
    }), C = o(
      () => {
        var e;
        return r(s.bordered, (e = a.value.alert) == null ? void 0 : e.bordered, !0);
      }
    ), w = o(() => {
      var e;
      return r(s.size, (e = a.value.alert) == null ? void 0 : e.size, "medium");
    }), { t: k } = j(), L = o(() => s.closeLabel || k("alertClose")), { isVisible: d, close: m, leaving: h } = q({
      duration: v.value
    });
    V(v, (e) => {
      d.value && !h.value && e > 0 && setTimeout(() => m(), e);
    });
    function x() {
      m(), setTimeout(() => {
        z("close");
      }, 300);
    }
    const S = o(() => [
      "nm-alert",
      `nm-alert--${u.value}`,
      `nm-alert--${w.value}`,
      {
        "nm-alert--bordered": C.value,
        "nm-alert--leaving": h.value,
        "nm-alert--hidden": !d.value
      }
    ]), p = {
      info: {
        viewBox: "0 0 24 24",
        paths: [
          "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
        ]
      },
      success: {
        viewBox: "0 0 24 24",
        paths: [
          "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
        ]
      },
      warning: {
        viewBox: "0 0 24 24",
        paths: ["M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"]
      },
      error: {
        viewBox: "0 0 24 24",
        paths: [
          "M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"
        ]
      }
    };
    return (e, f) => (t(), $(A, { name: "nm-alert-fade" }, {
      default: I(() => [
        E(d) ? (t(), l("div", {
          key: 0,
          class: D(S.value),
          role: "alert",
          "aria-live": u.value === "error" ? "assertive" : "polite"
        }, [
          g.value ? (t(), l("div", K, [
            _(e.$slots, "icon", {}, () => [
              (t(), l("svg", {
                width: "20",
                height: "20",
                viewBox: p[u.value].viewBox,
                fill: "currentColor"
              }, [
                (t(!0), l(F, null, P(p[u.value].paths, (M, N) => (t(), l("path", {
                  key: N,
                  d: M
                }, null, 8, Q))), 128))
              ], 8, O))
            ], !0)
          ])) : n("", !0),
          c("div", R, [
            _(e.$slots, "default", {}, () => [
              i.title ? (t(), l("div", U, b(i.title), 1)) : n("", !0),
              i.message ? (t(), l("div", W, b(i.message), 1)) : n("", !0)
            ], !0)
          ]),
          B.value ? (t(), l("button", {
            key: 1,
            class: "nm-alert__close",
            "aria-label": L.value,
            type: "button",
            onClick: x
          }, [...f[0] || (f[0] = [
            c("svg", {
              width: "14",
              height: "14",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              "stroke-width": "2"
            }, [
              c("path", { d: "M18 6L6 18M6 6l12 12" })
            ], -1)
          ])], 8, X)) : n("", !0)
        ], 10, J)) : n("", !0)
      ]),
      _: 3
    }));
  }
}), se = /* @__PURE__ */ H(Y, [["__scopeId", "data-v-4de9b6bb"]]);
export {
  se as N
};

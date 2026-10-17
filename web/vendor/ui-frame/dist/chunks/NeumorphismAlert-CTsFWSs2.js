import { defineComponent as I, computed as t, watch as S, openBlock as s, createBlock as V, Transition as $, withCtx as w, unref as x, createElementBlock as n, normalizeClass as E, renderSlot as f, createVNode as p, createCommentVNode as i, createElementVNode as D, toDisplayString as _ } from "vue";
import { useLocale as O } from "../composables/useLocale.js";
import { useAlert as P } from "../composables/useAlert.js";
import { u as R } from "./createComponent-jnXBYqCm.js";
import { N as b } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as j } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismAlert.css';const q = ["aria-live"], F = {
  key: 0,
  class: "nm-alert__icon",
  "aria-hidden": "true"
}, G = { class: "nm-alert__content" }, H = {
  key: 0,
  class: "nm-alert__title"
}, J = {
  key: 1,
  class: "nm-alert__message"
}, K = ["aria-label"], M = /* @__PURE__ */ I({
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
  setup(r, { emit: h }) {
    const o = r, y = h, { config: l, resolveProp: a } = R(), c = t(
      () => {
        var e;
        return a(o.type, (e = l.value.alert) == null ? void 0 : e.type, "info");
      }
    ), g = t(
      () => {
        var e;
        return a(o.closable, (e = l.value.alert) == null ? void 0 : e.closable, !0);
      }
    ), d = t(
      () => {
        var e;
        return a(o.duration, (e = l.value.alert) == null ? void 0 : e.duration, 0);
      }
    ), k = t(() => {
      var e;
      return a(o.icon, (e = l.value.alert) == null ? void 0 : e.icon, !0);
    }), C = t(
      () => {
        var e;
        return a(o.bordered, (e = l.value.alert) == null ? void 0 : e.bordered, !0);
      }
    ), N = t(() => {
      var e;
      return a(o.size, (e = l.value.alert) == null ? void 0 : e.size, "medium");
    }), { t: z } = O(), B = t(() => o.closeLabel || z("alertClose")), { isVisible: u, close: m, leaving: v } = P({
      duration: d.value
    });
    S(d, (e) => {
      u.value && !v.value && e > 0 && setTimeout(() => m(), e);
    });
    function L() {
      m(), setTimeout(() => {
        y("close");
      }, 300);
    }
    const T = t(() => [
      "nm-alert",
      `nm-alert--${c.value}`,
      `nm-alert--${N.value}`,
      {
        "nm-alert--bordered": C.value,
        "nm-alert--leaving": v.value,
        "nm-alert--hidden": !u.value
      }
    ]), A = {
      info: "circle-info",
      success: "check",
      warning: "warning",
      error: "circle-close"
    };
    return (e, Q) => (s(), V($, { name: "nm-alert-fade" }, {
      default: w(() => [
        x(u) ? (s(), n("div", {
          key: 0,
          class: E(T.value),
          role: "alert",
          "aria-live": c.value === "error" ? "assertive" : "polite"
        }, [
          k.value ? (s(), n("div", F, [
            f(e.$slots, "icon", {}, () => [
              p(b, {
                name: A[c.value],
                size: "xl"
              }, null, 8, ["name"])
            ], !0)
          ])) : i("", !0),
          D("div", G, [
            f(e.$slots, "default", {}, () => [
              r.title ? (s(), n("div", H, _(r.title), 1)) : i("", !0),
              r.message ? (s(), n("div", J, _(r.message), 1)) : i("", !0)
            ], !0)
          ]),
          g.value ? (s(), n("button", {
            key: 1,
            class: "nm-alert__close",
            "aria-label": B.value,
            type: "button",
            onClick: L
          }, [
            p(b, {
              name: "close",
              size: "sm"
            })
          ], 8, K)) : i("", !0)
        ], 10, q)) : i("", !0)
      ]),
      _: 3
    }));
  }
}), te = /* @__PURE__ */ j(M, [["__scopeId", "data-v-eeb6c55d"]]);
export {
  te as N
};

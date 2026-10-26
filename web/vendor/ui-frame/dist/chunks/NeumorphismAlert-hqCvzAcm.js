import { defineComponent as I, computed as t, watch as V, openBlock as s, createBlock as $, Transition as x, withCtx as D, unref as P, createElementBlock as i, normalizeStyle as R, normalizeClass as F, renderSlot as _, createVNode as y, createCommentVNode as c, createElementVNode as O, toDisplayString as b } from "vue";
import { useLocale as U } from "../composables/useLocale.js";
import { useAlert as X } from "../composables/useAlert.js";
import { u as Z } from "./createComponent-jnXBYqCm.js";
import { n as j, r as q, A as G } from "./controlScales-CPj0Htdh.js";
import { N as h } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as H } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismAlert.css';const J = ["aria-live"], K = {
  key: 0,
  class: "nm-alert__icon",
  "aria-hidden": "true"
}, M = { class: "nm-alert__content" }, Q = {
  key: 0,
  class: "nm-alert__title"
}, W = {
  key: 1,
  class: "nm-alert__message"
}, Y = ["aria-label"], ee = 13, te = /* @__PURE__ */ I({
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
  setup(r, { emit: z }) {
    const o = r, C = z, { config: l, resolveProp: n } = Z(), u = t(
      () => {
        var e;
        return n(o.type, (e = l.value.alert) == null ? void 0 : e.type, "info");
      }
    ), g = t(
      () => {
        var e;
        return n(o.closable, (e = l.value.alert) == null ? void 0 : e.closable, !0);
      }
    ), v = t(
      () => {
        var e;
        return n(o.duration, (e = l.value.alert) == null ? void 0 : e.duration, 0);
      }
    ), N = t(() => {
      var e;
      return n(o.icon, (e = l.value.alert) == null ? void 0 : e.icon, !0);
    }), S = t(
      () => {
        var e;
        return n(o.bordered, (e = l.value.alert) == null ? void 0 : e.bordered, !0);
      }
    ), m = t(() => {
      var a;
      const e = o.size ?? ((a = l.value.alert) == null ? void 0 : a.size);
      return typeof e == "number" ? j(e, ee) : void 0;
    }), k = t(() => {
      var a;
      const e = o.size ?? ((a = l.value.alert) == null ? void 0 : a.size);
      return typeof e == "string" ? e : "medium";
    }), L = t(
      () => m.value === void 0 ? void 0 : q(G, m.value)
    ), { t: A } = U(), B = t(() => o.closeLabel || A("alertClose")), { isVisible: d, close: f, leaving: p } = X({
      duration: v.value
    });
    V(v, (e) => {
      d.value && !p.value && e > 0 && setTimeout(() => f(), e);
    });
    function E() {
      f(), setTimeout(() => {
        C("close");
      }, 300);
    }
    const T = t(() => [
      "nm-alert",
      `nm-alert--${u.value}`,
      m.value === void 0 ? `nm-alert--${k.value}` : "nm-alert--sized",
      {
        "nm-alert--bordered": S.value,
        "nm-alert--leaving": p.value,
        "nm-alert--hidden": !d.value
      }
    ]), w = {
      info: "circle-info",
      success: "check",
      warning: "warning",
      error: "circle-close"
    };
    return (e, a) => (s(), $(x, { name: "nm-alert-fade" }, {
      default: D(() => [
        P(d) ? (s(), i("div", {
          key: 0,
          class: F(T.value),
          style: R(L.value),
          role: "alert",
          "aria-live": u.value === "error" ? "assertive" : "polite"
        }, [
          N.value ? (s(), i("div", K, [
            _(e.$slots, "icon", {}, () => [
              y(h, {
                name: w[u.value],
                size: "xl"
              }, null, 8, ["name"])
            ], !0)
          ])) : c("", !0),
          O("div", M, [
            _(e.$slots, "default", {}, () => [
              r.title ? (s(), i("div", Q, b(r.title), 1)) : c("", !0),
              r.message ? (s(), i("div", W, b(r.message), 1)) : c("", !0)
            ], !0)
          ]),
          g.value ? (s(), i("button", {
            key: 1,
            class: "nm-alert__close",
            "aria-label": B.value,
            type: "button",
            onClick: E
          }, [
            y(h, {
              name: "close",
              size: "sm"
            })
          ], 8, Y)) : c("", !0)
        ], 14, J)) : c("", !0)
      ]),
      _: 3
    }));
  }
}), ce = /* @__PURE__ */ H(te, [["__scopeId", "data-v-13bcacca"]]);
export {
  ce as N
};

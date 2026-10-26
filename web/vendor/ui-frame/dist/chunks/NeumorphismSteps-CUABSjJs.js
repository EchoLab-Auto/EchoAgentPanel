import { defineComponent as D, computed as n, openBlock as c, createElementBlock as a, normalizeStyle as P, normalizeClass as u, Fragment as A, renderList as F, createElementVNode as h, toDisplayString as k, createBlock as z, createCommentVNode as p, renderSlot as T } from "vue";
import { useSteps as V } from "../composables/useSteps.js";
import { u as U } from "./createComponent-jnXBYqCm.js";
import { n as X, r as Z, g as j } from "./controlScales-CPj0Htdh.js";
import { N as C } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as q } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismSteps.css';const G = ["aria-current", "disabled", "onClick"], H = {
  key: 0,
  class: "nm-steps__number"
}, J = { class: "nm-steps__content" }, K = {
  key: 0,
  class: "nm-steps__description"
}, M = 36, O = /* @__PURE__ */ D({
  __name: "NeumorphismSteps",
  props: {
    steps: { default: () => [] },
    current: { default: 0 },
    direction: {},
    size: {},
    center: { type: Boolean, default: void 0 }
  },
  emits: ["update:current", "change", "stepClick"],
  setup(r, { emit: g }) {
    const o = r, _ = g, { config: v, resolveProp: f } = U(), N = n(
      () => {
        var e;
        return f(o.direction, (e = v.value.steps) == null ? void 0 : e.direction, "horizontal");
      }
    ), m = n(() => {
      var e;
      return f(o.size, (e = v.value.steps) == null ? void 0 : e.size, "medium");
    }), d = n(
      () => typeof m.value == "number" ? X(m.value, M) : void 0
    ), w = n(
      () => typeof m.value == "string" ? m.value : "medium"
    ), b = n(
      () => d.value === void 0 ? void 0 : Z(j, d.value)
    ), E = n(() => {
      var e;
      return f(o.center, (e = v.value.steps) == null ? void 0 : e.center, !1);
    }), $ = n({
      get: () => o.current,
      set: (e) => {
        _("update:current", e), _("change", e);
      }
    }), { setCurrent: B } = V({
      steps: n(() => o.steps),
      current: $
    });
    function s(e) {
      const i = o.steps[e];
      return i ? i.status ? i.status : e < o.current ? "finish" : e === o.current ? "process" : "wait" : "wait";
    }
    function I(e, i) {
      B(e), _("stepClick", i);
    }
    const L = n(() => [
      "nm-steps",
      `nm-steps--${N.value}`,
      // 数字与档位互斥：数字走 `--sized`（变量来自内联样式），字符串走档位类
      d.value === void 0 ? `nm-steps--${w.value}` : "nm-steps--sized",
      { "nm-steps--center": E.value }
    ]);
    function S(e) {
      return s(e) === "finish";
    }
    function y(e) {
      return s(e) === "error";
    }
    return (e, i) => (c(), a("div", {
      class: u(L.value),
      style: P(b.value),
      role: "list"
    }, [
      (c(!0), a(A, null, F(r.steps, (l, t) => (c(), a("div", {
        key: l.key,
        class: u([
          "nm-steps__item",
          {
            "nm-steps__item--active": t === r.current,
            "nm-steps__item--clickable": s(t) === "finish" || s(t) === "wait"
          }
        ]),
        role: "listitem"
      }, [
        h("button", {
          class: u(["nm-steps__circle", `nm-steps__circle--${s(t)}`]),
          type: "button",
          "aria-current": t === r.current ? "step" : void 0,
          disabled: s(t) !== "finish" && s(t) !== "wait" && t !== r.current,
          onClick: (Q) => I(t, l)
        }, [
          !S(t) && !y(t) ? (c(), a("span", H, k(t + 1), 1)) : S(t) ? (c(), z(C, {
            key: 1,
            name: "check",
            class: "nm-steps__icon nm-steps__icon--check",
            "stroke-width": 3
          })) : y(t) ? (c(), z(C, {
            key: 2,
            name: "close",
            class: "nm-steps__icon nm-steps__icon--error"
          })) : p("", !0)
        ], 10, G),
        t < r.steps.length - 1 ? (c(), a("div", {
          key: 0,
          class: u([
            "nm-steps__connector",
            {
              "nm-steps__connector--finished": s(t) === "finish",
              "nm-steps__connector--active": t === r.current
            }
          ])
        }, null, 2)) : p("", !0),
        h("div", J, [
          h("span", {
            class: u([
              "nm-steps__title",
              {
                "nm-steps__title--active": t === r.current,
                "nm-steps__title--finished": s(t) === "finish",
                "nm-steps__title--error": s(t) === "error"
              }
            ])
          }, k(l.title), 3),
          l.description ? (c(), a("span", K, k(l.description), 1)) : p("", !0)
        ])
      ], 2))), 128)),
      r.steps.length ? p("", !0) : T(e.$slots, "empty", {}, void 0, !0, 0)
    ], 6));
  }
}), se = /* @__PURE__ */ q(O, [["__scopeId", "data-v-d289d70a"]]);
export {
  se as N
};

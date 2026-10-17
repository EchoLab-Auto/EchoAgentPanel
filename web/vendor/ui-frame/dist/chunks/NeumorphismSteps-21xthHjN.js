import { defineComponent as E, computed as i, openBlock as c, createElementBlock as u, normalizeClass as l, Fragment as I, renderList as D, createElementVNode as h, toDisplayString as d, createBlock as y, createCommentVNode as m, renderSlot as L } from "vue";
import { useSteps as V } from "../composables/useSteps.js";
import { u as F } from "./createComponent-jnXBYqCm.js";
import { N as C } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as P } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismSteps.css';const j = ["aria-current", "disabled", "onClick"], q = {
  key: 0,
  class: "nm-steps__number"
}, A = { class: "nm-steps__content" }, G = {
  key: 0,
  class: "nm-steps__description"
}, H = /* @__PURE__ */ E({
  __name: "NeumorphismSteps",
  props: {
    steps: { default: () => [] },
    current: { default: 0 },
    direction: {},
    size: {},
    center: { type: Boolean, default: void 0 }
  },
  emits: ["update:current", "change", "stepClick"],
  setup(r, { emit: S }) {
    const n = r, p = S, { config: _, resolveProp: f } = F(), g = i(
      () => {
        var e;
        return f(n.direction, (e = _.value.steps) == null ? void 0 : e.direction, "horizontal");
      }
    ), N = i(() => {
      var e;
      return f(n.size, (e = _.value.steps) == null ? void 0 : e.size, "medium");
    }), w = i(() => {
      var e;
      return f(n.center, (e = _.value.steps) == null ? void 0 : e.center, !1);
    }), b = i({
      get: () => n.current,
      set: (e) => {
        p("update:current", e), p("change", e);
      }
    }), { setCurrent: z } = V({
      steps: i(() => n.steps),
      current: b
    });
    function s(e) {
      const o = n.steps[e];
      return o ? o.status ? o.status : e < n.current ? "finish" : e === n.current ? "process" : "wait" : "wait";
    }
    function $(e, o) {
      z(e), p("stepClick", o);
    }
    const B = i(() => [
      "nm-steps",
      `nm-steps--${g.value}`,
      `nm-steps--${N.value}`,
      { "nm-steps--center": w.value }
    ]);
    function v(e) {
      return s(e) === "finish";
    }
    function k(e) {
      return s(e) === "error";
    }
    return (e, o) => (c(), u("div", {
      class: l(B.value),
      role: "list"
    }, [
      (c(!0), u(I, null, D(r.steps, (a, t) => (c(), u("div", {
        key: a.key,
        class: l([
          "nm-steps__item",
          {
            "nm-steps__item--active": t === r.current,
            "nm-steps__item--clickable": s(t) === "finish" || s(t) === "wait"
          }
        ]),
        role: "listitem"
      }, [
        h("button", {
          class: l(["nm-steps__circle", `nm-steps__circle--${s(t)}`]),
          type: "button",
          "aria-current": t === r.current ? "step" : void 0,
          disabled: s(t) !== "finish" && s(t) !== "wait" && t !== r.current,
          onClick: (J) => $(t, a)
        }, [
          !v(t) && !k(t) ? (c(), u("span", q, d(t + 1), 1)) : v(t) ? (c(), y(C, {
            key: 1,
            name: "check",
            class: "nm-steps__icon nm-steps__icon--check",
            "stroke-width": 3
          })) : k(t) ? (c(), y(C, {
            key: 2,
            name: "close",
            class: "nm-steps__icon nm-steps__icon--error"
          })) : m("", !0)
        ], 10, j),
        t < r.steps.length - 1 ? (c(), u("div", {
          key: 0,
          class: l([
            "nm-steps__connector",
            {
              "nm-steps__connector--finished": s(t) === "finish",
              "nm-steps__connector--active": t === r.current
            }
          ])
        }, null, 2)) : m("", !0),
        h("div", A, [
          h("span", {
            class: l([
              "nm-steps__title",
              {
                "nm-steps__title--active": t === r.current,
                "nm-steps__title--finished": s(t) === "finish",
                "nm-steps__title--error": s(t) === "error"
              }
            ])
          }, d(a.title), 3),
          a.description ? (c(), u("span", G, d(a.description), 1)) : m("", !0)
        ])
      ], 2))), 128)),
      r.steps.length ? m("", !0) : L(e.$slots, "empty", {}, void 0, !0, 0)
    ], 2));
  }
}), T = /* @__PURE__ */ P(H, [["__scopeId", "data-v-79cdfe8f"]]);
export {
  T as N
};

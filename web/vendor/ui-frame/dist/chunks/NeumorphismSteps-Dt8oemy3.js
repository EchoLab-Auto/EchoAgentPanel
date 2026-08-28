import { defineComponent as B, computed as l, openBlock as i, createElementBlock as c, normalizeClass as p, Fragment as $, renderList as E, createElementVNode as u, toDisplayString as v, createCommentVNode as m, renderSlot as D } from "vue";
import { useSteps as I } from "../composables/useSteps.js";
import { u as L } from "./createComponent-jnXBYqCm.js";
import { _ as V } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismSteps.css';const j = ["aria-current", "disabled", "onClick"], F = {
  key: 0,
  class: "nm-steps__number"
}, P = {
  key: 1,
  class: "nm-steps__icon nm-steps__icon--check",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "3",
  "stroke-linecap": "round",
  "stroke-linejoin": "round"
}, q = {
  key: 2,
  class: "nm-steps__icon nm-steps__icon--error",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2.5",
  "stroke-linecap": "round"
}, A = { class: "nm-steps__content" }, G = {
  key: 0,
  class: "nm-steps__description"
}, H = /* @__PURE__ */ B({
  __name: "NeumorphismSteps",
  props: {
    steps: { default: () => [] },
    current: { default: 0 },
    direction: {},
    size: {},
    center: { type: Boolean, default: void 0 }
  },
  emits: ["update:current", "change", "stepClick"],
  setup(r, { emit: y }) {
    const o = r, _ = y, { config: f, resolveProp: d } = L(), C = l(
      () => {
        var e;
        return d(o.direction, (e = f.value.steps) == null ? void 0 : e.direction, "horizontal");
      }
    ), g = l(() => {
      var e;
      return d(o.size, (e = f.value.steps) == null ? void 0 : e.size, "medium");
    }), w = l(() => {
      var e;
      return d(o.center, (e = f.value.steps) == null ? void 0 : e.center, !1);
    }), S = l({
      get: () => o.current,
      set: (e) => {
        _("update:current", e), _("change", e);
      }
    }), { setCurrent: b } = I({
      steps: l(() => o.steps),
      current: S
    });
    function s(e) {
      const n = o.steps[e];
      return n ? n.status ? n.status : e < o.current ? "finish" : e === o.current ? "process" : "wait" : "wait";
    }
    function z(e, n) {
      b(e), _("stepClick", n);
    }
    const N = l(() => [
      "nm-steps",
      `nm-steps--${C.value}`,
      `nm-steps--${g.value}`,
      { "nm-steps--center": w.value }
    ]);
    function h(e) {
      return s(e) === "finish";
    }
    function k(e) {
      return s(e) === "error";
    }
    return (e, n) => (i(), c("div", {
      class: p(N.value),
      role: "list"
    }, [
      (i(!0), c($, null, E(r.steps, (a, t) => (i(), c("div", {
        key: a.key,
        class: p([
          "nm-steps__item",
          {
            "nm-steps__item--active": t === r.current,
            "nm-steps__item--clickable": s(t) === "finish" || s(t) === "wait"
          }
        ]),
        role: "listitem"
      }, [
        u("button", {
          class: p(["nm-steps__circle", `nm-steps__circle--${s(t)}`]),
          type: "button",
          "aria-current": t === r.current ? "step" : void 0,
          disabled: s(t) !== "finish" && s(t) !== "wait" && t !== r.current,
          onClick: (J) => z(t, a)
        }, [
          !h(t) && !k(t) ? (i(), c("span", F, v(t + 1), 1)) : h(t) ? (i(), c("svg", P, [...n[0] || (n[0] = [
            u("polyline", { points: "20 6 9 17 4 12" }, null, -1)
          ])])) : k(t) ? (i(), c("svg", q, [...n[1] || (n[1] = [
            u("line", {
              x1: "18",
              y1: "6",
              x2: "6",
              y2: "18"
            }, null, -1),
            u("line", {
              x1: "6",
              y1: "6",
              x2: "18",
              y2: "18"
            }, null, -1)
          ])])) : m("", !0)
        ], 10, j),
        t < r.steps.length - 1 ? (i(), c("div", {
          key: 0,
          class: p([
            "nm-steps__connector",
            {
              "nm-steps__connector--finished": s(t) === "finish",
              "nm-steps__connector--active": t === r.current
            }
          ])
        }, null, 2)) : m("", !0),
        u("div", A, [
          u("span", {
            class: p([
              "nm-steps__title",
              {
                "nm-steps__title--active": t === r.current,
                "nm-steps__title--finished": s(t) === "finish",
                "nm-steps__title--error": s(t) === "error"
              }
            ])
          }, v(a.title), 3),
          a.description ? (i(), c("span", G, v(a.description), 1)) : m("", !0)
        ])
      ], 2))), 128)),
      r.steps.length ? m("", !0) : D(e.$slots, "empty", { key: 0 }, void 0, !0)
    ], 2));
  }
}), R = /* @__PURE__ */ V(H, [["__scopeId", "data-v-c6f6b267"]]);
export {
  R as N
};

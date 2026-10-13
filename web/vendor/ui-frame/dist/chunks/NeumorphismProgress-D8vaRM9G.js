import { defineComponent as E, computed as o, toRef as p, openBlock as l, createElementBlock as i, normalizeStyle as x, unref as e, normalizeClass as k, Fragment as w, createElementVNode as c, toDisplayString as b, createCommentVNode as $ } from "vue";
import { useLocale as I } from "../composables/useLocale.js";
import D from "../composables/useProgress.js";
import { u as F } from "./createComponent-jnXBYqCm.js";
import { _ as O } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismProgress.css';const R = ["aria-valuenow", "aria-valuemax", "aria-busy", "aria-valuetext", "aria-label"], W = { class: "nm-progress__track" }, j = {
  key: 0,
  class: "nm-progress__label"
}, q = ["width", "height", "viewBox"], A = ["cx", "cy", "r", "stroke-width"], G = ["cx", "cy", "r", "stroke-width", "stroke-dasharray", "stroke-dashoffset"], H = {
  key: 0,
  class: "nm-progress-circle__label"
}, J = /* @__PURE__ */ E({
  __name: "NeumorphismProgress",
  props: {
    modelValue: { default: 0 },
    max: { default: 100 },
    variant: {},
    size: {},
    type: {},
    showLabel: { type: Boolean, default: void 0 },
    indeterminate: { type: Boolean, default: !1 },
    effect: {}
  },
  setup(s) {
    const t = s, { config: n, resolveProp: m } = F(), d = o(
      () => {
        var r;
        return m(t.variant, (r = n.value.progress) == null ? void 0 : r.variant, "primary");
      }
    ), f = o(() => {
      var r;
      return m(t.size, (r = n.value.progress) == null ? void 0 : r.size, "medium");
    }), u = o(
      () => {
        var r;
        return m(t.showLabel, (r = n.value.progress) == null ? void 0 : r.showLabel, !1);
      }
    ), z = o(
      () => {
        var r;
        return t.effect ?? ((r = n.value.progress) == null ? void 0 : r.effect) ?? "default";
      }
    ), { t: g } = I(), {
      percentage: S,
      isComplete: L,
      displayPercentage: v,
      circleSize: a,
      strokeWidth: h,
      radius: y,
      circumference: _,
      dashOffset: V
    } = D({
      modelValue: p(t, "modelValue"),
      max: p(t, "max"),
      indeterminate: p(t, "indeterminate"),
      size: f
    }), B = o(() => [
      "nm-progress",
      `nm-progress--${f.value}`,
      `nm-progress--${d.value}`,
      `nm-progress--effect-${z.value}`,
      {
        "nm-progress--indeterminate": t.indeterminate,
        "nm-progress--complete": L.value
      }
    ]), N = {
      default: "var(--nm-text-secondary)",
      primary: "var(--nm-primary-color)",
      success: "var(--nm-color-success)",
      warning: "var(--nm-color-warning)",
      error: "var(--nm-color-error)"
    }, C = o(() => ({
      width: t.indeterminate ? "40%" : `${S.value}%`,
      "--nm-progress-bar-color": N[d.value]
    })), P = o(() => ({
      width: `${a.value}px`,
      height: `${a.value}px`,
      "--nm-progress-c": `${_.value}px`
    }));
    return (r, K) => (l(), i("div", {
      class: k([...B.value, ...s.type === "circle" ? ["nm-progress--circle"] : []]),
      role: "progressbar",
      "aria-valuenow": s.indeterminate ? void 0 : s.modelValue,
      "aria-valuemin": "0",
      "aria-valuemax": s.max,
      "aria-busy": s.indeterminate || void 0,
      "aria-valuetext": s.indeterminate ? e(g)("progressIndeterminate") : void 0,
      "aria-label": u.value ? void 0 : e(g)("progressLabel", { percentage: e(v) }),
      style: x(s.type === "circle" ? P.value : void 0)
    }, [
      s.type !== "circle" ? (l(), i(w, { key: 0 }, [
        c("div", W, [
          c("div", {
            class: "nm-progress__bar",
            style: x(C.value)
          }, null, 4)
        ]),
        u.value ? (l(), i("span", j, b(e(v)) + "%", 1)) : $("", !0)
      ], 64)) : (l(), i(w, { key: 1 }, [
        (l(), i("svg", {
          class: "nm-progress-circle__svg",
          width: e(a),
          height: e(a),
          viewBox: `0 0 ${e(a)} ${e(a)}`
        }, [
          c("circle", {
            cx: e(a) / 2,
            cy: e(a) / 2,
            r: e(y),
            fill: "none",
            "stroke-width": e(h),
            class: "nm-progress-circle__track"
          }, null, 8, A),
          c("circle", {
            cx: e(a) / 2,
            cy: e(a) / 2,
            r: e(y),
            fill: "none",
            "stroke-width": e(h),
            "stroke-dasharray": e(_),
            "stroke-dashoffset": e(V),
            "stroke-linecap": "round",
            class: k([
              "nm-progress-circle__fill",
              {
                "nm-progress-circle__fill--indeterminate": s.indeterminate,
                [`nm-progress-circle__fill--${d.value}`]: !0
              }
            ])
          }, null, 10, G)
        ], 8, q)),
        u.value ? (l(), i("span", H, b(e(v)) + "%", 1)) : $("", !0)
      ], 64))
    ], 14, R));
  }
}), Y = /* @__PURE__ */ O(J, [["__scopeId", "data-v-cc1bb84c"]]);
export {
  Y as N
};

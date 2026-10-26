import { defineComponent as F, computed as s, toRef as g, openBlock as l, createElementBlock as i, normalizeStyle as S, unref as e, normalizeClass as k, Fragment as b, createElementVNode as u, toDisplayString as z, createCommentVNode as $ } from "vue";
import { useLocale as O } from "../composables/useLocale.js";
import G from "../composables/useProgress.js";
import { u as T } from "./createComponent-jnXBYqCm.js";
import { n as U, r as W, e as X } from "./controlScales-CPj0Htdh.js";
import { _ as Z } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismProgress.css';const j = ["aria-valuenow", "aria-valuemax", "aria-busy", "aria-valuetext", "aria-label"], q = { class: "nm-progress__track" }, H = {
  key: 0,
  class: "nm-progress__label"
}, J = ["width", "height", "viewBox"], K = ["cx", "cy", "r", "stroke-width"], M = ["cx", "cy", "r", "stroke-width", "stroke-dasharray", "stroke-dashoffset"], Q = {
  key: 0,
  class: "nm-progress-circle__label"
}, Y = 8, ee = /* @__PURE__ */ F({
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
  setup(t) {
    const a = t, { config: n, resolveProp: d } = T(), c = s(
      () => {
        var r;
        return d(a.size, (r = n.value.progress) == null ? void 0 : r.size, "medium");
      }
    ), m = s(
      () => typeof c.value == "number" ? U(c.value, Y) : void 0
    ), h = s(
      () => typeof c.value == "string" ? c.value : "medium"
    ), L = s(
      () => m.value === void 0 ? void 0 : W(X, m.value)
    ), C = s(() => m.value ?? h.value), v = s(
      () => {
        var r;
        return d(a.variant, (r = n.value.progress) == null ? void 0 : r.variant, "primary");
      }
    ), p = s(
      () => {
        var r;
        return d(a.showLabel, (r = n.value.progress) == null ? void 0 : r.showLabel, !1);
      }
    ), E = s(
      () => {
        var r;
        return a.effect ?? ((r = n.value.progress) == null ? void 0 : r.effect) ?? "default";
      }
    ), { t: y } = O(), {
      percentage: N,
      isComplete: P,
      displayPercentage: f,
      circleSize: o,
      strokeWidth: _,
      radius: x,
      circumference: w,
      dashOffset: V
    } = G({
      modelValue: g(a, "modelValue"),
      max: g(a, "max"),
      indeterminate: g(a, "indeterminate"),
      size: C
    }), B = s(() => [
      "nm-progress",
      // 数字与档位互斥：数字走 `--sized`（变量来自内联样式），字符串走档位类
      m.value === void 0 ? `nm-progress--${h.value}` : "nm-progress--sized",
      `nm-progress--${v.value}`,
      `nm-progress--effect-${E.value}`,
      {
        "nm-progress--indeterminate": a.indeterminate,
        "nm-progress--complete": P.value
      }
    ]), I = {
      default: "var(--nm-text-secondary)",
      primary: "var(--nm-primary-color)",
      success: "var(--nm-color-success)",
      warning: "var(--nm-color-warning)",
      error: "var(--nm-color-error)"
    }, R = s(() => ({
      width: a.indeterminate ? "40%" : `${N.value}%`,
      "--nm-progress-bar-color": I[v.value]
    })), A = s(() => ({
      width: `${o.value}px`,
      height: `${o.value}px`,
      "--nm-progress-c": `${w.value}px`
    })), D = s(() => ({
      ...L.value ?? {},
      ...a.type === "circle" ? A.value : {}
    }));
    return (r, re) => (l(), i("div", {
      class: k([...B.value, ...t.type === "circle" ? ["nm-progress--circle"] : []]),
      role: "progressbar",
      "aria-valuenow": t.indeterminate ? void 0 : t.modelValue,
      "aria-valuemin": "0",
      "aria-valuemax": t.max,
      "aria-busy": t.indeterminate || void 0,
      "aria-valuetext": t.indeterminate ? e(y)("progressIndeterminate") : void 0,
      "aria-label": p.value ? void 0 : e(y)("progressLabel", { percentage: e(f) }),
      style: S(D.value)
    }, [
      t.type !== "circle" ? (l(), i(b, { key: 0 }, [
        u("div", q, [
          u("div", {
            class: "nm-progress__bar",
            style: S(R.value)
          }, null, 4)
        ]),
        p.value ? (l(), i("span", H, z(e(f)) + "%", 1)) : $("", !0)
      ], 64)) : (l(), i(b, { key: 1 }, [
        (l(), i("svg", {
          class: "nm-progress-circle__svg",
          width: e(o),
          height: e(o),
          viewBox: `0 0 ${e(o)} ${e(o)}`
        }, [
          u("circle", {
            cx: e(o) / 2,
            cy: e(o) / 2,
            r: e(x),
            fill: "none",
            "stroke-width": e(_),
            class: "nm-progress-circle__track"
          }, null, 8, K),
          u("circle", {
            cx: e(o) / 2,
            cy: e(o) / 2,
            r: e(x),
            fill: "none",
            "stroke-width": e(_),
            "stroke-dasharray": e(w),
            "stroke-dashoffset": e(V),
            "stroke-linecap": "round",
            class: k([
              "nm-progress-circle__fill",
              {
                "nm-progress-circle__fill--indeterminate": t.indeterminate,
                [`nm-progress-circle__fill--${v.value}`]: !0
              }
            ])
          }, null, 10, M)
        ], 8, J)),
        p.value ? (l(), i("span", Q, z(e(f)) + "%", 1)) : $("", !0)
      ], 64))
    ], 14, j));
  }
}), ne = /* @__PURE__ */ Z(ee, [["__scopeId", "data-v-7ef64b85"]]);
export {
  ne as N
};

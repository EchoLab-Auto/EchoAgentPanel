import { computed as e, ref as _, watch as g, getCurrentInstance as y, onBeforeUnmount as P } from "vue";
import z from "./useReducedMotion.js";
import { p as L, i as I, n as F, C as k } from "../chunks/controlScales-CPj0Htdh.js";
const a = k.progress, x = { small: 0, medium: 1, large: 2 }, H = a.primary.md, U = a.metrics["--nm-progress-sz-circle"], q = a.metrics["--nm-progress-sz-stroke"], B = 650;
function D(i) {
  return 1 - Math.pow(1 - i, 3);
}
function V(i) {
  const { modelValue: R, max: c, indeterminate: l, size: S } = i, { isReducedMotion: m } = z(), t = e(() => l.value || c.value <= 0 ? 0 : Math.min(100, Math.max(0, R.value / c.value * 100))), h = e(() => !l.value && t.value >= 100), r = _(t.value);
  let o = null;
  function f() {
    o !== null && typeof window < "u" && (window.cancelAnimationFrame(o), o = null);
  }
  g(t, (n) => {
    if (f(), m.value || typeof window > "u") {
      r.value = n;
      return;
    }
    const u = r.value;
    if (u === n) return;
    const N = performance.now(), O = (T) => {
      const C = Math.min(1, (T - N) / B);
      r.value = u + (n - u) * D(C), o = C < 1 ? window.requestAnimationFrame(O) : null;
    };
    o = window.requestAnimationFrame(O);
  });
  const E = e(() => Math.round(r.value)), d = e(() => {
    const n = S.value;
    return typeof n == "string" ? x[n] ?? 1 : L(a.primary, F(n, H));
  }), p = e(() => I(U, d.value)), v = e(() => I(q, d.value)), w = e(() => (p.value - v.value) / 2), s = e(() => 2 * Math.PI * w.value), M = e(
    () => s.value - t.value / 100 * s.value
  );
  function A() {
    f();
  }
  return y() && P(A), {
    percentage: t,
    isComplete: h,
    displayPercentage: E,
    isReducedMotion: m,
    circleSize: p,
    strokeWidth: v,
    radius: w,
    circumference: s,
    dashOffset: M,
    stop: A
  };
}
export {
  V as default,
  V as useProgress
};

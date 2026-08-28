import { computed as e, ref as R, watch as g, getCurrentInstance as y, onBeforeUnmount as E } from "vue";
import T from "./useReducedMotion.js";
const x = {
  small: 64,
  medium: 120,
  large: 160
}, F = {
  small: 4,
  medium: 7,
  large: 10
}, L = 650;
function N(a) {
  return 1 - Math.pow(1 - a, 3);
}
function q(a) {
  const { modelValue: h, max: r, indeterminate: c, size: s } = a, { isReducedMotion: m } = T(), n = e(() => c.value || r.value <= 0 ? 0 : Math.min(100, Math.max(0, h.value / r.value * 100))), I = e(() => !c.value && n.value >= 100), o = R(n.value);
  let t = null;
  function d() {
    t !== null && typeof window < "u" && (window.cancelAnimationFrame(t), t = null);
  }
  g(n, (i) => {
    if (d(), m.value || typeof window > "u") {
      o.value = i;
      return;
    }
    const l = o.value;
    if (l === i) return;
    const O = performance.now(), M = (P) => {
      const A = Math.min(1, (P - O) / L);
      o.value = l + (i - l) * N(A), t = A < 1 ? window.requestAnimationFrame(M) : null;
    };
    t = window.requestAnimationFrame(M);
  });
  const _ = e(() => Math.round(o.value)), f = e(() => x[s.value]), v = e(() => F[s.value]), p = e(() => (f.value - v.value) / 2), u = e(() => 2 * Math.PI * p.value), C = e(
    () => u.value - n.value / 100 * u.value
  );
  function w() {
    d();
  }
  return y() && E(w), {
    percentage: n,
    isComplete: I,
    displayPercentage: _,
    isReducedMotion: m,
    circleSize: f,
    strokeWidth: v,
    radius: p,
    circumference: u,
    dashOffset: C,
    stop: w
  };
}
export {
  q as default,
  q as useProgress
};

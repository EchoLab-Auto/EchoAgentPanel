import { ref as g, onMounted as F, nextTick as U, onBeforeUnmount as R, computed as M } from "vue";
import { u as V } from "../chunks/createComponent-jnXBYqCm.js";
import _ from "./useReducedMotion.js";
const $ = { top: 24, right: 24, bottom: 40, left: 48 }, H = [
  "--nm-chart-color-1",
  "--nm-chart-color-2",
  "--nm-chart-color-3",
  "--nm-chart-color-4",
  "--nm-chart-color-5",
  "--nm-chart-color-6"
];
function W(A) {
  const { containerRef: p, series: w, margin: k } = A, { config: S, resolveProp: T } = V(), d = g({
    width: 400,
    height: 300
  });
  let u = null;
  function D() {
    if (!p.value) return;
    const t = p.value, e = getComputedStyle(t), a = parseFloat(e.paddingLeft) || 0, i = parseFloat(e.paddingRight) || 0, n = parseFloat(e.paddingTop) || 0, o = parseFloat(e.paddingBottom) || 0, c = t.clientWidth - a - i, l = t.clientHeight - n - o;
    c > 0 && l > 0 && (d.value = { width: c, height: l });
  }
  F(() => {
    U(() => {
      D();
    }), p.value && (u = new ResizeObserver((t) => {
      const e = t[0];
      if (!e) return;
      const { width: a, height: i } = e.contentRect;
      a > 0 && i > 0 && (d.value = { width: a, height: i });
    }), u.observe(p.value));
  }), R(() => {
    u == null || u.disconnect(), u = null;
  });
  const f = M(() => k ?? $), E = M(() => ({
    width: Math.max(
      0,
      d.value.width - f.value.left - f.value.right
    ),
    height: Math.max(
      0,
      d.value.height - f.value.top - f.value.bottom
    )
  })), b = g("");
  let s = null;
  const C = M(() => {
    if (b.value, typeof document > "u") return [];
    const t = getComputedStyle(document.documentElement);
    return H.map((e) => t.getPropertyValue(e).trim()).filter(
      Boolean
    );
  });
  F(() => {
    typeof document > "u" || (b.value = document.documentElement.getAttribute("data-theme") ?? "", s = new MutationObserver(() => {
      b.value = document.documentElement.getAttribute("data-theme") ?? "";
    }), s.observe(document.documentElement, {
      attributes: !0,
      attributeFilter: ["data-theme"]
    }));
  }), R(() => {
    s == null || s.disconnect(), s = null;
  });
  const x = g({
    visible: !1,
    x: 0,
    y: 0,
    content: "",
    dataIndex: -1,
    seriesIndex: -1
  });
  function I(t, e, a, i) {
    const n = w.value[e];
    if (!n) return;
    const o = n.data[t];
    if (!o) return;
    const c = o.label ?? "", l = o.value, m = n.name;
    x.value = {
      visible: !0,
      x: a,
      y: i,
      content: `${m}: ${c ? c + " " : ""}${l}`,
      dataIndex: t,
      seriesIndex: e
    };
  }
  function L() {
    x.value = {
      visible: !1,
      x: 0,
      y: 0,
      content: "",
      dataIndex: -1,
      seriesIndex: -1
    };
  }
  const r = g(-1), v = M(() => {
    const t = w.value;
    return !t || t.length === 0 ? 0 : Math.max(...t.map((e) => e.data.length));
  });
  function h(t) {
    if (v.value === 0) {
      r.value = -1;
      return;
    }
    r.value = Math.max(0, Math.min(t, v.value - 1));
  }
  function z(t) {
    const e = v.value;
    if (e !== 0)
      switch (t.key) {
        case "ArrowLeft":
          t.preventDefault(), h(r.value <= 0 ? e - 1 : r.value - 1);
          break;
        case "ArrowRight":
          t.preventDefault(), h(r.value >= e - 1 ? 0 : r.value + 1);
          break;
        case "Home":
          t.preventDefault(), h(0);
          break;
        case "End":
          t.preventDefault(), h(e - 1);
          break;
      }
  }
  const { isReducedMotion: B } = _();
  function y(t, e) {
    const a = Math.max(t, 1e-10), i = Math.floor(Math.log10(a)), n = a / Math.pow(10, i);
    let o;
    return e ? n < 1.5 ? o = 1 : n < 3 ? o = 2 : n < 7 ? o = 5 : o = 10 : n <= 1 ? o = 1 : n <= 2 ? o = 2 : n <= 5 ? o = 5 : o = 10, o * Math.pow(10, i);
  }
  function N(t, e, a = 5) {
    const i = y(e - t, !1), n = y(i / (a - 1), !0), o = Math.floor(t / n) * n, c = Math.ceil(e / n) * n, l = [];
    for (let m = o; m <= c + n * 0.5; m += n)
      l.push(Math.round(m * 1e10) / 1e10);
    return l;
  }
  function P(t) {
    return t >= 1e6 ? (t / 1e6).toFixed(1) + "M" : t >= 1e3 ? (t / 1e3).toFixed(1) + "K" : String(t);
  }
  return {
    containerSize: d,
    plotSize: E,
    palette: C,
    tooltip: x,
    focusedIndex: r,
    totalDataPoints: v,
    setFocusedIndex: h,
    handleChartKeydown: z,
    reducedMotion: B,
    resolvedMargin: f,
    config: S,
    resolveProp: T,
    showTooltip: I,
    hideTooltip: L,
    niceTicks: N,
    formatValue: P
  };
}
export {
  W as useChart
};

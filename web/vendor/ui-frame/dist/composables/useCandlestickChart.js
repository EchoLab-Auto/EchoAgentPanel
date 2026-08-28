import { computed as n } from "vue";
import { useChart as to } from "./useChart.js";
import { buildSmoothPath as eo } from "./chartPath.js";
function ro(m) {
  const {
    containerRef: h,
    data: r,
    margin: w,
    showVolume: p = !0,
    showMA: U = !0,
    maPeriods: $,
    upColor: N,
    downColor: F
  } = m, j = n(() => [
    {
      name: "price",
      data: r.value.map((o) => ({
        label: o.date,
        value: o.close
      }))
    }
  ]), a = to({
    containerRef: h,
    series: j,
    margin: w
  }), A = n(
    () => {
      var o, t;
      return a.resolveProp(N, (t = (o = a.config.value.chart) == null ? void 0 : o.candlestick) == null ? void 0 : t.upColor, void 0) ?? "var(--nm-chart-up-color)";
    }
  ), k = n(
    () => {
      var o, t;
      return a.resolveProp(F, (t = (o = a.config.value.chart) == null ? void 0 : o.candlestick) == null ? void 0 : t.downColor, void 0) ?? "var(--nm-chart-down-color)";
    }
  ), b = n(() => p), P = n(() => U), Y = n(
    () => {
      var o, t;
      return $ ?? ((t = (o = a.config.value.chart) == null ? void 0 : o.candlestick) == null ? void 0 : t.maPeriods) ?? [5, 10, 20];
    }
  ), I = n(
    () => {
      var o, t;
      return ((t = (o = a.config.value.chart) == null ? void 0 : o.candlestick) == null ? void 0 : t.bodyWidthRatio) ?? 0.6;
    }
  ), S = n(() => b.value ? a.plotSize.value.height * 0.72 : a.plotSize.value.height), y = n(() => b.value ? a.plotSize.value.height * 0.28 : 0), H = n(() => a.plotSize.value.height - y.value), M = n(() => {
    let o = 1 / 0;
    for (const t of r.value)
      t.low < o && (o = t.low);
    return o === 1 / 0 ? 0 : o;
  }), C = n(() => {
    let o = -1 / 0;
    for (const t of r.value)
      t.high > o && (o = t.high);
    return o === -1 / 0 ? 100 : o;
  }), q = n(() => C.value - M.value || 1), z = n(() => {
    let o = 0;
    for (const t of r.value)
      t.volume && t.volume > o && (o = t.volume);
    return o || 1;
  });
  function x(o) {
    return S.value - (o - M.value) / q.value * S.value;
  }
  function E(o) {
    return y.value - o / z.value * y.value;
  }
  const V = n(() => {
    const o = [], t = r.value.length;
    if (t === 0) return o;
    const s = a.plotSize.value.width / t, u = Math.max(1, s * I.value), i = u / 2;
    for (let c = 0; c < t; c++) {
      const e = r.value[c], g = c * s + s / 2, d = e.close >= e.open, v = d ? A.value : k.value, f = x(e.open), W = x(e.close), L = x(e.high), Z = x(e.low), _ = Math.min(f, W), oo = Math.max(1, Math.abs(W - f));
      o.push({
        x: g - i,
        y: _,
        width: u,
        height: oo,
        color: v,
        wickX: g,
        wickY1: L,
        wickY2: Z,
        open: e.open,
        high: e.high,
        low: e.low,
        close: e.close,
        volume: e.volume ?? 0,
        date: e.date,
        isUp: d,
        index: c,
        isFocused: a.focusedIndex.value === c
      });
    }
    return o;
  }), R = n(() => {
    const o = [];
    if (!b.value) return o;
    const t = r.value.length;
    if (t === 0) return o;
    const s = a.plotSize.value.width / t, u = Math.max(1, s * I.value), i = u / 2;
    for (let c = 0; c < t; c++) {
      const e = r.value[c], g = c * s + s / 2, d = e.close >= e.open, v = Math.max(0, E(e.volume ?? 0)), f = Math.max(1, y.value - v);
      o.push({
        x: g - i,
        y: H.value + v,
        width: u,
        height: f,
        color: d ? A.value : k.value,
        volume: e.volume ?? 0,
        index: c
      });
    }
    return o;
  }), G = n(() => {
    const o = [];
    if (!P.value) return o;
    const t = Y.value, l = r.value.map((e) => e.close), s = {
      5: "var(--nm-chart-ma-color-5)",
      10: "var(--nm-chart-ma-color-10)",
      20: "var(--nm-chart-ma-color-20)",
      60: "var(--nm-chart-ma-color-60)"
    }, u = r.value.length;
    if (u === 0) return o;
    const i = a.plotSize.value.width, c = i / u;
    for (const e of t) {
      const g = no(l, e), d = [];
      for (let v = 0; v < u; v++) {
        const f = g[v];
        if (f == null || isNaN(f)) continue;
        const W = u > 1 ? v * c + c / 2 : i / 2, L = x(f);
        d.push({ x: W, y: L });
      }
      d.length < 2 || o.push({
        path: eo(d),
        color: s[e] ?? "var(--nm-chart-ma-color-5)",
        period: e,
        name: `MA${e}`
      });
    }
    return o;
  }), T = n(() => a.niceTicks(M.value, C.value)), J = n(() => T.value.map((o) => a.formatValue(o))), B = n(() => a.niceTicks(0, z.value, 3)), K = n(() => B.value.map((o) => a.formatValue(o))), O = n(() => T.value), Q = n(() => {
    const o = r.value.length;
    if (o === 0) return [];
    const l = Math.max(1, Math.ceil(o / 8)), s = [], i = a.plotSize.value.width / o;
    for (let e = 0; e < o; e += l)
      s.push({
        label: D(r.value[e].date),
        x: e * i + i / 2
      });
    const c = o - 1;
    return c % l !== 0 && c > 0 && s.push({
      label: D(r.value[c].date),
      x: c * i + i / 2
    }), s;
  });
  function X(o, t) {
    for (const l of V.value)
      if (o >= l.x && o <= l.x + l.width && t >= l.y && t <= l.y + l.height)
        return { ...l, type: "candle" };
    for (const l of R.value)
      if (o >= l.x && o <= l.x + l.width && t >= l.y && t <= l.y + l.height)
        return { ...l, type: "volume" };
    return null;
  }
  return {
    ...a,
    candles: V,
    volumeBars: R,
    maLines: G,
    xAxisLabels: Q,
    yAxisLabels: J,
    yAxisTicks: T,
    volumeYAxisLabels: K,
    volumeYAxisTicks: B,
    gridLines: O,
    priceAreaHeight: S,
    volumeAreaHeight: y,
    volumeAreaTop: H,
    priceMin: M,
    priceMax: C,
    volumeMax: z,
    resolvedUpColor: A,
    resolvedDownColor: k,
    resolvedShowVolume: b,
    resolvedShowMA: P,
    resolvedMaPeriods: Y,
    findDataAtPosition: X,
    priceToY: x
  };
}
function no(m, h) {
  const r = [];
  let w = 0;
  for (let p = 0; p < m.length; p++)
    w += m[p], p >= h && (w -= m[p - h]), p >= h - 1 ? r.push(w / h) : r.push(null);
  return r;
}
function D(m) {
  const h = m.split("-");
  return h.length === 3 ? `${h[1]}-${h[2]}` : m;
}
export {
  ro as useCandlestickChart
};

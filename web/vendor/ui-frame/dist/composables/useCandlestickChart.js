import { computed as n } from "vue";
import { useChart as eo } from "./useChart.js";
import { buildSmoothPath as to } from "./chartPath.js";
function ro(p) {
  const { containerRef: h, data: r, margin: w, showVolume: m, showMA: U, maPeriods: $, upColor: N, downColor: F } = p, j = n(() => [
    {
      name: "price",
      data: r.value.map((o) => ({
        label: o.date,
        value: o.close
      }))
    }
  ]), l = eo({
    containerRef: h,
    series: j,
    margin: w
  }), k = n(
    () => {
      var o, e;
      return l.resolveProp(N, (e = (o = l.config.value.chart) == null ? void 0 : o.candlestick) == null ? void 0 : e.upColor, void 0) ?? "var(--nm-chart-up-color)";
    }
  ), A = n(
    () => {
      var o, e;
      return l.resolveProp(F, (e = (o = l.config.value.chart) == null ? void 0 : o.candlestick) == null ? void 0 : e.downColor, void 0) ?? "var(--nm-chart-down-color)";
    }
  ), M = n(
    () => {
      var o, e;
      return l.resolveProp(
        m,
        (e = (o = l.config.value.chart) == null ? void 0 : o.candlestick) == null ? void 0 : e.showVolume,
        !0
      );
    }
  ), L = n(
    () => {
      var o, e;
      return l.resolveProp(U, (e = (o = l.config.value.chart) == null ? void 0 : o.candlestick) == null ? void 0 : e.showMA, !0);
    }
  ), Y = n(
    () => {
      var o, e;
      return $ ?? ((e = (o = l.config.value.chart) == null ? void 0 : o.candlestick) == null ? void 0 : e.maPeriods) ?? [5, 10, 20];
    }
  ), I = n(
    () => {
      var o, e;
      return ((e = (o = l.config.value.chart) == null ? void 0 : o.candlestick) == null ? void 0 : e.bodyWidthRatio) ?? 0.6;
    }
  ), S = n(() => M.value ? l.plotSize.value.height * 0.72 : l.plotSize.value.height), y = n(() => M.value ? l.plotSize.value.height * 0.28 : 0), V = n(() => l.plotSize.value.height - y.value), b = n(() => {
    let o = 1 / 0;
    for (const e of r.value)
      e.low < o && (o = e.low);
    return o === 1 / 0 ? 0 : o;
  }), C = n(() => {
    let o = -1 / 0;
    for (const e of r.value)
      e.high > o && (o = e.high);
    return o === -1 / 0 ? 100 : o;
  }), q = n(() => C.value - b.value || 1), P = n(() => {
    let o = 0;
    for (const e of r.value)
      e.volume && e.volume > o && (o = e.volume);
    return o || 1;
  });
  function x(o) {
    return S.value - (o - b.value) / q.value * S.value;
  }
  function E(o) {
    return y.value - o / P.value * y.value;
  }
  const H = n(() => {
    const o = [], e = r.value.length;
    if (e === 0) return o;
    const s = l.plotSize.value.width / e, u = Math.max(1, s * I.value), i = u / 2;
    for (let c = 0; c < e; c++) {
      const t = r.value[c], g = c * s + s / 2, d = t.close >= t.open, v = d ? k.value : A.value, f = x(t.open), W = x(t.close), T = x(t.high), Z = x(t.low), _ = Math.min(f, W), oo = Math.max(1, Math.abs(W - f));
      o.push({
        x: g - i,
        y: _,
        width: u,
        height: oo,
        color: v,
        wickX: g,
        wickY1: T,
        wickY2: Z,
        open: t.open,
        high: t.high,
        low: t.low,
        close: t.close,
        volume: t.volume ?? 0,
        date: t.date,
        isUp: d,
        index: c,
        isFocused: l.focusedIndex.value === c
      });
    }
    return o;
  }), R = n(() => {
    const o = [];
    if (!M.value) return o;
    const e = r.value.length;
    if (e === 0) return o;
    const s = l.plotSize.value.width / e, u = Math.max(1, s * I.value), i = u / 2;
    for (let c = 0; c < e; c++) {
      const t = r.value[c], g = c * s + s / 2, d = t.close >= t.open, v = Math.max(0, E(t.volume ?? 0)), f = Math.max(1, y.value - v);
      o.push({
        x: g - i,
        y: V.value + v,
        width: u,
        height: f,
        color: d ? k.value : A.value,
        volume: t.volume ?? 0,
        index: c
      });
    }
    return o;
  }), G = n(() => {
    const o = [];
    if (!L.value) return o;
    const e = Y.value, a = r.value.map((t) => t.close), s = {
      5: "var(--nm-chart-ma-color-5)",
      10: "var(--nm-chart-ma-color-10)",
      20: "var(--nm-chart-ma-color-20)",
      60: "var(--nm-chart-ma-color-60)"
    }, u = r.value.length;
    if (u === 0) return o;
    const i = l.plotSize.value.width, c = i / u;
    for (const t of e) {
      const g = lo(a, t), d = [];
      for (let v = 0; v < u; v++) {
        const f = g[v];
        if (f == null || isNaN(f)) continue;
        const W = u > 1 ? v * c + c / 2 : i / 2, T = x(f);
        d.push({ x: W, y: T });
      }
      d.length < 2 || o.push({
        path: to(d),
        color: s[t] ?? "var(--nm-chart-ma-color-5)",
        period: t,
        name: `MA${t}`
      });
    }
    return o;
  }), z = n(() => l.niceTicks(b.value, C.value)), J = n(() => z.value.map((o) => l.formatValue(o))), B = n(() => l.niceTicks(0, P.value, 3)), K = n(() => B.value.map((o) => l.formatValue(o))), O = n(() => z.value), Q = n(() => {
    const o = r.value.length;
    if (o === 0) return [];
    const a = Math.max(1, Math.ceil(o / 8)), s = [], i = l.plotSize.value.width / o;
    for (let t = 0; t < o; t += a)
      s.push({
        label: D(r.value[t].date),
        x: t * i + i / 2
      });
    const c = o - 1;
    return c % a !== 0 && c > 0 && s.push({
      label: D(r.value[c].date),
      x: c * i + i / 2
    }), s;
  });
  function X(o, e) {
    for (const a of H.value)
      if (o >= a.x && o <= a.x + a.width && e >= a.y && e <= a.y + a.height)
        return { ...a, type: "candle" };
    for (const a of R.value)
      if (o >= a.x && o <= a.x + a.width && e >= a.y && e <= a.y + a.height)
        return { ...a, type: "volume" };
    return null;
  }
  return {
    ...l,
    candles: H,
    volumeBars: R,
    maLines: G,
    xAxisLabels: Q,
    yAxisLabels: J,
    yAxisTicks: z,
    volumeYAxisLabels: K,
    volumeYAxisTicks: B,
    gridLines: O,
    priceAreaHeight: S,
    volumeAreaHeight: y,
    volumeAreaTop: V,
    priceMin: b,
    priceMax: C,
    volumeMax: P,
    resolvedUpColor: k,
    resolvedDownColor: A,
    resolvedShowVolume: M,
    resolvedShowMA: L,
    resolvedMaPeriods: Y,
    findDataAtPosition: X,
    priceToY: x
  };
}
function lo(p, h) {
  const r = [];
  let w = 0;
  for (let m = 0; m < p.length; m++)
    w += p[m], m >= h && (w -= p[m - h]), m >= h - 1 ? r.push(w / h) : r.push(null);
  return r;
}
function D(p) {
  const h = p.split("-");
  return h.length === 3 ? `${h[1]}-${h[2]}` : p;
}
export {
  ro as useCandlestickChart
};

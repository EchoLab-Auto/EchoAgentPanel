import { computed as d } from "vue";
import { useChart as Q } from "./useChart.js";
function Y(A) {
  const {
    containerRef: B,
    series: u,
    margin: C,
    orientation: H,
    barGap: W,
    stacked: G,
    yMin: O,
    yMax: T
  } = A, t = Q({
    containerRef: B,
    series: u,
    margin: C
  }), k = d(
    () => {
      var e, l;
      return t.resolveProp(H, (l = (e = t.config.value.chart) == null ? void 0 : e.bar) == null ? void 0 : l.orientation, "vertical");
    }
  ), y = d(
    () => {
      var e, l;
      return t.resolveProp(G, (l = (e = t.config.value.chart) == null ? void 0 : e.bar) == null ? void 0 : l.stacked, !1);
    }
  ), $ = d(
    () => {
      var e, l;
      return t.resolveProp(W, (l = (e = t.config.value.chart) == null ? void 0 : e.bar) == null ? void 0 : l.barGap, 0.2);
    }
  ), R = d(() => {
    var l;
    if (y.value) {
      let a = 0;
      const n = ((l = u.value[0]) == null ? void 0 : l.data.map((s) => s.label ?? "")) ?? [];
      for (let s = 0; s < n.length; s++) {
        let v = 0;
        for (const f of u.value)
          f.data[s] && f.data[s].value < 0 && (v += f.data[s].value);
        a = Math.min(a, v);
      }
      return a;
    }
    let e = 0;
    for (const a of u.value)
      for (const n of a.data)
        e = Math.min(e, n.value);
    return e;
  }), D = d(() => {
    var l;
    if (y.value) {
      let a = 0;
      const n = ((l = u.value[0]) == null ? void 0 : l.data.map((s) => s.label ?? "")) ?? [];
      for (let s = 0; s < n.length; s++) {
        let v = 0;
        for (const f of u.value)
          f.data[s] && f.data[s].value > 0 && (v += f.data[s].value);
        a = Math.max(a, v);
      }
      return a;
    }
    let e = 0;
    for (const a of u.value)
      for (const n of a.data)
        e = Math.max(e, n.value);
    return e;
  }), p = d(() => O ?? R.value), L = d(() => T ?? D.value), N = d(() => u.value.length === 0 ? [] : u.value[0].data.map((e) => e.label ?? "")), F = d(() => t.niceTicks(p.value, L.value)), V = d(() => F.value.map((e) => t.formatValue(e))), j = d(() => F.value), P = d(() => {
    const e = [], l = t.plotSize.value.width, a = t.plotSize.value.height, n = L.value - p.value || 1;
    if (l <= 0 || a <= 0 || u.value.length === 0) return e;
    const s = u.value[0].data.length;
    if (s === 0) return e;
    const v = k.value === "horizontal", f = y.value, E = v ? a : l, b = v ? l : a, M = E / s, J = f ? 1 : u.value.length, S = M * $.value, K = M - S, g = Math.max(1, K / J);
    if (f)
      for (let o = 0; o < s; o++) {
        let c = 0, m = 0;
        for (let r = 0; r < u.value.length; r++) {
          const x = u.value[r], h = x.data[o];
          if (!h) continue;
          const i = h.value, I = Math.abs(i) / n * b, w = o * M + S / 2;
          if (i >= 0) {
            const z = (c + i - p.value) / n * b;
            v ? e.push({
              x: (c - p.value) / n * b,
              y: w,
              width: i / n * b,
              height: g,
              color: x.color ?? t.palette.value[r % t.palette.value.length],
              label: h.label ?? "",
              value: i,
              dataIndex: o,
              seriesIndex: r,
              isFocused: t.focusedIndex.value === o
            }) : e.push({
              x: w,
              y: a - z,
              width: g,
              height: I,
              color: x.color ?? t.palette.value[r % t.palette.value.length],
              label: h.label ?? "",
              value: i,
              dataIndex: o,
              seriesIndex: r,
              isFocused: t.focusedIndex.value === o
            }), c += i;
          } else {
            if (v)
              e.push({
                x: (m - p.value) / n * b,
                y: w,
                width: I,
                height: g,
                color: x.color ?? t.palette.value[r % t.palette.value.length],
                label: h.label ?? "",
                value: i,
                dataIndex: o,
                seriesIndex: r,
                isFocused: t.focusedIndex.value === o
              });
            else {
              const z = (m - p.value) / n * b;
              e.push({
                x: w,
                y: a - z,
                width: g,
                height: I,
                color: x.color ?? t.palette.value[r % t.palette.value.length],
                label: h.label ?? "",
                value: i,
                dataIndex: o,
                seriesIndex: r,
                isFocused: t.focusedIndex.value === o
              });
            }
            m += i;
          }
        }
      }
    else
      for (let o = 0; o < s; o++)
        for (let c = 0; c < u.value.length; c++) {
          const m = u.value[c], r = m.data[o];
          if (!r) continue;
          const x = r.value, h = (x - p.value) / n * b, i = o * M + S / 2 + c * g;
          if (v) {
            const I = -p.value / n * b;
            e.push({
              x: x >= 0 ? I : I + h,
              y: i,
              width: Math.abs(h),
              height: g,
              color: m.color ?? t.palette.value[c % t.palette.value.length],
              label: r.label ?? "",
              value: x,
              dataIndex: o,
              seriesIndex: c,
              isFocused: t.focusedIndex.value === o
            });
          } else
            e.push({
              x: i,
              y: a - h,
              width: g,
              height: Math.abs(h),
              color: m.color ?? t.palette.value[c % t.palette.value.length],
              label: r.label ?? "",
              value: x,
              dataIndex: o,
              seriesIndex: c,
              isFocused: t.focusedIndex.value === o
            });
        }
    return e;
  });
  function q(e, l) {
    for (const a of P.value)
      if (e >= a.x && e <= a.x + a.width && l >= a.y && l <= a.y + a.height) {
        const n = u.value[a.seriesIndex];
        return {
          visible: !0,
          x: e,
          y: l,
          content: `${(n == null ? void 0 : n.name) ?? ""}: ${a.label} ${a.value}`,
          dataIndex: a.dataIndex,
          seriesIndex: a.seriesIndex
        };
      }
    return null;
  }
  return {
    ...t,
    bars: P,
    xAxisLabels: N,
    yAxisLabels: V,
    yAxisTicks: F,
    gridLines: j,
    findDataAtPosition: q,
    resolvedOrientation: k,
    resolvedStacked: y
  };
}
export {
  Y as useBarChart
};

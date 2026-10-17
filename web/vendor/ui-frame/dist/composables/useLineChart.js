import { computed as u } from "vue";
import { useChart as N } from "./useChart.js";
import { buildSmoothPath as V } from "./chartPath.js";
function U(t) {
  const {
    containerRef: s,
    series: a,
    margin: d,
    curve: x,
    area: m,
    areaOpacity: I = 0.1,
    showPoints: A,
    pointSize: w = 6,
    lineWidth: z,
    yMin: E,
    yMax: O
  } = t, o = N({
    containerRef: s,
    series: a,
    margin: d
  }), y = u(
    () => {
      var e, n;
      return o.resolveProp(x, (n = (e = o.config.value.chart) == null ? void 0 : e.line) == null ? void 0 : n.curve, "smooth");
    }
  ), W = u(
    () => {
      var e, n;
      return o.resolveProp(A, (n = (e = o.config.value.chart) == null ? void 0 : e.line) == null ? void 0 : n.showPoints, !0);
    }
  ), C = u(
    () => {
      var e, n;
      return o.resolveProp(z, (n = (e = o.config.value.chart) == null ? void 0 : e.line) == null ? void 0 : n.lineWidth, 2.5);
    }
  ), g = u(
    () => {
      var e, n;
      return o.resolveProp(m, (n = (e = o.config.value.chart) == null ? void 0 : e.line) == null ? void 0 : n.area, !1);
    }
  ), D = u(() => {
    let e = 0;
    for (const n of a.value)
      for (const l of n.data)
        e = Math.min(e, l.value);
    return e;
  }), _ = u(() => {
    let e = 0;
    for (const n of a.value)
      for (const l of n.data)
        e = Math.max(e, l.value);
    return e;
  }), $ = u(() => E ?? D.value), P = u(() => O ?? _.value), L = u(() => a.value.length === 0 ? [] : a.value[0].data.map((e) => e.label ?? "")), k = 72, B = u(() => {
    const e = L.value.length;
    if (e <= 1) return 1;
    const n = o.plotSize.value.width || 0, l = Math.max(2, Math.floor(n / k));
    return Math.max(1, Math.ceil(e / l));
  }), M = u(() => o.niceTicks($.value, P.value)), R = u(() => M.value.map((e) => o.formatValue(e))), T = u(() => M.value), p = u(() => {
    const e = [], n = o.plotSize.value.width, l = o.plotSize.value.height, c = P.value - $.value || 1;
    for (const h of a.value) {
      const i = [], r = h.data.length;
      if (r === 0) {
        e.push(i);
        continue;
      }
      const v = r > 1 ? n / (r - 1) : n / 2;
      for (let f = 0; f < r; f++) {
        const F = r > 1 ? f * v : n / 2, H = l - (h.data[f].value - $.value) / c * l;
        i.push({ x: F, y: H });
      }
      e.push(i);
    }
    return e;
  }), X = u(() => {
    const e = [], n = o.plotSize.value.height;
    return p.value.forEach((l, c) => {
      if (l.length === 0) return;
      const h = a.value[c], i = h.color ?? o.palette.value[c % o.palette.value.length], r = S(l, y.value), v = g.value ? G(l, n, y.value) : void 0;
      e.push({
        path: r,
        areaPath: v,
        color: i,
        name: h.name,
        seriesIndex: c
      });
    }), e;
  }), b = u(() => {
    const e = [];
    return p.value.forEach((n, l) => {
      const c = a.value[l];
      if (!c) return;
      const h = c.color ?? o.palette.value[l % o.palette.value.length];
      n.forEach((i, r) => {
        var v;
        e.push({
          cx: i.x,
          cy: i.y,
          color: h,
          value: ((v = c.data[r]) == null ? void 0 : v.value) ?? 0,
          dataIndex: r,
          seriesIndex: l,
          isFocused: o.focusedIndex.value === r
        });
      });
    }), e;
  });
  function q(e, n) {
    for (const c of b.value) {
      const h = c.cx - e, i = c.cy - n;
      if (Math.sqrt(h * h + i * i) < 12) {
        const r = a.value[c.seriesIndex], v = r == null ? void 0 : r.data[c.dataIndex];
        return {
          visible: !0,
          x: e,
          y: n,
          content: `${(r == null ? void 0 : r.name) ?? ""}: ${(v == null ? void 0 : v.label) ?? ""} ${c.value}`,
          dataIndex: c.dataIndex,
          seriesIndex: c.seriesIndex
        };
      }
    }
    return null;
  }
  return {
    ...o,
    lines: X,
    points: b,
    xAxisLabels: L,
    xLabelStride: B,
    yAxisLabels: R,
    yAxisTicks: M,
    gridLines: T,
    findDataAtPosition: q,
    resolvedCurve: y,
    resolvedShowPoints: W,
    resolvedLineWidth: C,
    resolvedArea: g,
    resolvedAreaOpacity: I,
    resolvedPointSize: w
  };
}
function S(t, s) {
  if (t.length === 0) return "";
  if (t.length === 1) return `M${t[0].x},${t[0].y}`;
  switch (s) {
    case "linear":
      return Z(t);
    case "step":
      return j(t);
    case "smooth":
    default:
      return V(t);
  }
}
function Z(t) {
  let s = `M${t[0].x},${t[0].y}`;
  for (let a = 1; a < t.length; a++)
    s += ` L${t[a].x},${t[a].y}`;
  return s;
}
function j(t) {
  let s = `M${t[0].x},${t[0].y}`;
  for (let a = 1; a < t.length; a++) {
    const d = (t[a - 1].x + t[a].x) / 2;
    s += ` L${d},${t[a - 1].y} L${d},${t[a].y} L${t[a].x},${t[a].y}`;
  }
  return s;
}
function G(t, s, a) {
  if (t.length === 0) return "";
  const d = S(t, a), x = t[t.length - 1], m = t[0];
  return `${d} L${x.x},${s} L${m.x},${s} Z`;
}
export {
  U as useLineChart
};

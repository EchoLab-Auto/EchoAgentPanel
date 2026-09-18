import { computed as c } from "vue";
import { useChart as V } from "./useChart.js";
import { buildSmoothPath as Z } from "./chartPath.js";
function U(t) {
  const {
    containerRef: s,
    series: a,
    margin: d,
    curve: x,
    area: y,
    areaOpacity: I = 0.1,
    showPoints: S,
    pointSize: A = 6,
    lineWidth: w,
    yMin: z,
    yMax: O
  } = t, o = V({
    containerRef: s,
    series: a,
    margin: d
  }), m = c(
    () => {
      var e, n;
      return o.resolveProp(x, (n = (e = o.config.value.chart) == null ? void 0 : e.line) == null ? void 0 : n.curve, "smooth");
    }
  ), W = c(
    () => {
      var e, n;
      return o.resolveProp(S, (n = (e = o.config.value.chart) == null ? void 0 : e.line) == null ? void 0 : n.showPoints, !0);
    }
  ), C = c(
    () => {
      var e, n;
      return o.resolveProp(w, (n = (e = o.config.value.chart) == null ? void 0 : e.line) == null ? void 0 : n.lineWidth, 2.5);
    }
  ), P = c(
    () => {
      var e, n;
      return o.resolveProp(y, (n = (e = o.config.value.chart) == null ? void 0 : e.line) == null ? void 0 : n.area, !1);
    }
  ), D = c(() => {
    let e = 0;
    for (const n of a.value)
      for (const u of n.data)
        e = Math.min(e, u.value);
    return e;
  }), E = c(() => {
    let e = 0;
    for (const n of a.value)
      for (const u of n.data)
        e = Math.max(e, u.value);
    return e;
  }), $ = c(() => z ?? D.value), p = c(() => O ?? E.value), k = c(() => a.value.length === 0 ? [] : a.value[0].data.map((e) => e.label ?? "")), g = c(() => o.niceTicks($.value, p.value)), R = c(() => g.value.map((e) => o.formatValue(e))), T = c(() => g.value), M = c(() => {
    const e = [], n = o.plotSize.value.width, u = o.plotSize.value.height, l = p.value - $.value || 1;
    for (const h of a.value) {
      const i = [], r = h.data.length;
      if (r === 0) {
        e.push(i);
        continue;
      }
      const v = r > 1 ? n / (r - 1) : n / 2;
      for (let f = 0; f < r; f++) {
        const F = r > 1 ? f * v : n / 2, H = u - (h.data[f].value - $.value) / l * u;
        i.push({ x: F, y: H });
      }
      e.push(i);
    }
    return e;
  }), q = c(() => {
    const e = [], n = o.plotSize.value.height;
    return M.value.forEach((u, l) => {
      if (u.length === 0) return;
      const h = a.value[l], i = h.color ?? o.palette.value[l % o.palette.value.length], r = b(u, m.value), v = P.value ? J(u, n, m.value) : void 0;
      e.push({
        path: r,
        areaPath: v,
        color: i,
        name: h.name,
        seriesIndex: l
      });
    }), e;
  }), L = c(() => {
    const e = [];
    return M.value.forEach((n, u) => {
      const l = a.value[u];
      if (!l) return;
      const h = l.color ?? o.palette.value[u % o.palette.value.length];
      n.forEach((i, r) => {
        var v;
        e.push({
          cx: i.x,
          cy: i.y,
          color: h,
          value: ((v = l.data[r]) == null ? void 0 : v.value) ?? 0,
          dataIndex: r,
          seriesIndex: u,
          isFocused: o.focusedIndex.value === r
        });
      });
    }), e;
  });
  function B(e, n) {
    for (const l of L.value) {
      const h = l.cx - e, i = l.cy - n;
      if (Math.sqrt(h * h + i * i) < 12) {
        const r = a.value[l.seriesIndex], v = r == null ? void 0 : r.data[l.dataIndex];
        return {
          visible: !0,
          x: e,
          y: n,
          content: `${(r == null ? void 0 : r.name) ?? ""}: ${(v == null ? void 0 : v.label) ?? ""} ${l.value}`,
          dataIndex: l.dataIndex,
          seriesIndex: l.seriesIndex
        };
      }
    }
    return null;
  }
  return {
    ...o,
    lines: q,
    points: L,
    xAxisLabels: k,
    yAxisLabels: R,
    yAxisTicks: g,
    gridLines: T,
    findDataAtPosition: B,
    resolvedCurve: m,
    resolvedShowPoints: W,
    resolvedLineWidth: C,
    resolvedArea: P,
    resolvedAreaOpacity: I,
    resolvedPointSize: A
  };
}
function b(t, s) {
  if (t.length === 0) return "";
  if (t.length === 1) return `M${t[0].x},${t[0].y}`;
  switch (s) {
    case "linear":
      return j(t);
    case "step":
      return G(t);
    case "smooth":
    default:
      return Z(t);
  }
}
function j(t) {
  let s = `M${t[0].x},${t[0].y}`;
  for (let a = 1; a < t.length; a++)
    s += ` L${t[a].x},${t[a].y}`;
  return s;
}
function G(t) {
  let s = `M${t[0].x},${t[0].y}`;
  for (let a = 1; a < t.length; a++) {
    const d = (t[a - 1].x + t[a].x) / 2;
    s += ` L${d},${t[a - 1].y} L${d},${t[a].y} L${t[a].x},${t[a].y}`;
  }
  return s;
}
function J(t, s, a) {
  if (t.length === 0) return "";
  const d = b(t, a), x = t[t.length - 1], y = t[0];
  return `${d} L${x.x},${s} L${y.x},${s} Z`;
}
export {
  U as useLineChart
};

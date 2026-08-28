import { computed as f } from "vue";
import { useChart as k } from "./useChart.js";
const D = { top: 24, right: 24, bottom: 24, left: 24 };
function U(n) {
  const {
    containerRef: s,
    data: t,
    margin: l,
    innerRadius: u = 0,
    outerRadius: i,
    padAngle: q = 0.02,
    startAngle: p = -90,
    labelPosition: Z = "outside",
    roundedCorners: r = !1,
    colorPalette: m
  } = n, b = f(() => [
    {
      name: "pie",
      data: t.value
    }
  ]), e = k({
    containerRef: s,
    series: b,
    margin: l ?? D
  }), M = f(
    () => {
      var a, o;
      return e.resolveProp(u, (o = (a = e.config.value.chart) == null ? void 0 : a.pie) == null ? void 0 : o.innerRadius, 0);
    }
  ), x = f(
    () => {
      var a, o;
      return e.resolveProp(Z, (o = (a = e.config.value.chart) == null ? void 0 : a.pie) == null ? void 0 : o.labelPosition, "outside");
    }
  ), I = f(
    () => {
      var a, o;
      return e.resolveProp(
        r,
        (o = (a = e.config.value.chart) == null ? void 0 : a.pie) == null ? void 0 : o.roundedCorners,
        !1
      );
    }
  ), X = f(() => p * (Math.PI / 180)), S = f(
    () => m && m.length > 0 ? m : e.palette.value
  ), $ = f(
    () => t.value.reduce((a, o) => a + Math.abs(o.value), 0)
  ), P = f(() => {
    if (i !== void 0) return i;
    const a = e.plotSize.value.width, o = e.plotSize.value.height;
    return Math.min(a, o) / 2;
  }), L = f(() => {
    const a = [];
    if ($.value === 0) return a;
    const o = e.plotSize.value.width / 2, j = e.plotSize.value.height / 2, B = Math.max(0, P.value), y = M.value, z = t.value.length > 1 ? q : 0;
    let C = X.value;
    for (let A = 0; A < t.value.length; A++) {
      const w = t.value[A], d = $.value > 0 ? w.value / $.value : 0, g = d * Math.PI * 2 - z, h = C, v = C + Math.max(0, g), T = J(o, j, B, y, h, v, I.value), E = h + g / 2, F = (B + y) / 2, W = o + F * Math.cos(E), _ = j + F * Math.sin(E);
      let G, H, N = "start";
      if (x.value === "outside") {
        const O = B + 20;
        G = o + O * Math.cos(E), H = j + O * Math.sin(E), N = Math.cos(E) >= 0 ? "start" : "end";
      }
      a.push({
        path: T,
        centroidX: W,
        centroidY: _,
        startAngle: h,
        endAngle: v,
        color: w.color ?? S.value[A % S.value.length],
        label: w.label ?? "",
        value: w.value,
        percentage: Math.round(d * 1e3) / 10,
        index: A,
        isFocused: e.focusedIndex.value === A,
        labelX: G,
        labelY: H,
        labelAnchor: N
      }), C = v + z;
    }
    return a;
  });
  function Y(a, o) {
    const j = e.plotSize.value.width / 2, B = e.plotSize.value.height / 2, y = a - j, z = o - B, C = Math.sqrt(y * y + z * z), A = P.value, w = M.value;
    if (C < w || C > A) return null;
    let d = Math.atan2(z, y);
    d < 0 && (d += Math.PI * 2);
    for (const g of L.value) {
      let h = g.startAngle % (Math.PI * 2), v = g.endAngle % (Math.PI * 2);
      if (h < 0 && (h += Math.PI * 2), v < 0 && (v += Math.PI * 2), h <= v) {
        if (d >= h && d <= v) return g;
      } else if (d >= h || d <= v) return g;
    }
    return null;
  }
  return {
    ...e,
    arcs: L,
    total: $,
    outerRadius: P,
    resolvedInnerRadius: M,
    resolvedLabelPosition: x,
    findArcAtPosition: Y,
    effectivePalette: S
  };
}
function c(n, s, t, l) {
  return {
    x: n + t * Math.cos(l),
    y: s + t * Math.sin(l)
  };
}
function J(n, s, t, l, u, i, q) {
  const p = i - u > Math.PI ? 1 : 0, Z = i - u, r = q && Z > 0 ? Math.max(0, Math.min(t * 0.18, Z * t / 2 - 1)) : 0, m = r > 0, b = m ? r / t : 0;
  if (l <= 0) {
    const $ = c(n, s, t, u), P = c(n, s, t, i);
    if (!m)
      return [
        `M${n},${s}`,
        `L${$.x},${$.y}`,
        `A${t},${t} 0 ${p} 1 ${P.x},${P.y}`,
        "Z"
      ].join(" ");
    const L = c(n, s, t, u + b), Y = c(n, s, t, i - b);
    return [
      `M${n},${s}`,
      `L${L.x},${L.y}`,
      `A${r},${r} 0 0 1 ${$.x},${$.y}`,
      `A${t},${t} 0 ${p} 1 ${P.x},${P.y}`,
      `A${r},${r} 0 0 1 ${Y.x},${Y.y}`,
      "Z"
    ].join(" ");
  }
  const e = c(n, s, t, u), M = c(n, s, t, i), x = c(n, s, l, i), I = c(n, s, l, u);
  if (!m)
    return [
      `M${e.x},${e.y}`,
      `A${t},${t} 0 ${p} 1 ${M.x},${M.y}`,
      `L${x.x},${x.y}`,
      `A${l},${l} 0 ${p} 0 ${I.x},${I.y}`,
      "Z"
    ].join(" ");
  const X = c(n, s, t, u + b), S = c(n, s, t, i - b);
  return [
    `M${X.x},${X.y}`,
    `A${r},${r} 0 0 1 ${e.x},${e.y}`,
    `A${t},${t} 0 ${p} 1 ${M.x},${M.y}`,
    `A${r},${r} 0 0 1 ${S.x},${S.y}`,
    `L${x.x},${x.y}`,
    `A${l},${l} 0 ${p} 0 ${I.x},${I.y}`,
    "Z"
  ].join(" ");
}
export {
  U as usePieChart
};

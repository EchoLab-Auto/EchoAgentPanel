import { computed as f } from "vue";
import { useChart as k } from "./useChart.js";
const D = { top: 24, right: 24, bottom: 24, left: 24 };
function U(o) {
  const {
    containerRef: s,
    data: t,
    margin: r,
    innerRadius: u,
    outerRadius: i,
    padAngle: q = 0.02,
    startAngle: p = -90,
    labelPosition: Z,
    roundedCorners: l,
    colorPalette: g
  } = o, b = f(() => [
    {
      name: "pie",
      data: t.value
    }
  ]), n = k({
    containerRef: s,
    series: b,
    margin: r ?? D
  }), M = f(
    () => {
      var e, a;
      return n.resolveProp(u, (a = (e = n.config.value.chart) == null ? void 0 : e.pie) == null ? void 0 : a.innerRadius, 0);
    }
  ), m = f(
    () => {
      var e, a;
      return n.resolveProp(Z, (a = (e = n.config.value.chart) == null ? void 0 : e.pie) == null ? void 0 : a.labelPosition, "outside");
    }
  ), I = f(
    () => {
      var e, a;
      return n.resolveProp(
        l,
        (a = (e = n.config.value.chart) == null ? void 0 : e.pie) == null ? void 0 : a.roundedCorners,
        !1
      );
    }
  ), X = f(() => p * (Math.PI / 180)), S = f(() => {
    var a;
    if (g && g.length > 0) return g;
    const e = (a = n.config.value.chart) == null ? void 0 : a.colorPalette;
    return e && e.length > 0 ? e : n.palette.value;
  }), $ = f(
    () => t.value.reduce((e, a) => e + Math.abs(a.value), 0)
  ), P = f(() => {
    if (i !== void 0) return i;
    const e = n.plotSize.value.width, a = n.plotSize.value.height;
    return Math.min(e, a) / 2;
  }), L = f(() => {
    const e = [];
    if ($.value === 0) return e;
    const a = n.plotSize.value.width / 2, j = n.plotSize.value.height / 2, B = Math.max(0, P.value), y = M.value, z = t.value.length > 1 ? q : 0;
    let C = X.value;
    for (let A = 0; A < t.value.length; A++) {
      const w = t.value[A], d = $.value > 0 ? w.value / $.value : 0, x = d * Math.PI * 2 - z, h = C, v = C + Math.max(0, x), T = J(a, j, B, y, h, v, I.value), E = h + x / 2, F = (B + y) / 2, W = a + F * Math.cos(E), _ = j + F * Math.sin(E);
      let G, H, N = "start";
      if (m.value === "outside") {
        const O = B + 20;
        G = a + O * Math.cos(E), H = j + O * Math.sin(E), N = Math.cos(E) >= 0 ? "start" : "end";
      }
      e.push({
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
        isFocused: n.focusedIndex.value === A,
        labelX: G,
        labelY: H,
        labelAnchor: N
      }), C = v + z;
    }
    return e;
  });
  function Y(e, a) {
    const j = n.plotSize.value.width / 2, B = n.plotSize.value.height / 2, y = e - j, z = a - B, C = Math.sqrt(y * y + z * z), A = P.value, w = M.value;
    if (C < w || C > A) return null;
    let d = Math.atan2(z, y);
    d < 0 && (d += Math.PI * 2);
    for (const x of L.value) {
      let h = x.startAngle % (Math.PI * 2), v = x.endAngle % (Math.PI * 2);
      if (h < 0 && (h += Math.PI * 2), v < 0 && (v += Math.PI * 2), h <= v) {
        if (d >= h && d <= v) return x;
      } else if (d >= h || d <= v) return x;
    }
    return null;
  }
  return {
    ...n,
    arcs: L,
    total: $,
    outerRadius: P,
    resolvedInnerRadius: M,
    resolvedLabelPosition: m,
    findArcAtPosition: Y,
    effectivePalette: S
  };
}
function c(o, s, t, r) {
  return {
    x: o + t * Math.cos(r),
    y: s + t * Math.sin(r)
  };
}
function J(o, s, t, r, u, i, q) {
  const p = i - u > Math.PI ? 1 : 0, Z = i - u, l = q && Z > 0 ? Math.max(0, Math.min(t * 0.18, Z * t / 2 - 1)) : 0, g = l > 0, b = g ? l / t : 0;
  if (r <= 0) {
    const $ = c(o, s, t, u), P = c(o, s, t, i);
    if (!g)
      return [
        `M${o},${s}`,
        `L${$.x},${$.y}`,
        `A${t},${t} 0 ${p} 1 ${P.x},${P.y}`,
        "Z"
      ].join(" ");
    const L = c(o, s, t, u + b), Y = c(o, s, t, i - b);
    return [
      `M${o},${s}`,
      `L${L.x},${L.y}`,
      `A${l},${l} 0 0 1 ${$.x},${$.y}`,
      `A${t},${t} 0 ${p} 1 ${P.x},${P.y}`,
      `A${l},${l} 0 0 1 ${Y.x},${Y.y}`,
      "Z"
    ].join(" ");
  }
  const n = c(o, s, t, u), M = c(o, s, t, i), m = c(o, s, r, i), I = c(o, s, r, u);
  if (!g)
    return [
      `M${n.x},${n.y}`,
      `A${t},${t} 0 ${p} 1 ${M.x},${M.y}`,
      `L${m.x},${m.y}`,
      `A${r},${r} 0 ${p} 0 ${I.x},${I.y}`,
      "Z"
    ].join(" ");
  const X = c(o, s, t, u + b), S = c(o, s, t, i - b);
  return [
    `M${X.x},${X.y}`,
    `A${l},${l} 0 0 1 ${n.x},${n.y}`,
    `A${t},${t} 0 ${p} 1 ${M.x},${M.y}`,
    `A${l},${l} 0 0 1 ${S.x},${S.y}`,
    `L${m.x},${m.y}`,
    `A${r},${r} 0 ${p} 0 ${I.x},${I.y}`,
    "Z"
  ].join(" ");
}
export {
  U as usePieChart
};

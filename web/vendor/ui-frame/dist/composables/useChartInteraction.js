import { ref as i, computed as w, onBeforeUnmount as E } from "vue";
function P(B) {
  const {
    containerRef: d,
    enabled: y,
    marginLeft: X,
    plotWidth: L,
    dataPointXs: M,
    xAxisLabels: R,
    series: b,
    palette: F,
    tooltip: p,
    hideTooltip: $,
    valueFormatter: I
  } = B, r = i({ left: 0, top: 0 }), m = i(null), C = w(() => {
    const e = {};
    return d.value ? (e.left = `${p.value.x - r.value.left + 12}px`, e.top = `${p.value.y - r.value.top - 8}px`, e) : (e.display = "none", e);
  }), x = i(null), h = i(-1), g = i(!1);
  function D(e) {
    const l = M.value;
    if (l.length === 0) return -1;
    let a = 0, t = Math.abs(e - l[0]);
    for (let o = 1; o < l.length; o++) {
      const u = Math.abs(e - l[o]);
      u < t && (t = u, a = o);
    }
    return a;
  }
  let n = null, s = null;
  function H(e) {
    if (!d.value || !y.value) return;
    const l = d.value.getBoundingClientRect();
    r.value = { left: l.left, top: l.top };
    const a = e.clientX - l.left - X.value;
    if (a < 0 || a > L.value) {
      A();
      return;
    }
    const t = D(a);
    if (t < 0) return;
    g.value = !0, h.value = t, x.value = M.value[t] ?? a;
    const o = R.value[t] ?? `#${t + 1}`, u = [];
    for (let c = 0; c < b.value.length; c++) {
      const v = b.value[c], f = v.data[t];
      f && u.push({
        name: v.name,
        value: f.value,
        display: I ? I(f.value, v.name) : String(f.value),
        color: v.color ?? F.value[c % F.value.length]
      });
    }
    m.value = { header: o, rows: u }, p.value = {
      visible: !0,
      x: e.clientX,
      y: e.clientY,
      content: "",
      dataIndex: t,
      seriesIndex: 0
    };
  }
  function A() {
    x.value = null, h.value = -1, g.value = !1, m.value = null, $();
  }
  function S(e) {
    y.value && (s = e, n === null && (n = requestAnimationFrame(() => {
      n = null, s && H(s);
    })));
  }
  function q() {
    n !== null && (cancelAnimationFrame(n), n = null), s = null, A();
  }
  return E(() => {
    n !== null && (cancelAnimationFrame(n), n = null);
  }), {
    crosshairX: x,
    nearestIndex: h,
    isHovering: g,
    tooltipData: m,
    tooltipStyle: C,
    containerRect: r,
    onBodyMouseMove: S,
    onBodyMouseLeave: q
  };
}
export {
  P as default,
  P as useChartInteraction
};

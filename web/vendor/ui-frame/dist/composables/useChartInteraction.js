import { ref as i, computed as w, onBeforeUnmount as E } from "vue";
function P(B) {
  const {
    containerRef: v,
    enabled: g,
    marginLeft: F,
    plotWidth: X,
    dataPointXs: M,
    xAxisLabels: L,
    series: y,
    palette: b,
    tooltip: f,
    hideTooltip: R
  } = B, r = i({ left: 0, top: 0 }), d = i(null), $ = w(() => {
    const e = {};
    return v.value ? (e.left = `${f.value.x - r.value.left + 12}px`, e.top = `${f.value.y - r.value.top - 8}px`, e) : (e.display = "none", e);
  }), p = i(null), m = i(-1), x = i(!1);
  function C(e) {
    const l = M.value;
    if (l.length === 0) return -1;
    let o = 0, t = Math.abs(e - l[0]);
    for (let a = 1; a < l.length; a++) {
      const u = Math.abs(e - l[a]);
      u < t && (t = u, o = a);
    }
    return o;
  }
  let n = null, s = null;
  function D(e) {
    if (!v.value || !g.value) return;
    const l = v.value.getBoundingClientRect();
    r.value = { left: l.left, top: l.top };
    const o = e.clientX - l.left - F.value;
    if (o < 0 || o > X.value) {
      I();
      return;
    }
    const t = C(o);
    if (t < 0) return;
    x.value = !0, m.value = t, p.value = M.value[t] ?? o;
    const a = L.value[t] ?? `#${t + 1}`, u = [];
    for (let c = 0; c < y.value.length; c++) {
      const h = y.value[c], A = h.data[t];
      A && u.push({
        name: h.name,
        value: A.value,
        color: h.color ?? b.value[c % b.value.length]
      });
    }
    d.value = { header: a, rows: u }, f.value = {
      visible: !0,
      x: e.clientX,
      y: e.clientY,
      content: "",
      dataIndex: t,
      seriesIndex: 0
    };
  }
  function I() {
    p.value = null, m.value = -1, x.value = !1, d.value = null, R();
  }
  function H(e) {
    g.value && (s = e, n === null && (n = requestAnimationFrame(() => {
      n = null, s && D(s);
    })));
  }
  function q() {
    n !== null && (cancelAnimationFrame(n), n = null), s = null, I();
  }
  return E(() => {
    n !== null && (cancelAnimationFrame(n), n = null);
  }), {
    crosshairX: p,
    nearestIndex: m,
    isHovering: x,
    tooltipData: d,
    tooltipStyle: $,
    containerRect: r,
    onBodyMouseMove: H,
    onBodyMouseLeave: q
  };
}
export {
  P as default,
  P as useChartInteraction
};

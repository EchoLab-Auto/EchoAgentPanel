function y(d, t) {
  const e = d.getContext("2d");
  function P(h, f = []) {
    var R;
    const { width: c, height: l } = t;
    d.width = c * t.devicePixelRatio, d.height = l * t.devicePixelRatio, e.scale(t.devicePixelRatio, t.devicePixelRatio), e.clearRect(0, 0, c, l);
    const r = h.flatMap((o) => o.data), m = Math.max(...r, 1), g = ((R = h[0]) == null ? void 0 : R.data.length) ?? 0, i = c / Math.max(g, 1), u = i * 0.7 / Math.max(h.length, 1), n = { top: 16, bottom: 32, left: 48 };
    for (let o = 0; o < h.length; o++) {
      const x = h[o];
      e.fillStyle = x.color;
      for (let a = 0; a < x.data.length; a++) {
        const s = x.data[a] / m * (l - n.top - n.bottom), b = n.left + a * i + i * 0.15 + o * u, w = l - n.bottom - s;
        e.fillRect(b, w, u, s);
      }
    }
    e.fillStyle = t.labelColor ?? "#888", e.font = t.labelFont ?? "11px sans-serif", e.textAlign = "center";
    for (let o = 0; o < f.length; o++) {
      const x = n.left + o * i + i / 2;
      e.fillText(f[o], x, l - 8);
    }
    return Promise.resolve(null);
  }
  function v(h) {
    const { width: f, height: c } = t;
    d.width = f * t.devicePixelRatio, d.height = c * t.devicePixelRatio, e.scale(t.devicePixelRatio, t.devicePixelRatio), e.clearRect(0, 0, f, c);
    for (const l of h) {
      if (l.data.length < 2) continue;
      e.strokeStyle = l.color, e.lineWidth = l.lineWidth ?? 2, e.beginPath();
      const r = { top: 16, right: 16, bottom: 32, left: 48 }, m = l.data.map((a) => a.x), g = l.data.map((a) => a.y), i = Math.min(...m), u = Math.max(...m, i + 1), n = Math.min(...g, 0), R = Math.max(...g, n + 1), o = (f - r.left - r.right) / (u - i), x = (c - r.top - r.bottom) / (R - n);
      for (let a = 0; a < l.data.length; a++) {
        const s = r.left + (l.data[a].x - i) * o, b = c - r.bottom - (l.data[a].y - n) * x;
        a === 0 ? e.moveTo(s, b) : e.lineTo(s, b);
      }
      e.stroke();
    }
    return Promise.resolve(null);
  }
  return { renderBarChart: P, renderLineChart: v, destroy: () => {
  } };
}
function C(d, t) {
  const e = {
    width: t.width,
    height: t.height,
    useWorker: t.useWorker ?? !0,
    devicePixelRatio: t.devicePixelRatio ?? (typeof window < "u" && window.devicePixelRatio || 1),
    labelFont: t.labelFont ?? "11px sans-serif",
    labelColor: t.labelColor ?? "#888"
  };
  return y(d, e);
}
export {
  C as createChartRenderer
};

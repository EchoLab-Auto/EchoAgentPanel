function b(d, e) {
  const t = d.getContext("2d");
  function v(h, f = []) {
    var R;
    const { width: c, height: i } = e;
    d.width = c * e.devicePixelRatio, d.height = i * e.devicePixelRatio, t.scale(e.devicePixelRatio, e.devicePixelRatio), t.clearRect(0, 0, c, i);
    const r = h.flatMap((a) => a.data), m = Math.max(...r, 1), g = ((R = h[0]) == null ? void 0 : R.data.length) ?? 0, l = c / Math.max(g, 1), u = l * 0.7 / Math.max(h.length, 1), n = { top: 16, bottom: 32, left: 48 };
    for (let a = 0; a < h.length; a++) {
      const x = h[a];
      t.fillStyle = x.color;
      for (let o = 0; o < x.data.length; o++) {
        const s = x.data[o] / m * (i - n.top - n.bottom), P = n.left + o * l + l * 0.15 + a * u, y = i - n.bottom - s;
        t.fillRect(P, y, u, s);
      }
    }
    t.fillStyle = "#888", t.font = "11px sans-serif", t.textAlign = "center";
    for (let a = 0; a < f.length; a++) {
      const x = n.left + a * l + l / 2;
      t.fillText(f[a], x, i - 8);
    }
    return Promise.resolve(null);
  }
  function w(h) {
    const { width: f, height: c } = e;
    d.width = f * e.devicePixelRatio, d.height = c * e.devicePixelRatio, t.scale(e.devicePixelRatio, e.devicePixelRatio), t.clearRect(0, 0, f, c);
    for (const i of h) {
      if (i.data.length < 2) continue;
      t.strokeStyle = i.color, t.lineWidth = i.lineWidth ?? 2, t.beginPath();
      const r = { top: 16, right: 16, bottom: 32, left: 48 }, m = i.data.map((o) => o.x), g = i.data.map((o) => o.y), l = Math.min(...m), u = Math.max(...m, l + 1), n = Math.min(...g, 0), R = Math.max(...g, n + 1), a = (f - r.left - r.right) / (u - l), x = (c - r.top - r.bottom) / (R - n);
      for (let o = 0; o < i.data.length; o++) {
        const s = r.left + (i.data[o].x - l) * a, P = c - r.bottom - (i.data[o].y - n) * x;
        o === 0 ? t.moveTo(s, P) : t.lineTo(s, P);
      }
      t.stroke();
    }
    return Promise.resolve(null);
  }
  return { renderBarChart: v, renderLineChart: w, destroy: () => {
  } };
}
function M(d, e) {
  const t = {
    width: e.width,
    height: e.height,
    useWorker: e.useWorker ?? !0,
    devicePixelRatio: e.devicePixelRatio ?? (typeof window < "u" && window.devicePixelRatio || 1)
  };
  return b(d, t);
}
export {
  M as createChartRenderer
};

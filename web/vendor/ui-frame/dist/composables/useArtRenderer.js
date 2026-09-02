import { watch as b, onBeforeUnmount as q } from "vue";
import D from "./useReducedMotion.js";
function A(e) {
  let n = e >>> 0 || 1;
  return () => (n = n * 1664525 + 1013904223 >>> 0, n / 4294967295);
}
function w(e, n, l) {
  return e < n ? n : e > l ? l : e;
}
const C = " .·:-=+*#%@";
function O(e) {
  const n = Math.round(w(e, 0, 1) * (C.length - 1));
  return C[n];
}
const x = 1.15, F = 120, Y = {
  init(e) {
    const n = w(8 / e.density, 5, 14);
    e.data = {
      maxCols: Math.max(1, Math.floor(e.width / n)),
      maxRows: Math.max(1, Math.floor(e.height / (n * x))),
      cols: 0,
      rows: 0,
      cellW: 0,
      cellH: 0,
      offsetX: 0,
      offsetY: 0,
      lum: new Float32Array(0),
      ready: !1
    };
  },
  async prepare(e) {
    const n = e.data;
    if (!e.src || typeof Image > "u") return;
    const l = new Image();
    if (l.crossOrigin = "anonymous", await new Promise((u) => {
      l.onload = () => u(), l.onerror = () => u(), l.src = e.src;
    }), !l.width) return;
    const i = l.width / l.height, a = e.width / n.maxCols, o = a * x;
    let h = n.maxCols, t = Math.round(h / (x * i));
    t > n.maxRows && (t = n.maxRows, h = Math.round(t * x * i / 1)), n.cols = Math.max(1, Math.min(h, n.maxCols)), n.rows = Math.max(1, t), n.cellW = a, n.cellH = o, n.offsetX = (e.width - n.cols * a) / 2, n.offsetY = (e.height - n.rows * o) / 2;
    const c = document.createElement("canvas");
    c.width = n.cols, c.height = n.rows;
    const r = c.getContext("2d");
    if (!r) return;
    r.drawImage(l, 0, 0, n.cols, n.rows);
    const f = r.getImageData(0, 0, n.cols, n.rows).data, d = new Float32Array(n.cols * n.rows);
    for (let u = 0; u < d.length; u++) {
      const M = u * 4;
      d[u] = (0.2126 * f[M] + 0.7152 * f[M + 1] + 0.0722 * f[M + 2]) / 255;
    }
    let v = 1, y = 0;
    for (let u = 0; u < d.length; u++)
      d[u] < v && (v = d[u]), d[u] > y && (y = d[u]);
    const m = y - v;
    if (m > 0.02)
      for (let u = 0; u < d.length; u++) d[u] = (d[u] - v) / m;
    n.lum = d, n.ready = !0;
  },
  render(e, n, l) {
    const i = n.data;
    if (e.fillStyle = n.bg, e.fillRect(0, 0, n.width, n.height), !i.ready) return;
    const a = l * n.speed, o = n.reactive && n.pointer.active, h = n.palette[0] ?? n.fg;
    e.textAlign = "center", e.textBaseline = "middle";
    for (let t = 0; t < i.rows; t++)
      for (let c = 0; c < i.cols; c++) {
        const r = i.offsetX + (c + 0.5) * i.cellW, f = i.offsetY + (t + 0.5) * i.cellH;
        let d = i.lum[t * i.cols + c];
        d *= 0.85 + 0.15 * Math.sin(a * 1.6 + (c + t) * 0.12);
        let v = 0;
        if (o) {
          const m = Math.hypot(r - n.pointer.x, f - n.pointer.y);
          m < F && (v = 1 - m / F), d += v * 0.35;
        }
        const y = O(d);
        y !== " " && (d > 0.78 ? (e.fillStyle = h, e.globalAlpha = 1) : (e.fillStyle = n.fg, e.globalAlpha = w(0.3 + 0.7 * d, 0, 1)), e.font = `${i.cellH * (1 + v * 0.25)}px ui-monospace, monospace`, e.fillText(y, r, f));
      }
    e.globalAlpha = 1;
  }
}, N = 160, V = {
  init(e) {
    const n = A(e.seed), l = Math.min(8, Math.max(5, Math.round(5 * e.density))), i = Math.max(e.palette.length, 1), a = [];
    for (let o = 0; o < l; o++)
      a.push({
        x: n() * e.width,
        y: n() * e.height,
        r: 22 + n() * 26,
        vx: (n() - 0.5) * 26,
        vy: (n() - 0.5) * 26,
        colorIdx: o % i
      });
    e.data = { blobs: a, lastT: 0 };
  },
  render(e, n, l) {
    const i = n.data, a = w(l - i.lastT, 0, 0.05) * n.speed;
    i.lastT = l, e.fillStyle = n.bg, e.fillRect(0, 0, n.width, n.height);
    for (const o of i.blobs) {
      if (o.x += o.vx * a, o.y += o.vy * a, (o.x < o.r || o.x > n.width - o.r) && (o.vx = -o.vx), (o.y < o.r || o.y > n.height - o.r) && (o.vy = -o.vy), o.x = w(o.x, o.r, n.width - o.r), o.y = w(o.y, o.r, n.height - o.r), n.reactive && n.pointer.active) {
        const h = o.x - n.pointer.x, t = o.y - n.pointer.y, c = Math.hypot(h, t);
        c < N && c > 1 && (o.vx += h / c * 46 * a, o.vy += t / c * 46 * a);
      }
      e.globalAlpha = 0.85, e.fillStyle = n.palette[o.colorIdx], e.beginPath(), e.arc(o.x, o.y, o.r, 0, Math.PI * 2), e.fill();
    }
    e.globalAlpha = 1;
  }
}, _ = 110, X = 140, k = {
  init(e) {
    const n = A(e.seed), l = Math.round(48 * w(e.density, 0.5, 3)), i = [];
    for (let a = 0; a < l; a++)
      i.push({
        x: n() * e.width,
        y: n() * e.height,
        vx: (n() - 0.5) * 36,
        vy: (n() - 0.5) * 36
      });
    e.data = { particles: i, lastT: 0 };
  },
  render(e, n, l) {
    const i = n.data, a = w(l - i.lastT, 0, 0.05) * n.speed;
    i.lastT = l;
    const o = n.palette[0] ?? "#888";
    e.fillStyle = n.bg, e.fillRect(0, 0, n.width, n.height);
    for (const t of i.particles)
      if (t.x += t.vx * a, t.y += t.vy * a, (t.x < 0 || t.x > n.width) && (t.vx = -t.vx), (t.y < 0 || t.y > n.height) && (t.vy = -t.vy), t.x = w(t.x, 0, n.width), t.y = w(t.y, 0, n.height), n.reactive && n.pointer.active) {
        const c = n.pointer.x - t.x, r = n.pointer.y - t.y, f = Math.hypot(c, r);
        f < X && f > 1 && (t.vx += c / f * 30 * a, t.vy += r / f * 30 * a);
      }
    e.strokeStyle = o, e.lineWidth = 1;
    const h = i.particles;
    for (let t = 0; t < h.length; t++)
      for (let c = t + 1; c < h.length; c++) {
        const r = Math.hypot(h[t].x - h[c].x, h[t].y - h[c].y);
        r < _ && (e.globalAlpha = (1 - r / _) * 0.45, e.beginPath(), e.moveTo(h[t].x, h[t].y), e.lineTo(h[c].x, h[c].y), e.stroke());
      }
    e.globalAlpha = 0.9, e.fillStyle = o;
    for (const t of h)
      e.beginPath(), e.arc(t.x, t.y, 2.2, 0, Math.PI * 2), e.fill();
    e.globalAlpha = 1;
  }
};
function $(e, n, l, i, a, o) {
  const h = Math.hypot(e - l, n - i);
  return 0.5 + 0.5 * Math.sin(h * 0.045 - o * 2 + a);
}
const U = {
  init(e) {
    const n = Math.max(18, 26 / e.density), l = Math.ceil(e.width / n) + 1, i = Math.ceil(e.height / n) + 1, a = A(e.seed), o = l * i, h = new Float32Array(o), t = new Uint8Array(o);
    for (let c = 0; c < o; c++)
      h[c] = a() * Math.PI * 2, t[c] = a() < 0.8 ? 0 : 1 % Math.max(e.palette.length, 1);
    e.data = { cols: l, rows: i, spacing: n, phases: h, colorIdx: t };
  },
  render(e, n, l) {
    const i = n.data, a = l * n.speed, o = n.reactive && n.pointer.active ? n.pointer.x : n.width / 2, h = n.reactive && n.pointer.active ? n.pointer.y : n.height / 2, t = Math.max(n.palette.length, 1);
    e.fillStyle = n.bg, e.fillRect(0, 0, n.width, n.height);
    for (let c = 0; c < i.rows; c++)
      for (let r = 0; r < i.cols; r++) {
        const f = c * i.cols + r, d = $(r * i.spacing, c * i.spacing, o, h, i.phases[f], a), v = i.spacing * 0.14 * (0.4 + 0.8 * d);
        e.globalAlpha = 0.35 + 0.6 * d, e.fillStyle = n.palette[i.colorIdx[f] % t], e.beginPath(), e.arc(r * i.spacing, c * i.spacing, v, 0, Math.PI * 2), e.fill();
      }
    e.globalAlpha = 1;
  }
};
function j(e, n, l, i, a) {
  let o = n + l.amplitude * Math.sin(e * l.frequency + i * l.speed + l.phase) + l.amplitude * 0.35 * Math.sin(e * l.frequency * 2.7 + i * l.speed * 1.4);
  if (a != null && a.active) {
    const h = e - a.x;
    o -= 18 * Math.exp(-(h * h) / (2 * 90 * 90));
  }
  return o;
}
const z = {
  init(e) {
    const n = A(e.seed), l = Math.min(5, Math.max(3, Math.round(3 * e.density))), i = [];
    for (let a = 0; a < l; a++)
      i.push({
        amplitude: e.height * 0.07 * (1 + a * 0.45),
        frequency: 8e-3 / (1 + a * 0.3),
        speed: 0.5 + a * 0.28,
        phase: n() * Math.PI * 2,
        yRatio: 0.5 + 0.13 * a,
        alpha: 0.16
      });
    e.data = { layers: i };
  },
  render(e, n, l) {
    const i = n.data, a = l * n.speed, o = Math.max(n.palette.length, 1), h = n.reactive ? n.pointer : void 0;
    e.fillStyle = n.bg, e.fillRect(0, 0, n.width, n.height), i.layers.forEach((t, c) => {
      const r = n.height * t.yRatio;
      e.globalAlpha = t.alpha, e.fillStyle = n.palette[c % o], e.beginPath(), e.moveTo(0, n.height);
      for (let f = 0; f <= n.width; f += 8)
        e.lineTo(f, j(f, r, t, a, h));
      e.lineTo(n.width, n.height), e.closePath(), e.fill();
    }), e.globalAlpha = 1;
  }
}, H = {
  "pixel-field": U,
  particles: k,
  waves: z,
  goo: V,
  ascii: Y
}, K = [
  "--nm-primary-color",
  "--nm-color-info",
  "--nm-color-success",
  "--nm-color-warning"
];
function Q(e) {
  const { isReducedMotion: n } = D();
  let l = null, i = 0, a = 0, o = null, h = null, t = !1;
  const c = typeof window < "u" && window.matchMedia("(pointer: coarse)").matches, r = {
    width: 0,
    height: 0,
    palette: [],
    bg: "",
    fg: "",
    density: 1,
    speed: 1,
    reactive: !1,
    seed: 1,
    src: void 0,
    pointer: { x: 0, y: 0, active: !1 },
    data: null
  };
  function f(s) {
    const p = getComputedStyle(s);
    r.palette = K.map((g) => p.getPropertyValue(g).trim()).filter(Boolean), r.bg = p.getPropertyValue("--nm-bg-color").trim(), r.fg = p.getPropertyValue("--nm-text-primary").trim();
  }
  function d() {
    return H[e.effect.value] ?? H["pixel-field"];
  }
  let v = 0;
  async function y() {
    var E, S;
    if (!e.canvas.value) return;
    const p = ++v;
    r.density = e.density.value, r.speed = e.speed.value, r.reactive = e.reactive.value && !c && !n.value, r.seed = e.seed.value ?? Math.floor(Math.random() * 4294967295), r.src = e.src.value, (E = e.palette.value) != null && E.length && (r.palette = e.palette.value);
    const g = d();
    g.init(r), m(0.7), await ((S = g.prepare) == null ? void 0 : S.call(g, r)), p === v && m(0.7);
  }
  function m(s) {
    l && d().render(l, r, s);
  }
  function u(s) {
    t && (m((s - a) / 1e3), i = requestAnimationFrame(u));
  }
  function M() {
    t || n.value || (t = !0, a = performance.now(), i = requestAnimationFrame(u));
  }
  function T() {
    t = !1, i && cancelAnimationFrame(i), i = 0;
  }
  function P() {
    const s = e.canvas.value;
    if (!s) return;
    const p = s.getBoundingClientRect(), g = Math.min(window.devicePixelRatio || 1, 2);
    s.width = Math.max(1, Math.round(p.width * g)), s.height = Math.max(1, Math.round(p.height * g)), r.width = p.width, r.height = p.height, l = s.getContext("2d"), l == null || l.setTransform(g, 0, 0, g, 0, 0);
  }
  function R(s) {
    const p = e.canvas.value;
    if (!p) return;
    const g = p.getBoundingClientRect();
    r.pointer.x = s.clientX - g.left, r.pointer.y = s.clientY - g.top, r.pointer.active = !0;
  }
  function I() {
    r.pointer.active = !1;
  }
  function L(s) {
    s.addEventListener("pointermove", R), s.addEventListener("pointerleave", I);
  }
  function B(s) {
    s.removeEventListener("pointermove", R), s.removeEventListener("pointerleave", I);
  }
  const W = b(
    e.canvas,
    (s) => {
      var p;
      s && ((p = e.palette.value) != null && p.length ? r.palette = e.palette.value : f(s), P(), y(), M(), L(s), o = new ResizeObserver(() => {
        P(), y();
      }), o.observe(s), h = new MutationObserver(() => {
        var g;
        (g = e.palette.value) != null && g.length || (f(s), m(performance.now() / 1e3));
      }), h.observe(document.documentElement, {
        attributes: !0,
        attributeFilter: ["data-theme"]
      }));
    },
    { immediate: !0, flush: "post" }
  );
  return b([e.effect, e.density, e.seed, e.src], () => {
    e.canvas.value && y();
  }), b(e.palette, () => {
    var p;
    const s = e.canvas.value;
    s && ((p = e.palette.value) != null && p.length ? r.palette = e.palette.value : f(s), m(performance.now() / 1e3));
  }), b(
    () => e.reactive.value,
    (s) => {
      r.reactive = s && !c && !n.value, r.reactive || (r.pointer.active = !1);
    }
  ), b(e.speed, (s) => {
    r.speed = s;
  }), b(n, (s) => {
    r.reactive = e.reactive.value && !c && !s, s ? (T(), m(0.7)) : M();
  }), q(() => {
    T(), W(), o == null || o.disconnect(), h == null || h.disconnect(), e.canvas.value && B(e.canvas.value);
  }), { start: M, stop: T };
}
export {
  Q as useArtRenderer
};

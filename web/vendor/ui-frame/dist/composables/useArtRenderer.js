import { watch as X, onBeforeUnmount as K } from "vue";
import Q from "./useReducedMotion.js";
function D(e) {
  let n = e >>> 0 || 1;
  return () => (n = n * 1664525 + 1013904223 >>> 0, n / 4294967295);
}
function T(e, n, t) {
  return e < n ? n : e > t ? t : e;
}
const N = " .·:-=+*#%@";
function q(e) {
  const n = Math.round(T(e, 0, 1) * (N.length - 1));
  return N[n];
}
const L = 1.15, F = 32, Z = 1.6, J = 0.12, H = 120, ee = H * H;
function ne() {
  return {
    maxCols: 1,
    maxRows: 1,
    cols: 0,
    rows: 0,
    cellW: 0,
    cellH: 0,
    offsetX: 0,
    offsetY: 0,
    lum: new Float32Array(0),
    ready: !1,
    phase: new Float32Array(0),
    colX: new Float32Array(0),
    rowY: new Float32Array(0),
    lvX: [],
    lvY: [],
    hotX: new Float32Array(0),
    hotY: new Float32Array(0),
    hotV: new Float32Array(0),
    hotB: new Float32Array(0)
  };
}
function W(e) {
  const n = Math.max(1, e.cols * e.rows);
  e.phase = new Float32Array(n);
  for (let t = 0, o = 0; t < e.rows; t++)
    for (let a = 0; a < e.cols; a++, o++) e.phase[o] = (a + t) * J;
  e.colX = new Float32Array(Math.max(1, e.cols));
  for (let t = 0; t < e.cols; t++) e.colX[t] = e.offsetX + (t + 0.5) * e.cellW;
  e.rowY = new Float32Array(Math.max(1, e.rows));
  for (let t = 0; t < e.rows; t++) e.rowY[t] = e.offsetY + (t + 0.5) * e.cellH;
  e.lvX = [], e.lvY = [];
  for (let t = 0; t < F; t++)
    e.lvX.push([]), e.lvY.push([]);
  e.hotX = new Float32Array(n), e.hotY = new Float32Array(n), e.hotV = new Float32Array(n), e.hotB = new Float32Array(n);
}
const oe = {
  init(e) {
    const n = T(8 / e.density, 5, 14), t = ne();
    t.maxCols = Math.max(1, Math.floor(e.width / n)), t.maxRows = Math.max(1, Math.floor(e.height / (n * L))), e.data = t;
  },
  async prepare(e) {
    const n = e.data;
    if (!e.src || typeof Image > "u") return;
    const t = new Image();
    if (t.crossOrigin = "anonymous", await new Promise((f) => {
      t.onload = () => f(), t.onerror = () => f(), t.src = e.src;
    }), !t.width) return;
    const o = t.width / t.height, a = e.width / n.maxCols, i = a * L;
    let s = n.maxCols, l = Math.round(s / (L * o));
    l > n.maxRows && (l = n.maxRows, s = Math.round(l * L * o / 1)), n.cols = Math.max(1, Math.min(s, n.maxCols)), n.rows = Math.max(1, l), n.cellW = a, n.cellH = i, n.offsetX = (e.width - n.cols * a) / 2, n.offsetY = (e.height - n.rows * i) / 2;
    const h = document.createElement("canvas");
    h.width = n.cols, h.height = n.rows;
    const u = h.getContext("2d");
    if (!u) return;
    u.drawImage(t, 0, 0, n.cols, n.rows);
    const v = u.getImageData(0, 0, n.cols, n.rows).data, d = new Float32Array(n.cols * n.rows);
    for (let f = 0; f < d.length; f++) {
      const M = f * 4;
      d[f] = (0.2126 * v[M] + 0.7152 * v[M + 1] + 0.0722 * v[M + 2]) / 255;
    }
    let m = 1, R = 0;
    for (let f = 0; f < d.length; f++)
      d[f] < m && (m = d[f]), d[f] > R && (R = d[f]);
    const I = R - m;
    if (I > 0.02)
      for (let f = 0; f < d.length; f++) d[f] = (d[f] - m) / I;
    n.lum = d, W(n), n.ready = !0;
  },
  render(e, n, t) {
    const o = n.data;
    if (e.fillStyle = n.bg, e.fillRect(0, 0, n.width, n.height), !o.ready) return;
    (o.colX.length !== o.cols || o.phase.length !== o.cols * o.rows) && W(o);
    const a = t * n.speed, i = n.reactive && n.pointer.active, s = n.pointer.x, l = n.pointer.y, h = n.palette[0] ?? n.fg, u = o.cols, v = o.rows, d = o.lum, m = o.phase, R = o.colX, I = o.rowY;
    for (let r = 0; r < F; r++)
      o.lvX[r].length = 0, o.lvY[r].length = 0;
    let f = 0, M = 0;
    for (let r = 0; r < v; r++) {
      const y = I[r];
      for (let w = 0; w < u; w++, M++) {
        const x = d[M] * (0.85 + 0.15 * Math.sin(a * Z + m[M]));
        if (i) {
          const E = R[w], S = E - s, P = y - l, Y = S * S + P * P;
          if (Y < ee) {
            const _ = 1 - Math.sqrt(Y) / H;
            o.hotX[f] = E, o.hotY[f] = y, o.hotV[f] = x + _ * 0.35, o.hotB[f] = _, f++;
            continue;
          }
        }
        const b = x * F | 0;
        if (b < 2) continue;
        const A = b < F ? b : F - 1;
        o.lvX[A].push(R[w]), o.lvY[A].push(y);
      }
    }
    e.textAlign = "center", e.textBaseline = "middle", e.font = `${o.cellH}px ui-monospace, monospace`;
    for (let r = 2; r < F; r++) {
      const y = o.lvX[r], w = y.length;
      if (w === 0) continue;
      const x = (r + 0.5) / F, b = q(x);
      if (b === " ") continue;
      x > 0.78 ? (e.fillStyle = h, e.globalAlpha = 1) : (e.fillStyle = n.fg, e.globalAlpha = T(0.3 + 0.7 * x, 0, 1));
      const A = o.lvY[r];
      for (let E = 0; E < w; E++) e.fillText(b, y[E], A[E]);
    }
    if (f > 0)
      for (let r = 0; r < f; r++) {
        const y = o.hotV[r], w = q(y);
        w !== " " && (y > 0.78 ? (e.fillStyle = h, e.globalAlpha = 1) : (e.fillStyle = n.fg, e.globalAlpha = T(0.3 + 0.7 * y, 0, 1)), e.font = `${o.cellH * (1 + o.hotB[r] * 0.25)}px ui-monospace, monospace`, e.fillText(w, o.hotX[r], o.hotY[r]));
      }
    e.globalAlpha = 1;
  }
}, te = 160, ie = {
  init(e) {
    const n = D(e.seed), t = Math.min(8, Math.max(5, Math.round(5 * e.density))), o = Math.max(e.palette.length, 1), a = [];
    for (let i = 0; i < t; i++)
      a.push({
        x: n() * e.width,
        y: n() * e.height,
        r: 22 + n() * 26,
        vx: (n() - 0.5) * 26,
        vy: (n() - 0.5) * 26,
        colorIdx: i % o
      });
    e.data = { blobs: a, lastT: 0 };
  },
  render(e, n, t) {
    const o = n.data, a = T(t - o.lastT, 0, 0.05) * n.speed;
    o.lastT = t, e.fillStyle = n.bg, e.fillRect(0, 0, n.width, n.height);
    for (const i of o.blobs) {
      if (i.x += i.vx * a, i.y += i.vy * a, (i.x < i.r || i.x > n.width - i.r) && (i.vx = -i.vx), (i.y < i.r || i.y > n.height - i.r) && (i.vy = -i.vy), i.x = T(i.x, i.r, n.width - i.r), i.y = T(i.y, i.r, n.height - i.r), n.reactive && n.pointer.active) {
        const s = i.x - n.pointer.x, l = i.y - n.pointer.y, h = Math.hypot(s, l);
        h < te && h > 1 && (i.vx += s / h * 46 * a, i.vy += l / h * 46 * a);
      }
      e.globalAlpha = 0.85, e.fillStyle = n.palette[i.colorIdx], e.beginPath(), e.arc(i.x, i.y, i.r, 0, Math.PI * 2), e.fill();
    }
    e.globalAlpha = 1;
  }
}, $ = 110, le = 140, re = {
  init(e) {
    const n = D(e.seed), t = Math.round(48 * T(e.density, 0.5, 3)), o = [];
    for (let a = 0; a < t; a++)
      o.push({
        x: n() * e.width,
        y: n() * e.height,
        vx: (n() - 0.5) * 36,
        vy: (n() - 0.5) * 36
      });
    e.data = { particles: o, lastT: 0 };
  },
  render(e, n, t) {
    const o = n.data, a = T(t - o.lastT, 0, 0.05) * n.speed;
    o.lastT = t;
    const i = n.palette[0] ?? "#888";
    e.fillStyle = n.bg, e.fillRect(0, 0, n.width, n.height);
    for (const l of o.particles)
      if (l.x += l.vx * a, l.y += l.vy * a, (l.x < 0 || l.x > n.width) && (l.vx = -l.vx), (l.y < 0 || l.y > n.height) && (l.vy = -l.vy), l.x = T(l.x, 0, n.width), l.y = T(l.y, 0, n.height), n.reactive && n.pointer.active) {
        const h = n.pointer.x - l.x, u = n.pointer.y - l.y, v = Math.hypot(h, u);
        v < le && v > 1 && (l.vx += h / v * 30 * a, l.vy += u / v * 30 * a);
      }
    e.strokeStyle = i, e.lineWidth = 1;
    const s = o.particles;
    for (let l = 0; l < s.length; l++)
      for (let h = l + 1; h < s.length; h++) {
        const u = Math.hypot(s[l].x - s[h].x, s[l].y - s[h].y);
        u < $ && (e.globalAlpha = (1 - u / $) * 0.45, e.beginPath(), e.moveTo(s[l].x, s[l].y), e.lineTo(s[h].x, s[h].y), e.stroke());
      }
    e.globalAlpha = 0.9, e.fillStyle = i;
    for (const l of s)
      e.beginPath(), e.arc(l.x, l.y, 2.2, 0, Math.PI * 2), e.fill();
    e.globalAlpha = 1;
  }
};
function ae(e, n, t, o, a, i) {
  const s = Math.hypot(e - t, n - o);
  return 0.5 + 0.5 * Math.sin(s * 0.045 - i * 2 + a);
}
const ce = {
  init(e) {
    const n = Math.max(18, 26 / e.density), t = Math.ceil(e.width / n) + 1, o = Math.ceil(e.height / n) + 1, a = D(e.seed), i = t * o, s = new Float32Array(i), l = new Uint8Array(i);
    for (let h = 0; h < i; h++)
      s[h] = a() * Math.PI * 2, l[h] = a() < 0.8 ? 0 : 1 % Math.max(e.palette.length, 1);
    e.data = { cols: t, rows: o, spacing: n, phases: s, colorIdx: l };
  },
  render(e, n, t) {
    const o = n.data, a = t * n.speed, i = n.reactive && n.pointer.active ? n.pointer.x : n.width / 2, s = n.reactive && n.pointer.active ? n.pointer.y : n.height / 2, l = Math.max(n.palette.length, 1);
    e.fillStyle = n.bg, e.fillRect(0, 0, n.width, n.height);
    for (let h = 0; h < o.rows; h++)
      for (let u = 0; u < o.cols; u++) {
        const v = h * o.cols + u, d = ae(u * o.spacing, h * o.spacing, i, s, o.phases[v], a), m = o.spacing * 0.14 * (0.4 + 0.8 * d);
        e.globalAlpha = 0.35 + 0.6 * d, e.fillStyle = n.palette[o.colorIdx[v] % l], e.beginPath(), e.arc(u * o.spacing, h * o.spacing, m, 0, Math.PI * 2), e.fill();
      }
    e.globalAlpha = 1;
  }
};
function se(e, n, t, o, a) {
  let i = n + t.amplitude * Math.sin(e * t.frequency + o * t.speed + t.phase) + t.amplitude * 0.35 * Math.sin(e * t.frequency * 2.7 + o * t.speed * 1.4);
  if (a != null && a.active) {
    const s = e - a.x;
    i -= 18 * Math.exp(-(s * s) / (2 * 90 * 90));
  }
  return i;
}
const he = {
  init(e) {
    const n = D(e.seed), t = Math.min(5, Math.max(3, Math.round(3 * e.density))), o = [];
    for (let a = 0; a < t; a++)
      o.push({
        amplitude: e.height * 0.07 * (1 + a * 0.45),
        frequency: 8e-3 / (1 + a * 0.3),
        speed: 0.5 + a * 0.28,
        phase: n() * Math.PI * 2,
        yRatio: 0.5 + 0.13 * a,
        alpha: 0.16
      });
    e.data = { layers: o };
  },
  render(e, n, t) {
    const o = n.data, a = t * n.speed, i = Math.max(n.palette.length, 1), s = n.reactive ? n.pointer : void 0;
    e.fillStyle = n.bg, e.fillRect(0, 0, n.width, n.height), o.layers.forEach((l, h) => {
      const u = n.height * l.yRatio;
      e.globalAlpha = l.alpha, e.fillStyle = n.palette[h % i], e.beginPath(), e.moveTo(0, n.height);
      for (let v = 0; v <= n.width; v += 8)
        e.lineTo(v, se(v, u, l, a, s));
      e.lineTo(n.width, n.height), e.closePath(), e.fill();
    }), e.globalAlpha = 1;
  }
}, k = {
  "pixel-field": ce,
  particles: re,
  waves: he,
  goo: ie,
  ascii: oe
}, fe = [
  "--nm-primary-color",
  "--nm-color-info",
  "--nm-color-success",
  "--nm-color-warning"
], ue = 140, de = 120, pe = "80px";
function me(e) {
  const { isReducedMotion: n } = Q();
  let t = null, o = 0, a = 0, i = null, s = null, l = !1, h = !0, u = null, v = !1, d, m, R = 0, I = 0;
  const f = e.idleFps && e.idleFps > 0 ? 1e3 / e.idleFps : 0, M = typeof window < "u" && window.matchMedia("(pointer: coarse)").matches, r = {
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
  function y(c) {
    const g = getComputedStyle(c);
    r.palette = fe.map((p) => g.getPropertyValue(p).trim()).filter(Boolean), r.bg = g.getPropertyValue("--nm-bg-color").trim(), r.fg = g.getPropertyValue("--nm-text-primary").trim();
  }
  function w() {
    return k[e.effect.value] ?? k["pixel-field"];
  }
  let x = 0;
  async function b() {
    var B, C;
    if (!e.canvas.value) return;
    const g = ++x;
    r.density = e.density.value, r.speed = e.speed.value, r.reactive = e.reactive.value && !M && !n.value, r.seed = e.seed.value ?? Math.floor(Math.random() * 4294967295), r.src = e.src.value, (B = e.palette.value) != null && B.length && (r.palette = e.palette.value);
    const p = w();
    p.init(r), A(0.7), await ((C = p.prepare) == null ? void 0 : C.call(p, r)), g === x && A(0.7);
  }
  function A(c) {
    t && w().render(t, r, c);
  }
  function E(c) {
    l && (!v && h && (!f || r.pointer.active || c - R >= f - 1) && (A((c - a) / 1e3), R = c), o = requestAnimationFrame(E));
  }
  function S() {
    l || n.value || (l = !0, a = performance.now(), o = requestAnimationFrame(E));
  }
  function P() {
    l = !1, o && cancelAnimationFrame(o), o = 0;
  }
  function Y() {
    const c = e.canvas.value;
    if (!c) return;
    const g = c.getBoundingClientRect(), p = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.max(1, Math.round(g.width * p)), c.height = Math.max(1, Math.round(g.height * p)), r.width = g.width, r.height = g.height, I = p, t = c.getContext("2d"), t == null || t.setTransform(p, 0, 0, p, 0, 0);
  }
  function _(c) {
    const g = e.canvas.value;
    if (!g) return;
    const p = g.getBoundingClientRect();
    r.pointer.x = c.clientX - p.left, r.pointer.y = c.clientY - p.top, r.pointer.active = !0;
  }
  function O() {
    r.pointer.active = !1;
  }
  function z(c) {
    c.addEventListener("pointermove", _), c.addEventListener("pointerleave", O);
  }
  function U(c) {
    c.removeEventListener("pointermove", _), c.removeEventListener("pointerleave", O);
  }
  function V() {
    v = !0, d !== void 0 && clearTimeout(d), d = setTimeout(() => {
      d = void 0, v = !1;
    }, ue);
  }
  function j() {
    const c = e.canvas.value;
    c && (m !== void 0 && clearTimeout(m), m = setTimeout(() => {
      m = void 0;
      const g = c.getBoundingClientRect(), p = Math.min(window.devicePixelRatio || 1, 2);
      g.width === r.width && g.height === r.height && p === I || (Y(), b());
    }, de));
  }
  typeof window < "u" && window.addEventListener("scroll", V, { capture: !0, passive: !0 });
  const G = X(
    e.canvas,
    (c) => {
      var g;
      c && ((g = e.palette.value) != null && g.length ? r.palette = e.palette.value : y(c), Y(), b(), S(), z(c), i = new ResizeObserver(() => j()), i.observe(c), typeof IntersectionObserver < "u" && (u = new IntersectionObserver(
        (p) => {
          const B = p[p.length - 1];
          if (!B) return;
          const C = B.isIntersecting;
          C !== h && (h = C, C ? S() : P());
        },
        { rootMargin: pe }
      ), u.observe(c)), s = new MutationObserver(() => {
        var p;
        (p = e.palette.value) != null && p.length || (y(c), A(performance.now() / 1e3));
      }), s.observe(document.documentElement, {
        attributes: !0,
        attributeFilter: ["data-theme"]
      }));
    },
    { immediate: !0, flush: "post" }
  );
  return X([e.effect, e.density, e.seed, e.src], () => {
    e.canvas.value && b();
  }), X(e.palette, () => {
    var g;
    const c = e.canvas.value;
    c && ((g = e.palette.value) != null && g.length ? r.palette = e.palette.value : y(c), A(performance.now() / 1e3));
  }), X(
    () => e.reactive.value,
    (c) => {
      r.reactive = c && !M && !n.value, r.reactive || (r.pointer.active = !1);
    }
  ), X(e.speed, (c) => {
    r.speed = c;
  }), X(n, (c) => {
    r.reactive = e.reactive.value && !M && !c, c ? (P(), A(0.7)) : S();
  }), K(() => {
    P(), G(), m !== void 0 && clearTimeout(m), d !== void 0 && clearTimeout(d), i == null || i.disconnect(), u == null || u.disconnect(), s == null || s.disconnect(), typeof window < "u" && window.removeEventListener("scroll", V, { capture: !0 }), e.canvas.value && U(e.canvas.value);
  }), { start: S, stop: P };
}
export {
  me as useArtRenderer
};

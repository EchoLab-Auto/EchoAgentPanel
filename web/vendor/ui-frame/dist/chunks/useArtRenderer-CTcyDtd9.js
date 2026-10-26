import { watch as D, onBeforeUnmount as pe } from "vue";
import ye from "../composables/useReducedMotion.js";
function q(e) {
  let n = e >>> 0 || 1;
  return () => (n = n * 1664525 + 1013904223 >>> 0, n / 4294967295);
}
function P(e, n, t) {
  return e < n ? n : e > t ? t : e;
}
const me = 160, we = {
  init(e) {
    const n = q(e.seed), t = Math.min(8, Math.max(5, Math.round(5 * e.density))), l = Math.max(e.palette.length, 1), i = [];
    for (let o = 0; o < t; o++)
      i.push({
        x: n() * e.width,
        y: n() * e.height,
        r: 22 + n() * 26,
        vx: (n() - 0.5) * 26,
        vy: (n() - 0.5) * 26,
        colorIdx: o % l
      });
    e.data = { blobs: i, lastT: 0 };
  },
  render(e, n, t) {
    const l = n.data, i = P(t - l.lastT, 0, 0.05) * n.speed;
    l.lastT = t, e.fillStyle = n.bg, e.fillRect(0, 0, n.width, n.height);
    for (const o of l.blobs) {
      if (o.x += o.vx * i, o.y += o.vy * i, (o.x < o.r || o.x > n.width - o.r) && (o.vx = -o.vx), (o.y < o.r || o.y > n.height - o.r) && (o.vy = -o.vy), o.x = P(o.x, o.r, n.width - o.r), o.y = P(o.y, o.r, n.height - o.r), n.reactive && n.pointer.active) {
        const c = o.x - n.pointer.x, r = o.y - n.pointer.y, s = Math.hypot(c, r);
        s < me && s > 1 && (o.vx += c / s * 46 * i, o.vy += r / s * 46 * i);
      }
      e.globalAlpha = 0.85, e.fillStyle = n.palette[o.colorIdx], e.beginPath(), e.arc(o.x, o.y, o.r, 0, Math.PI * 2), e.fill();
    }
    e.globalAlpha = 1;
  }
}, b = 32, $ = 2, re = 1.6, ge = 0.12, V = 120, ce = V * V;
async function Me(e) {
  if (typeof Image > "u") return null;
  const n = new Image();
  return n.crossOrigin = "anonymous", await new Promise((t) => {
    n.onload = () => t(), n.onerror = () => t(), n.src = e;
  }), n.width ? n : null;
}
function Ae(e, n, t, l, i) {
  let o = l, c = Math.round(o * n / (t * e));
  return c > i && (c = i, o = Math.round(c * t * e / n)), {
    cols: Math.max(1, Math.min(o, l)),
    rows: Math.max(1, Math.min(c, i))
  };
}
function Te(e, n, t) {
  if (typeof document > "u") return null;
  const l = document.createElement("canvas");
  l.width = n, l.height = t;
  const i = l.getContext("2d");
  if (!i) return null;
  i.drawImage(e, 0, 0, n, t);
  const o = i.getImageData(0, 0, n, t).data, c = new Float32Array(n * t);
  for (let u = 0; u < c.length; u++) {
    const M = u * 4;
    c[u] = (0.2126 * o[M] + 0.7152 * o[M + 1] + 0.0722 * o[M + 2]) / 255;
  }
  let r = 1, s = 0;
  for (let u = 0; u < c.length; u++)
    c[u] < r && (r = c[u]), c[u] > s && (s = c[u]);
  const d = s - r;
  if (d > 0.02)
    for (let u = 0; u < c.length; u++) c[u] = (c[u] - r) / d;
  return c;
}
function ae(e, n) {
  const t = Math.max(1, e * n), l = new Float32Array(t), i = new Float32Array(t), o = new Float32Array(t);
  for (let c = 0, r = 0; c < n; c++)
    for (let s = 0; s < e; s++, r++) {
      const d = (s + c) * ge;
      l[r] = d, i[r] = Math.cos(d), o[r] = Math.sin(d);
    }
  return { phase: l, cosPhase: i, sinPhase: o };
}
function se(e, n, t, l, i) {
  return 0.85 + 0.15 * (e * t[i] + n * l[i]);
}
function he(e) {
  const n = new Float32Array(Math.max(1, e.cols));
  for (let l = 0; l < e.cols; l++) n[l] = e.offsetX + (l + 0.5) * e.cellW;
  const t = new Float32Array(Math.max(1, e.rows));
  for (let l = 0; l < e.rows; l++) t[l] = e.offsetY + (l + 0.5) * e.cellH;
  return { colX: n, rowY: t };
}
function W(e, n) {
  const t = n.palette[0] ?? n.fg;
  if (e > 0.78) return { style: t, alpha: 1 };
  const l = 0.3 + 0.7 * e;
  return { style: n.fg, alpha: l < 0 ? 0 : l > 1 ? 1 : l };
}
const Z = " .·:-=+*#%@";
function J(e) {
  const n = Math.round(P(e, 0, 1) * (Z.length - 1));
  return Z[n];
}
const be = 1.15;
function Pe() {
  return {
    phase: new Float32Array(0),
    cosPhase: new Float32Array(0),
    sinPhase: new Float32Array(0),
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
const ue = {
  name: "ascii",
  cell(e) {
    const n = P(8 / e.density, 5, 14);
    return { w: n, h: n * be };
  },
  create() {
    return Pe();
  },
  build(e, n) {
    const t = n, l = Math.max(1, e.cols * e.rows), i = ae(e.cols, e.rows);
    t.phase = i.phase, t.cosPhase = i.cosPhase, t.sinPhase = i.sinPhase;
    const o = he(e);
    t.colX = o.colX, t.rowY = o.rowY, t.lvX = [], t.lvY = [];
    for (let c = 0; c < b; c++)
      t.lvX.push([]), t.lvY.push([]);
    t.hotX = new Float32Array(l), t.hotY = new Float32Array(l), t.hotV = new Float32Array(l), t.hotB = new Float32Array(l);
  },
  draw(e, n, t, l, i) {
    const o = l;
    (o.colX.length !== n.cols || o.phase.length !== n.cols * n.rows) && ue.build(n, o);
    const r = i * t.speed * re, s = Math.sin(r), d = Math.cos(r), u = o.cosPhase, M = o.sinPhase, x = t.reactive && t.pointer.active, I = t.pointer.x, C = t.pointer.y, L = n.cols, Y = n.rows, N = n.lum, _ = o.colX, f = o.rowY;
    for (let h = 0; h < b; h++)
      o.lvX[h].length = 0, o.lvY[h].length = 0;
    let F = 0, X = 0;
    for (let h = 0; h < Y; h++) {
      const m = f[h];
      for (let y = 0; y < L; y++, X++) {
        const A = N[X] * se(s, d, u, M, X);
        if (x) {
          const R = _[y], g = R - I, E = m - C, S = g * g + E * E;
          if (S < ce) {
            const O = 1 - Math.sqrt(S) / V;
            o.hotX[F] = R, o.hotY[F] = m, o.hotV[F] = A + O * 0.35, o.hotB[F] = O, F++;
            continue;
          }
        }
        const w = A * b | 0;
        if (w < $) continue;
        const T = w < b ? w : b - 1;
        o.lvX[T].push(_[y]), o.lvY[T].push(m);
      }
    }
    e.textAlign = "center", e.textBaseline = "middle", e.font = `${n.cellH}px ui-monospace, monospace`;
    for (let h = $; h < b; h++) {
      const m = o.lvX[h], y = m.length;
      if (y === 0) continue;
      const A = (h + 0.5) / b, w = J(A);
      if (w === " ") continue;
      const T = W(A, t);
      e.fillStyle = T.style, e.globalAlpha = T.alpha;
      const R = o.lvY[h];
      for (let g = 0; g < y; g++) e.fillText(w, m[g], R[g]);
    }
    if (F > 0)
      for (let h = 0; h < F; h++) {
        const m = o.hotV[h], y = J(m);
        if (y === " ") continue;
        const A = W(m, t);
        e.fillStyle = A.style, e.globalAlpha = A.alpha, e.font = `${n.cellH * (1 + o.hotB[h] * 0.25)}px ui-monospace, monospace`, e.fillText(y, o.hotX[h], o.hotY[h]);
      }
    e.globalAlpha = 1;
  }
}, Fe = 1, xe = 8, Ee = 0.92, ee = 200, Ie = 1.5;
function H(e, n) {
  return typeof e == "number" && Number.isFinite(e) ? e : n;
}
function ne(e) {
  const n = P(H(e.density, 1), 0.1, 8), t = P(H(e.dotMin, Fe), 0, ee), l = P(H(e.dotMax, xe), 0.5, ee), i = P(H(e.occupancy, Ee), 0.05, 2), o = t / 2 / n, c = Math.max(o, l / 2 / n);
  return { pitch: Math.max(Ie, l / i / n), rMin: o, rMax: c };
}
function Xe(e, n) {
  return n.rMin + (n.rMax - n.rMin) * P(e, 0, 1);
}
function Re() {
  return {
    phase: new Float32Array(0),
    cosPhase: new Float32Array(0),
    sinPhase: new Float32Array(0),
    colX: new Float32Array(0),
    rowY: new Float32Array(0),
    lvX: [],
    lvY: []
  };
}
const Se = Math.PI * 2, fe = {
  name: "dots",
  cell(e) {
    const { pitch: n } = ne(e);
    return { w: n, h: n };
  },
  create() {
    return Re();
  },
  build(e, n) {
    const t = n, l = ae(e.cols, e.rows);
    t.phase = l.phase, t.cosPhase = l.cosPhase, t.sinPhase = l.sinPhase;
    const i = he(e);
    t.colX = i.colX, t.rowY = i.rowY, t.lvX = [], t.lvY = [];
    for (let o = 0; o < b; o++)
      t.lvX.push([]), t.lvY.push([]);
  },
  draw(e, n, t, l, i) {
    const o = l;
    (o.colX.length !== n.cols || o.phase.length !== n.cols * n.rows) && fe.build(n, o);
    const c = ne(t), s = i * t.speed * re, d = Math.sin(s), u = Math.cos(s), M = o.cosPhase, x = o.sinPhase, I = t.reactive && t.pointer.active, C = t.pointer.x, L = t.pointer.y, Y = n.cols, N = n.rows, _ = n.lum, f = o.colX, F = o.rowY;
    for (let h = 0; h < b; h++)
      o.lvX[h].length = 0, o.lvY[h].length = 0;
    let X = 0;
    for (let h = 0; h < N; h++) {
      const m = F[h];
      for (let y = 0; y < Y; y++, X++) {
        let A = _[X] * se(d, u, M, x, X);
        if (I) {
          const g = f[y] - C, E = m - L, S = g * g + E * E;
          S < ce && (A += (1 - Math.sqrt(S) / V) * 0.45);
        }
        const w = A * b | 0;
        if (w < $) continue;
        const T = w < b ? w : b - 1;
        o.lvX[T].push(f[y]), o.lvY[T].push(m);
      }
    }
    for (let h = $; h < b; h++) {
      const m = o.lvX[h], y = m.length;
      if (y === 0) continue;
      const A = (h + 0.5) / b, w = Xe(A, c);
      if (w <= 0) continue;
      const T = W(A, t);
      e.fillStyle = T.style, e.globalAlpha = T.alpha;
      const R = o.lvY[h];
      e.beginPath();
      for (let g = 0; g < y; g++) {
        const E = m[g], S = R[g];
        e.moveTo(E + w, S), e.arc(E, S, w, 0, Se);
      }
      e.fill();
    }
    e.globalAlpha = 1;
  }
}, U = {
  ascii: ue,
  dots: fe
};
function Ye(e) {
  return e && U[e] || U.ascii;
}
function _e(e) {
  return `${e.cols}|${e.rows}|${e.cellW}|${e.cellH}|${e.offsetX}|${e.offsetY}`;
}
function te(e, n) {
  const t = _e(n);
  n.builtFor !== t && (U[e].build(n, n.scratch), n.builtFor = t);
}
function oe(e) {
  const n = e.data;
  return n && typeof n == "object" && "maxCols" in n ? n : null;
}
const Ce = {
  init(e) {
    const n = Ye(e.mask), t = n.cell(e);
    e.data = {
      maxCols: Math.max(1, Math.floor(e.width / t.w)),
      maxRows: Math.max(1, Math.floor(e.height / t.h)),
      cols: 0,
      rows: 0,
      cellW: t.w,
      cellH: t.h,
      offsetX: 0,
      offsetY: 0,
      lum: new Float32Array(0),
      ready: !1,
      maskName: n.name,
      scratch: n.create(),
      builtFor: ""
    };
  },
  async prepare(e) {
    const n = oe(e);
    if (!n || !e.src) return;
    const t = await Me(e.src);
    if (!t) return;
    const { cols: l, rows: i } = Ae(t.width / t.height, n.cellW, n.cellH, n.maxCols, n.maxRows);
    n.cols = l, n.rows = i, n.offsetX = (e.width - l * n.cellW) / 2, n.offsetY = (e.height - i * n.cellH) / 2;
    const o = Te(t, l, i);
    o && (n.lum = o, te(n.maskName, n), n.ready = !0);
  },
  render(e, n, t) {
    e.fillStyle = n.bg, e.fillRect(0, 0, n.width, n.height);
    const l = oe(n);
    !l || !l.ready || (te(l.maskName, l), U[l.maskName].draw(e, l, n, l.scratch, t));
  }
}, le = 110, Le = 140, ke = {
  init(e) {
    const n = q(e.seed), t = Math.round(48 * P(e.density, 0.5, 3)), l = [];
    for (let i = 0; i < t; i++)
      l.push({
        x: n() * e.width,
        y: n() * e.height,
        vx: (n() - 0.5) * 36,
        vy: (n() - 0.5) * 36
      });
    e.data = { particles: l, lastT: 0 };
  },
  render(e, n, t) {
    const l = n.data, i = P(t - l.lastT, 0, 0.05) * n.speed;
    l.lastT = t;
    const o = n.palette[0] ?? "#888";
    e.fillStyle = n.bg, e.fillRect(0, 0, n.width, n.height);
    for (const r of l.particles)
      if (r.x += r.vx * i, r.y += r.vy * i, (r.x < 0 || r.x > n.width) && (r.vx = -r.vx), (r.y < 0 || r.y > n.height) && (r.vy = -r.vy), r.x = P(r.x, 0, n.width), r.y = P(r.y, 0, n.height), n.reactive && n.pointer.active) {
        const s = n.pointer.x - r.x, d = n.pointer.y - r.y, u = Math.hypot(s, d);
        u < Le && u > 1 && (r.vx += s / u * 30 * i, r.vy += d / u * 30 * i);
      }
    e.strokeStyle = o, e.lineWidth = 1;
    const c = l.particles;
    for (let r = 0; r < c.length; r++)
      for (let s = r + 1; s < c.length; s++) {
        const d = Math.hypot(c[r].x - c[s].x, c[r].y - c[s].y);
        d < le && (e.globalAlpha = (1 - d / le) * 0.45, e.beginPath(), e.moveTo(c[r].x, c[r].y), e.lineTo(c[s].x, c[s].y), e.stroke());
      }
    e.globalAlpha = 0.9, e.fillStyle = o;
    for (const r of c)
      e.beginPath(), e.arc(r.x, r.y, 2.2, 0, Math.PI * 2), e.fill();
    e.globalAlpha = 1;
  }
};
function De(e, n, t, l, i, o) {
  const c = Math.hypot(e - t, n - l);
  return 0.5 + 0.5 * Math.sin(c * 0.045 - o * 2 + i);
}
const Ne = {
  init(e) {
    const n = Math.max(18, 26 / e.density), t = Math.ceil(e.width / n) + 1, l = Math.ceil(e.height / n) + 1, i = q(e.seed), o = t * l, c = new Float32Array(o), r = new Uint8Array(o);
    for (let s = 0; s < o; s++)
      c[s] = i() * Math.PI * 2, r[s] = i() < 0.8 ? 0 : 1 % Math.max(e.palette.length, 1);
    e.data = { cols: t, rows: l, spacing: n, phases: c, colorIdx: r };
  },
  render(e, n, t) {
    const l = n.data, i = t * n.speed, o = n.reactive && n.pointer.active ? n.pointer.x : n.width / 2, c = n.reactive && n.pointer.active ? n.pointer.y : n.height / 2, r = Math.max(n.palette.length, 1);
    e.fillStyle = n.bg, e.fillRect(0, 0, n.width, n.height);
    for (let s = 0; s < l.rows; s++)
      for (let d = 0; d < l.cols; d++) {
        const u = s * l.cols + d, M = De(d * l.spacing, s * l.spacing, o, c, l.phases[u], i), x = l.spacing * 0.14 * (0.4 + 0.8 * M);
        e.globalAlpha = 0.35 + 0.6 * M, e.fillStyle = n.palette[l.colorIdx[u] % r], e.beginPath(), e.arc(d * l.spacing, s * l.spacing, x, 0, Math.PI * 2), e.fill();
      }
    e.globalAlpha = 1;
  }
};
function Be(e, n, t, l, i) {
  let o = n + t.amplitude * Math.sin(e * t.frequency + l * t.speed + t.phase) + t.amplitude * 0.35 * Math.sin(e * t.frequency * 2.7 + l * t.speed * 1.4);
  if (i != null && i.active) {
    const c = e - i.x;
    o -= 18 * Math.exp(-(c * c) / (2 * 90 * 90));
  }
  return o;
}
const Oe = {
  init(e) {
    const n = q(e.seed), t = Math.min(5, Math.max(3, Math.round(3 * e.density))), l = [];
    for (let i = 0; i < t; i++)
      l.push({
        amplitude: e.height * 0.07 * (1 + i * 0.45),
        frequency: 8e-3 / (1 + i * 0.3),
        speed: 0.5 + i * 0.28,
        phase: n() * Math.PI * 2,
        yRatio: 0.5 + 0.13 * i,
        alpha: 0.16
      });
    e.data = { layers: l };
  },
  render(e, n, t) {
    const l = n.data, i = t * n.speed, o = Math.max(n.palette.length, 1), c = n.reactive ? n.pointer : void 0;
    e.fillStyle = n.bg, e.fillRect(0, 0, n.width, n.height), l.layers.forEach((r, s) => {
      const d = n.height * r.yRatio;
      e.globalAlpha = r.alpha, e.fillStyle = n.palette[s % o], e.beginPath(), e.moveTo(0, n.height);
      for (let u = 0; u <= n.width; u += 8)
        e.lineTo(u, Be(u, d, r, i, c));
      e.lineTo(n.width, n.height), e.closePath(), e.fill();
    }), e.globalAlpha = 1;
  }
}, ie = {
  "pixel-field": Ne,
  particles: ke,
  waves: Oe,
  goo: we,
  // 图片蒙版的宿主效果：具体图案由 state.mask 选择（ascii / dots）
  ascii: Ce
}, He = [
  "--nm-primary-color",
  "--nm-color-info",
  "--nm-color-success",
  "--nm-color-warning"
], $e = 140, Ve = 120, Ue = "80px";
function ze(e) {
  const { isReducedMotion: n } = ye();
  let t = null, l = 0, i = 0, o = null, c = null, r = !1, s = !0, d = null, u = !1, M, x, I = 0, C = 0;
  const L = e.idleFps && e.idleFps > 0 ? 1e3 / e.idleFps : 0, Y = e.scrollFps !== void 0, N = Y ? e.scrollFps > 0 ? 1e3 / e.scrollFps : 1 / 0 : 0, _ = typeof window < "u" && window.matchMedia("(pointer: coarse)").matches, f = {
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
    mask: void 0,
    dotMin: void 0,
    dotMax: void 0,
    occupancy: void 0,
    pointer: { x: 0, y: 0, active: !1 },
    data: null
  };
  function F(a) {
    const v = getComputedStyle(a);
    f.palette = He.map((p) => v.getPropertyValue(p).trim()).filter(Boolean), f.bg = v.getPropertyValue("--nm-bg-color").trim(), f.fg = v.getPropertyValue("--nm-text-primary").trim();
  }
  function X() {
    return ie[e.effect.value] ?? ie["pixel-field"];
  }
  let h = 0;
  async function m() {
    var B, k, G, K, j, Q;
    if (!e.canvas.value) return;
    const v = ++h;
    f.density = e.density.value, f.speed = e.speed.value, f.reactive = e.reactive.value && !_ && !n.value, f.seed = e.seed.value ?? Math.floor(Math.random() * 4294967295), f.src = e.src.value, f.mask = (B = e.mask) == null ? void 0 : B.value, f.dotMin = (k = e.dotMin) == null ? void 0 : k.value, f.dotMax = (G = e.dotMax) == null ? void 0 : G.value, f.occupancy = (K = e.occupancy) == null ? void 0 : K.value, (j = e.palette.value) != null && j.length && (f.palette = e.palette.value);
    const p = X();
    p.init(f), y(0.7), await ((Q = p.prepare) == null ? void 0 : Q.call(p, f)), v === h && y(0.7);
  }
  function y(a) {
    t && X().render(t, f, a);
  }
  function A(a) {
    if (r) {
      if (s) {
        const v = u && Y ? Math.max(L, N) : L, p = f.pointer.active || !v;
        (p || Number.isFinite(v) && a >= I) && (y((a - i) / 1e3), I = p ? a + (v || 0) : I + v, I < a && (I = a + v));
      }
      l = requestAnimationFrame(A);
    }
  }
  function w() {
    r || n.value || (r = !0, i || (i = performance.now()), I = 0, l = requestAnimationFrame(A));
  }
  function T() {
    r = !1, l && cancelAnimationFrame(l), l = 0;
  }
  function R() {
    const a = e.canvas.value;
    if (!a) return;
    const v = a.getBoundingClientRect(), p = Math.min(window.devicePixelRatio || 1, 2);
    a.width = Math.max(1, Math.round(v.width * p)), a.height = Math.max(1, Math.round(v.height * p)), f.width = v.width, f.height = v.height, C = p, t = a.getContext("2d"), t == null || t.setTransform(p, 0, 0, p, 0, 0);
  }
  function g(a) {
    const v = e.canvas.value;
    if (!v) return;
    const p = v.getBoundingClientRect();
    f.pointer.x = a.clientX - p.left, f.pointer.y = a.clientY - p.top, f.pointer.active = !0;
  }
  function E() {
    f.pointer.active = !1;
  }
  function S(a) {
    a.addEventListener("pointermove", g), a.addEventListener("pointerleave", E);
  }
  function O(a) {
    a.removeEventListener("pointermove", g), a.removeEventListener("pointerleave", E);
  }
  function z() {
    u = !0, M !== void 0 && clearTimeout(M), M = setTimeout(() => {
      M = void 0, u = !1;
    }, $e);
  }
  function de() {
    const a = e.canvas.value;
    a && (x !== void 0 && clearTimeout(x), x = setTimeout(() => {
      x = void 0;
      const v = a.getBoundingClientRect(), p = Math.min(window.devicePixelRatio || 1, 2);
      v.width === f.width && v.height === f.height && p === C || (R(), m());
    }, Ve));
  }
  typeof window < "u" && Y && window.addEventListener("scroll", z, { capture: !0, passive: !0 });
  const ve = D(
    e.canvas,
    (a) => {
      var v;
      a && ((v = e.palette.value) != null && v.length ? f.palette = e.palette.value : F(a), R(), m(), w(), S(a), o = new ResizeObserver(() => de()), o.observe(a), typeof IntersectionObserver < "u" && (d = new IntersectionObserver(
        (p) => {
          const B = p[p.length - 1];
          if (!B) return;
          const k = B.isIntersecting;
          k !== s && (s = k, k ? w() : T());
        },
        { rootMargin: Ue }
      ), d.observe(a)), c = new MutationObserver(() => {
        var p;
        (p = e.palette.value) != null && p.length || (F(a), y(performance.now() / 1e3));
      }), c.observe(document.documentElement, {
        attributes: !0,
        attributeFilter: ["data-theme"]
      }));
    },
    { immediate: !0, flush: "post" }
  );
  return D(
    [
      e.effect,
      e.density,
      e.seed,
      e.src,
      // 蒙版与波点几何变化同样需要重建 data（栅格尺寸/图案类型都变了）
      () => {
        var a;
        return (a = e.mask) == null ? void 0 : a.value;
      },
      () => {
        var a;
        return (a = e.dotMin) == null ? void 0 : a.value;
      },
      () => {
        var a;
        return (a = e.dotMax) == null ? void 0 : a.value;
      },
      () => {
        var a;
        return (a = e.occupancy) == null ? void 0 : a.value;
      }
    ],
    () => {
      e.canvas.value && m();
    }
  ), D(e.palette, () => {
    var v;
    const a = e.canvas.value;
    a && ((v = e.palette.value) != null && v.length ? f.palette = e.palette.value : F(a), y(performance.now() / 1e3));
  }), D(
    () => e.reactive.value,
    (a) => {
      f.reactive = a && !_ && !n.value, f.reactive || (f.pointer.active = !1);
    }
  ), D(e.speed, (a) => {
    f.speed = a;
  }), D(n, (a) => {
    f.reactive = e.reactive.value && !_ && !a, a ? (T(), y(0.7)) : w();
  }), pe(() => {
    T(), ve(), x !== void 0 && clearTimeout(x), M !== void 0 && clearTimeout(M), o == null || o.disconnect(), d == null || d.disconnect(), c == null || c.disconnect(), typeof window < "u" && Y && window.removeEventListener("scroll", z, { capture: !0 }), e.canvas.value && O(e.canvas.value);
  }), { start: w, stop: T };
}
export {
  Ee as D,
  xe as a,
  Fe as b,
  ze as u
};

import { ref as Q, computed as xt, onMounted as mt, onBeforeUnmount as yt } from "vue";
import Mt from "./useReducedMotion.js";
const V = [56, 108, 159, 210, 261, 312, 364, 415], tt = [56, 108, 159, 210, 261, 312, 369, 420], bt = [
  [1, 1, 1, 1, 0, 0, 0, 0],
  [1, 1, 0, 1, 0, 0, 0, 0],
  [1, 0, 1, 1, 1, 1, 0, 0],
  [1, 1, 1, 0, 0, 1, 0, 0],
  [0, 0, 1, 0, 1, 1, 1, 1],
  [0, 0, 1, 1, 1, 0, 0, 1],
  [0, 0, 0, 0, 1, 0, 0, 1],
  [0, 0, 0, 0, 1, 1, 1, 1]
], gt = [
  [1, 4],
  [2, 6],
  [5, 8],
  [7, 13],
  [9, 14],
  [10, 15],
  [16, 22],
  [18, 23],
  [19, 24],
  [25, 28]
], O = 41, vt = 9, q = 256, At = 9, Ft = 26, _ = [191, 253, 10], U = [234, 255, 168], Z = "http://www.w3.org/2000/svg", wt = (s) => 1 + 2.70158 * Math.pow(s - 1, 3) + 1.70158 * Math.pow(s - 1, 2), E = (s) => s < 0 ? 0 : s > 1 ? 1 : s, L = (s, $, N) => s + ($ - s) * N, et = (s) => `rgb(${Math.round(L(_[0], U[0], s))},${Math.round(L(_[1], U[1], s))},${Math.round(
  L(_[2], U[2], s)
)})`, ot = (s) => s < 0 ? 0 : Math.min(1, s / 45) * Math.exp(-s / 300);
function St(s) {
  const { linksGroupRef: $, pixelsGroupRef: N, sparksGroupRef: nt, svgRef: st } = s, p = Q(s.mode ?? "pulse"), ct = xt(() => s.autoplay ?? !0), f = [], A = [], k = [];
  let H = performance.now(), m = [], B = performance.now() + 1400;
  const S = Q({ x: -9999, y: -9999, on: !1 }), { isReducedMotion: I } = Mt();
  let P = null, K = !1;
  function rt() {
    const e = N.value, l = $.value, h = nt.value;
    if (!(!e || !l || !h)) {
      e.innerHTML = "", l.innerHTML = "", h.innerHTML = "", f.length = 0, A.length = 0, k.length = 0;
      for (let u = 0; u < 8; u++)
        for (let a = 0; a < 8; a++) {
          if (!bt[u][a]) continue;
          const c = document.createElementNS(Z, "rect");
          c.setAttribute("x", String(V[a])), c.setAttribute("y", String(tt[u])), c.setAttribute("width", String(O)), c.setAttribute("height", String(O)), c.setAttribute("rx", String(vt)), e.appendChild(c);
          const t = V[a] + O / 2, o = tt[u] + O / 2;
          f.push({
            el: c,
            cx: t,
            cy: o,
            dist: Math.hypot(t - q, o - q),
            rand: Math.random(),
            p1: Math.random() * 6.28,
            p2: Math.random() * 6.28,
            p3: Math.random() * 6.28,
            p4: Math.random() * 6.28,
            ox: 0,
            oy: 0,
            s: 1,
            b: 0,
            rot: 0,
            pIn: 0
          });
        }
      for (const [u, a] of gt) {
        const c = document.createElementNS(Z, "line");
        c.setAttribute("stroke-linecap", "round"), l.appendChild(c), A.push({ el: c, a: u, b: a, w: 0, br: 0, grow: 0, ph: Math.random() * 6.28 });
      }
      for (let u = 0; u < 10; u++) {
        const a = document.createElementNS(Z, "circle");
        a.setAttribute("r", "4"), a.setAttribute("fill", "#f2ffc4"), a.setAttribute("opacity", "0"), h.appendChild(a), k.push(a);
      }
    }
  }
  function X(e) {
    p.value = e, e === "pulse" && (m = [], B = performance.now() + 250);
  }
  function at() {
    H = performance.now(), m = [], B = performance.now() + 1e9, f.forEach((e) => {
      e.rand = Math.random(), e.ox = 0, e.oy = 0, e.s = 1, e.b = 0, e.rot = 0, e.pIn = 0;
    }), A.forEach((e) => {
      e.grow = 0, e.w = 0;
    }), X(p.value);
  }
  function it(e) {
    const l = st.value;
    if (!l) return;
    const h = l.getBoundingClientRect(), u = "touches" in e ? e.touches[0] : e, a = (u.clientX - h.left) / h.width * 512, c = (u.clientY - h.top) / h.height * 512;
    S.value = {
      x: a,
      y: c,
      on: a >= 0 && a <= 512 && c >= 0 && c <= 512
    };
  }
  function lt(e) {
    it(e);
  }
  function ut() {
    S.value = { x: -9999, y: -9999, on: !1 };
  }
  function j(e) {
    if (!K) return;
    const l = e / 1e3, h = e - H;
    if (p.value === "pulse" && e >= B && !I.value) {
      const t = f[Math.floor(Math.random() * f.length)], o = 0.5 + Math.random() * 0.15, n = f.map((d) => Math.hypot(d.cx - t.cx, d.cy - t.cy) / o);
      m.push({
        t0: e,
        arrive: n,
        cross: A.map((d) => (n[d.a] + n[d.b]) / 2)
      }), m.length > 3 && m.shift(), B = e + 1900 + Math.random() * 900;
    }
    m = m.filter((t) => e - t.t0 < 2600);
    const u = l * 150 % 600 - 70;
    for (const t of f) {
      let o = 0, n = 0, d = 1, x = 0, F = 0, G = 1;
      const R = t.dist * 1.5 + t.rand * 260, y = Math.min(1, Math.max(0, (h - R) / 720));
      if (t.pIn = y, y < 1) {
        const r = wt(y), i = 320 + t.rand * 260, v = t.p1;
        o = Math.cos(v) * i * (1 - r), n = Math.sin(v) * i * (1 - r) + 60 * (1 - r), d = Math.max(1e-3, r), F = (t.rand - 0.5) * 300 * (1 - r), G = Math.min(1, y * 2.2);
      }
      if (y >= 1 && !I.value) {
        if (p.value === "pulse") {
          for (const r of m) {
            const i = ot(e - r.t0 - r.arrive[f.indexOf(t)]);
            x += i * 0.95, d *= 1 + 0.14 * i;
          }
          x += 0.05 + 0.04 * Math.sin(l * 1.8 + t.p1);
        }
        if (p.value === "liquid" && (o = Math.sin(l * 0.9 + t.p1) * 4.6, n = Math.cos(l * 0.72 + t.p2) * 4.6, F = Math.sin(l * 0.5 + t.p3) * 5, d = 1 + 0.05 * Math.sin(l * 0.8 + t.p4), x = 0.1 + 0.09 * Math.sin(l * 0.6 + t.p2)), p.value === "wave") {
          const r = t.dist - u, i = Math.exp(-(r * r) / (2 * 42 * 42));
          d *= 1 + 0.16 * i, x += i * 0.95, o = (t.cx - q) / t.dist * i * 6, n = (t.cy - q) / t.dist * i * 6;
        }
        if (S.value.on) {
          const r = p.value === "pointer" ? 1 : 0.32, i = t.cx - S.value.x, v = t.cy - S.value.y, b = Math.hypot(i, v) || 1e-3, w = 150;
          if (b < w) {
            let g = 1 - b / w;
            g *= g, o -= i / b * g * 30 * r, n -= v / b * g * 30 * r, d *= 1 + 0.28 * g * r, x += 0.75 * g * r;
          }
        }
      }
      const M = 0.16;
      t.ox += (o - t.ox) * M, t.oy += (n - t.oy) * M, t.s += (d - t.s) * M, t.b += (E(x) - t.b) * M, t.rot += (F - t.rot) * M, t.el.setAttribute(
        "transform",
        `translate(${(t.cx + t.ox).toFixed(2)} ${(t.cy + t.oy).toFixed(2)}) rotate(${t.rot.toFixed(2)}) scale(${t.s.toFixed(3)}) translate(${(-t.cx).toFixed(2)} ${(-t.cy).toFixed(2)})`
      ), t.el.setAttribute("fill", et(E(t.b))), t.el.setAttribute("opacity", G.toFixed(3));
    }
    const a = f.every((t) => t.pIn >= 1);
    let c = 0;
    for (const t of A) {
      const o = f[t.a], n = f[t.b];
      if (!o || !n) continue;
      const d = a ? 1 : E((Math.min(o.pIn, n.pIn) - 0.72) / 0.28);
      t.grow += (d - t.grow) * 0.2;
      let x = Math.max(o.b, n.b) * 0.82, F = 0;
      if (p.value === "liquid" && !I.value && (F = 1.4 * Math.sin(l * 1.1 + t.ph)), p.value === "pulse" && !I.value)
        for (const w of m) {
          const g = w.t0 + w.cross[A.indexOf(t)], z = ot(e - g);
          x = Math.max(x, z), F += 4 * z;
          const D = g - 90, J = 210;
          if (e >= D && e <= D + J && c < k.length) {
            const W = (e - D) / J, C = w.arrive[t.a] <= w.arrive[t.b], dt = C ? o.cx + o.ox : n.cx + n.ox, pt = C ? o.cy + o.oy : n.cy + n.oy, ft = C ? n.cx + n.ox : o.cx + o.ox, ht = C ? n.cy + n.oy : o.cy + o.oy, Y = k[c++];
            Y.setAttribute("cx", L(dt, ft, W).toFixed(1)), Y.setAttribute("cy", L(pt, ht, W).toFixed(1)), Y.setAttribute("opacity", (Math.sin(W * Math.PI) * 0.95).toFixed(2));
          }
        }
      t.br += (E(x) - t.br) * 0.2;
      const G = (At + F) * t.grow, R = o.cx + o.ox, T = o.cy + o.oy, y = n.cx + n.ox, M = n.cy + n.oy, r = Math.hypot(y - R, M - T) || 1e-3, i = (y - R) / r, v = (M - T) / r, b = Math.min(Ft, (r - 4) / 2);
      t.el.setAttribute("x1", (R + i * b).toFixed(2)), t.el.setAttribute("y1", (T + v * b).toFixed(2)), t.el.setAttribute("x2", (y - i * b).toFixed(2)), t.el.setAttribute("y2", (M - v * b).toFixed(2)), t.el.setAttribute("stroke-width", Math.max(0.1, G).toFixed(2)), t.el.setAttribute("stroke", et(E(t.br))), t.el.setAttribute("stroke-opacity", (t.grow * 0.98).toFixed(3));
    }
    for (; c < k.length; c++) k[c].setAttribute("opacity", "0");
    P = requestAnimationFrame(j);
  }
  return mt(() => {
    K = !0, rt(), (!ct.value || I.value) && (H = -1e9, A.forEach((e) => e.grow = 1)), X(p.value), P = requestAnimationFrame(j);
  }), yt(() => {
    K = !1, P !== null && cancelAnimationFrame(P);
  }), {
    mode: p,
    isReducedMotion: I,
    setMode: X,
    replay: at,
    handlePointerMove: lt,
    handlePointerLeave: ut
  };
}
export {
  St as default,
  St as usePixelLogoAnimation
};

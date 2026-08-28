import { computed as Y, ref as g, watch as L, onBeforeUnmount as ue } from "vue";
const de = 26, D = 72;
function me(N) {
  const { variant: m, target: d, dotColor: V, accentColor: I, sigma: q } = N, f = Y(
    () => m.value === "dots" || m.value === "glow" ? m.value : null
  );
  let s = null;
  function _(e) {
    if (!s) return;
    Array.from(s.classList).filter((n) => n.startsWith("nm-scrollbar--")).forEach((n) => s.classList.remove(n)), s.classList.add(e);
  }
  function F() {
    d.value && (s = document.querySelector(d.value), s && _(`nm-scrollbar--${m.value}`));
  }
  function K() {
    s && (Array.from(s.classList).filter((t) => t.startsWith("nm-scrollbar--")).forEach((t) => s.classList.remove(t)), s = null);
  }
  const x = g(0), p = g(100), y = g(1e3);
  let o = null, a = null, l = null, i = null, v = null;
  function P(e, t) {
    const n = e.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (n) {
      let c = n[1];
      return c.length === 3 && (c = c.split("").map((u) => u + u).join("")), [0, 2, 4].map((u) => parseInt(c.slice(u, u + 2), 16)).join(",");
    }
    const r = e.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    return r ? `${r[1]},${r[2]},${r[3]}` : t;
  }
  function S(e, t, n) {
    if (e) return e;
    if (typeof document > "u") return n;
    const r = getComputedStyle(document.documentElement).getPropertyValue(t).trim();
    return r ? P(r, n) : n;
  }
  const b = g("205,250,78"), M = g("153,153,153");
  function T() {
    b.value = S(I.value, "--nm-primary-color", "205,250,78"), M.value = S(V.value, "--nm-text-placeholder", "153,153,153");
  }
  function U() {
    const [e, t, n] = b.value.split(",").map(Number);
    return [e, t, n];
  }
  function z() {
    if (!i) return;
    const [e, t, n] = U();
    i.style.backgroundImage = `radial-gradient(ellipse 55% 42% at 82% 50%, rgba(${e},${t},${n},0.5), transparent 70%)`;
    const r = i.firstElementChild;
    r && (r.style.background = `rgba(${e},${t},${n},0.95)`, r.style.boxShadow = `0 0 6px rgba(${e},${t},${n},0.9), 0 0 18px rgba(${e},${t},${n},0.45)`);
  }
  function G() {
    if (!o || !i) return;
    const e = o.scrollHeight - o.clientHeight, t = e > 0 ? Math.min(1, Math.max(0, o.scrollTop / e)) : 0;
    i.style.transform = `translateY(${t * (o.clientHeight - D)}px)`;
  }
  function $() {
    if (o) {
      if (f.value === "glow") {
        G();
        return;
      }
      p.value = o.clientHeight, l && (l.style.height = `${p.value}px`);
    }
  }
  function w() {
    if (o) {
      if (f.value === "glow") {
        G();
        return;
      }
      x.value = o.scrollTop, y.value = o.scrollHeight;
    }
  }
  function Z(e) {
    const t = `nm-sb-hide-${e.replace(/[^a-zA-Z0-9]/g, "-")}`;
    if (document.getElementById(t)) return;
    const n = document.createElement("style");
    n.id = t, n.textContent = `${e}{scrollbar-width:none}${e}::-webkit-scrollbar{display:none}`, document.head.appendChild(n), v = t;
  }
  function J() {
    if (v) {
      const e = document.getElementById(v);
      e && e.remove(), v = null;
    }
  }
  function Q(e) {
    if (d.value && (o = document.querySelector(d.value), !!o)) {
      if (o.addEventListener("scroll", w, { passive: !0 }), Z(d.value), window.addEventListener("resize", $, { passive: !0 }), a = document.createElement("div"), a.style.cssText = "position:sticky;top:0;margin-left:auto;margin-right:4px;width:25px;height:0;z-index:1", e === "glow") {
        i = document.createElement("div"), i.style.cssText = `position:absolute;right:0;top:0;width:${de}px;height:${D}px;pointer-events:none;will-change:transform;background-repeat:no-repeat`;
        const t = document.createElement("div");
        t.style.cssText = "position:absolute;right:1px;top:50%;transform:translateY(-50%);width:3px;height:36px;border-radius:2px", i.appendChild(t), z(), a.appendChild(i);
      } else
        l = document.createElement("div"), l.style.cssText = "position:absolute;right:0;top:0;width:25px;pointer-events:none", l.style.height = `${p.value}px`, a.appendChild(l);
      o.insertBefore(a, o.firstChild), w(), $();
    }
  }
  function X() {
    o && o.removeEventListener("scroll", w), window.removeEventListener("resize", $), J(), a == null || a.remove(), a = null, l = null, i = null, o = null;
  }
  const ee = Y(() => {
    const e = p.value, t = y.value - e, r = (t > 0 ? x.value / t : 0) * e, c = q.value, u = Math.ceil(e / 5), B = [], [j, R, W] = M.value.split(",").map(Number), [te, ne, oe] = b.value.split(",").map(Number);
    for (let E = 0; E < u; E++) {
      const A = E * 5 + 2.5, O = Math.abs(A - r), h = Math.exp(-(O * O) / (2 * c * c)), re = Math.round(j + (te - j) * h), le = Math.round(R + (ne - R) * h), se = Math.round(W + (oe - W) * h), ie = (0.3 + 0.7 * h).toFixed(2), ae = `rgba(${re},${le},${se},${ie})`;
      for (let H = 0; H < 5; H++) {
        const ce = 2.5 + H * 5;
        B.push(`radial-gradient(circle at ${ce}px ${A}px, ${ae} 1px, transparent 1.1px)`);
      }
    }
    return B.join(`,
`);
  });
  L(ee, (e) => {
    l && (l.style.backgroundImage = e, l.style.backgroundSize = `25px ${p.value}px`, l.style.backgroundRepeat = "no-repeat");
  });
  function k() {
    typeof document > "u" || (T(), f.value ? Q(f.value) : F());
  }
  function C() {
    X(), K();
  }
  return L([m, d], () => {
    C(), k();
  }), L(I, () => {
    T(), z();
  }), ue(C), {
    overlayKind: f,
    scrollY: x,
    overlayH: p,
    overlayDocH: y,
    start: k,
    stop: C
  };
}
export {
  me as default,
  me as useScrollbar
};

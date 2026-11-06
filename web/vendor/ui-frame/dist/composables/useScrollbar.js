import { computed as P, ref as x, watch as C, onBeforeUnmount as ve } from "vue";
const ge = 26, U = 72;
function xe(Z) {
  const { variant: u, target: d, dotColor: E, accentColor: H, sigma: T } = Z, m = P(
    () => u.value === "dots" || u.value === "glow" ? u.value : null
  );
  let i = null;
  function J(e) {
    if (!i) return;
    Array.from(i.classList).filter((n) => n.startsWith("nm-scrollbar--")).forEach((n) => i.classList.remove(n)), i.classList.add(e);
  }
  function Q() {
    d.value && (i = document.querySelector(d.value), i && J(`nm-scrollbar--${u.value}`));
  }
  function X() {
    i && (Array.from(i.classList).filter((t) => t.startsWith("nm-scrollbar--")).forEach((t) => i.classList.remove(t)), i = null);
  }
  const M = x(0), f = x(100), L = x(1e3);
  let o = null, a = null, l = null, s = null, y = null, p = null;
  function F(e, t) {
    const n = e.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (n) {
      let g = n[1];
      return g.length === 3 && (g = g.split("").map((c) => c + c).join("")), [0, 2, 4].map((c) => parseInt(g.slice(c, c + 2), 16)).join(",");
    }
    const r = e.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    return r ? `${r[1]},${r[2]},${r[3]}` : t;
  }
  function G(e, t, n) {
    if (e) return F(e, n);
    if (typeof document > "u") return n;
    const r = getComputedStyle(document.documentElement).getPropertyValue(t).trim();
    return r ? F(r, n) : n;
  }
  const A = x("205,250,78"), q = x("153,153,153");
  function S() {
    A.value = G(H.value, "--nm-primary-color", "205,250,78"), q.value = G(E.value, "--nm-text-placeholder", "153,153,153");
  }
  function ee() {
    const [e, t, n] = A.value.split(",").map(Number);
    return [e, t, n];
  }
  function B() {
    if (!s) return;
    const [e, t, n] = ee();
    s.style.backgroundImage = `radial-gradient(ellipse 55% 42% at 82% 50%, rgba(${e},${t},${n},0.5), transparent 70%)`;
    const r = s.firstElementChild;
    r && (r.style.background = `rgba(${e},${t},${n},0.95)`, r.style.boxShadow = `0 0 6px rgba(${e},${t},${n},0.9), 0 0 18px rgba(${e},${t},${n},0.45)`);
  }
  function j() {
    if (!o || !s) return;
    const e = o.scrollHeight - o.clientHeight, t = e > 0 ? Math.min(1, Math.max(0, o.scrollTop / e)) : 0;
    s.style.transform = `translateY(${t * (o.clientHeight - U)}px)`;
  }
  function h() {
    if (o) {
      if (m.value === "glow") {
        j();
        return;
      }
      f.value = o.clientHeight, l && (l.style.height = `${f.value}px`);
    }
  }
  let v = 0;
  function b() {
    if (o) {
      if (m.value === "glow") {
        j();
        return;
      }
      M.value = o.scrollTop, L.value = o.scrollHeight;
    }
  }
  function O() {
    if (!v) {
      if (typeof requestAnimationFrame != "function") {
        b();
        return;
      }
      v = requestAnimationFrame(() => {
        v = 0, b();
      });
    }
  }
  function te(e) {
    const t = `nm-sb-hide-${e.replace(/[^a-zA-Z0-9]/g, "-")}`;
    if (document.getElementById(t)) return;
    const n = document.createElement("style");
    n.id = t, n.textContent = `${e}{scrollbar-width:none}${e}::-webkit-scrollbar{display:none}`, document.head.appendChild(n), y = t;
  }
  function ne() {
    if (y) {
      const e = document.getElementById(y);
      e && e.remove(), y = null;
    }
  }
  function oe(e) {
    if (d.value && (o = document.querySelector(d.value), !!o)) {
      if (o.addEventListener("scroll", O, { passive: !0 }), te(d.value), window.addEventListener("resize", h, { passive: !0 }), typeof ResizeObserver < "u" && (p = new ResizeObserver(h), p.observe(o)), a = document.createElement("div"), a.style.cssText = "position:sticky;top:0;margin-left:auto;margin-right:4px;width:25px;height:0;z-index:1", e === "glow") {
        s = document.createElement("div"), s.style.cssText = `position:absolute;right:0;top:0;width:${ge}px;height:${U}px;pointer-events:none;will-change:transform;background-repeat:no-repeat`;
        const t = document.createElement("div");
        t.style.cssText = "position:absolute;right:1px;top:50%;transform:translateY(-50%);width:3px;height:36px;border-radius:2px", s.appendChild(t), B(), a.appendChild(s);
      } else
        l = document.createElement("div"), l.style.cssText = "position:absolute;right:0;top:0;width:25px;pointer-events:none", l.style.height = `${f.value}px`, a.appendChild(l);
      o.insertBefore(a, o.firstChild), b(), h(), e === "dots" && $(), typeof requestAnimationFrame == "function" && requestAnimationFrame(() => {
        b(), h(), e === "dots" && $();
      });
    }
  }
  function re() {
    o && o.removeEventListener("scroll", O), window.removeEventListener("resize", h), p == null || p.disconnect(), p = null, v && typeof cancelAnimationFrame == "function" && (cancelAnimationFrame(v), v = 0), ne(), a == null || a.remove(), a = null, l = null, s = null, o = null;
  }
  const W = P(() => {
    const e = f.value, t = L.value - e, n = t > 0 ? Math.min(1, Math.max(0, M.value / t)) : 0, r = Math.min(T.value, e / 2), g = r + n * Math.max(0, e - 2 * r), c = T.value, le = Math.ceil(e / 5), Y = [], [k, N, V] = q.value.split(",").map(Number), [ie, se, ae] = A.value.split(",").map(Number);
    for (let z = 0; z < le; z++) {
      const _ = z * 5 + 2.5, K = Math.abs(_ - g), w = Math.exp(-(K * K) / (2 * c * c)), ce = Math.round(k + (ie - k) * w), ue = Math.round(N + (se - N) * w), de = Math.round(V + (ae - V) * w), me = (0.3 + 0.7 * w).toFixed(2), fe = `rgba(${ce},${ue},${de},${me})`;
      for (let R = 0; R < 5; R++) {
        const pe = 2.5 + R * 5;
        Y.push(`radial-gradient(circle at ${pe}px ${_}px, ${fe} 1px, transparent 1.1px)`);
      }
    }
    return Y.join(`,
`);
  });
  function $() {
    l && (l.style.backgroundImage = W.value, l.style.backgroundSize = `25px ${f.value}px`, l.style.backgroundRepeat = "no-repeat");
  }
  C(W, $, { immediate: !0 }), C([E, H], () => {
    S(), $();
  });
  function D() {
    typeof document > "u" || (S(), m.value ? oe(m.value) : Q());
  }
  function I() {
    re(), X();
  }
  return C([u, d], () => {
    I(), D();
  }), C([u, E, H], () => {
    S(), m.value === "glow" && B();
  }), ve(I), {
    overlayKind: m,
    scrollY: M,
    overlayH: f,
    overlayDocH: L,
    start: D,
    stop: I
  };
}
export {
  xe as default,
  xe as useScrollbar
};

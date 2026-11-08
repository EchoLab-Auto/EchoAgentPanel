import { ref as c, watch as G, onBeforeUnmount as J } from "vue";
const K = {
  bottom: "top",
  top: "bottom",
  left: "right",
  right: "left"
};
function Q(O) {
  const {
    trigger: A,
    open: E,
    placement: u,
    floating: d,
    offset: v,
    candidates: r = ["bottom", "top", "right", "left"],
    flipHysteresis: C = 48,
    minSpace: D = 120,
    estimateSize: P = { width: 200, height: 120 },
    lockPlacement: g,
    onFrame: p
  } = O, m = c(null), W = c(0), h = c({ width: 0, height: 0 }), M = u.value === "auto" ? r[0] : u.value, a = c(M);
  let b = 0;
  function l() {
    return (v == null ? void 0 : v.value) ?? 0;
  }
  function x() {
    const t = d == null ? void 0 : d.value;
    return {
      width: (t == null ? void 0 : t.offsetWidth) ?? P.width,
      height: (t == null ? void 0 : t.offsetHeight) ?? P.height
    };
  }
  function y(t) {
    return {
      bottom: window.innerHeight - t.bottom - l(),
      top: t.top - l(),
      right: window.innerWidth - t.right - l(),
      left: t.left - l()
    };
  }
  function T(t) {
    const n = y(t), i = x();
    b = i.height;
    for (const e of r) {
      const o = (e === "bottom" || e === "top" ? i.height : i.width) + 8;
      if (n[e] >= o) return e;
    }
    return r[0];
  }
  function L(t, n) {
    const i = y(t), e = K[n];
    return i[n] < D && i[e] > i[n] + C ? e : n;
  }
  function z(t) {
    var B;
    if (!A.value || typeof window > "u") return;
    const n = x();
    if ((h.value.width !== n.width || h.value.height !== n.height) && (h.value = { width: n.width, height: n.height }), !t && u.value === "auto" && !w) {
      const I = ((B = d == null ? void 0 : d.value) == null ? void 0 : B.offsetHeight) ?? 0;
      I > 0 && Math.abs(I - b) > 8 && (t = !0);
    }
    const i = A.value.getBoundingClientRect(), e = {
      top: i.top,
      bottom: i.bottom,
      left: i.left,
      right: i.right,
      width: i.width,
      height: i.height
    };
    let o;
    g != null && g.value && !w ? o = a.value : u.value === "auto" ? o = t ? T(e) : a.value : o = t ? L(e, u.value) : L(e, a.value), w = !1;
    const q = o !== a.value;
    (t || q) && (W.value = y(e)[o]);
    const s = m.value;
    (!s || s.top !== e.top || s.bottom !== e.bottom || s.left !== e.left || s.right !== e.right || s.width !== e.width || s.height !== e.height) && (m.value = e), (q || t) && (a.value = o);
  }
  let f = null, H = !1, w = !0;
  function S() {
    H = !0;
  }
  function k() {
    f = null;
    const t = H;
    H = !1, z(t), p == null || p(), E.value && typeof window < "u" && (f = window.requestAnimationFrame(k));
  }
  function U() {
    typeof window > "u" || f !== null || (f = window.requestAnimationFrame(k));
  }
  function F() {
    f !== null && typeof window < "u" && (window.cancelAnimationFrame(f), f = null);
  }
  function j() {
    z(!0);
  }
  return G(E, (t) => {
    t ? (typeof window < "u" && window.addEventListener("resize", S), z(!0), U()) : (F(), typeof window < "u" && window.removeEventListener("resize", S), a.value = u.value === "auto" ? r[0] : u.value, w = !0, b = 0);
  }), J(() => {
    F(), typeof window < "u" && window.removeEventListener("resize", S);
  }), {
    actualPlacement: a,
    rect: m,
    floatingSize: h,
    available: W,
    refresh: j,
    stop: F
  };
}
export {
  Q as default,
  Q as useFloatingPosition
};

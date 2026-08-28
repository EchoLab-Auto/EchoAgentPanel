import { ref as F, watch as D, onBeforeUnmount as T } from "vue";
const U = {
  bottom: "top",
  top: "bottom",
  left: "right",
  right: "left"
};
function G(x) {
  const {
    trigger: A,
    open: E,
    placement: r,
    floating: d,
    offset: c,
    candidates: l = ["bottom", "top", "right", "left"],
    flipHysteresis: L = 48,
    minSpace: k = 120,
    estimateSize: H = { width: 200, height: 120 },
    lockPlacement: h,
    onFrame: w
  } = x, p = F(null), P = F(0), q = r.value === "auto" ? l[0] : r.value, o = F(q);
  function a() {
    return (c == null ? void 0 : c.value) ?? 0;
  }
  function B() {
    const t = d == null ? void 0 : d.value;
    return {
      width: (t == null ? void 0 : t.offsetWidth) ?? H.width,
      height: (t == null ? void 0 : t.offsetHeight) ?? H.height
    };
  }
  function v(t) {
    return {
      bottom: window.innerHeight - t.bottom - a(),
      top: t.top - a(),
      right: window.innerWidth - t.right - a(),
      left: t.left - a()
    };
  }
  function I(t) {
    const i = v(t), e = B();
    for (const n of l) {
      const s = (n === "bottom" || n === "top" ? e.height : e.width) + 8;
      if (i[n] >= s) return n;
    }
    return l[0];
  }
  function S(t, i) {
    const e = v(t), n = U[i];
    return e[i] < k && e[n] > e[i] + L ? n : i;
  }
  function g(t) {
    if (!A.value || typeof window > "u") return;
    const i = A.value.getBoundingClientRect(), e = {
      top: i.top,
      bottom: i.bottom,
      left: i.left,
      right: i.right,
      width: i.width,
      height: i.height
    };
    let n;
    h != null && h.value && !b ? n = o.value : r.value === "auto" ? n = t ? I(e) : o.value : n = t ? S(e, r.value) : S(e, o.value), b = !1;
    const s = n !== o.value;
    (t || s) && (P.value = v(e)[n]);
    const f = p.value;
    (!f || f.top !== e.top || f.bottom !== e.bottom || f.left !== e.left || f.right !== e.right || f.width !== e.width || f.height !== e.height) && (p.value = e), (s || t) && (o.value = n);
  }
  let u = null, m = !1, b = !0;
  function y() {
    m = !0;
  }
  function W() {
    u = null;
    const t = m;
    m = !1, g(t), w == null || w(), E.value && typeof window < "u" && (u = window.requestAnimationFrame(W));
  }
  function O() {
    typeof window > "u" || u !== null || (u = window.requestAnimationFrame(W));
  }
  function z() {
    u !== null && typeof window < "u" && (window.cancelAnimationFrame(u), u = null);
  }
  function C() {
    g(!0);
  }
  return D(E, (t) => {
    t ? (typeof window < "u" && window.addEventListener("resize", y), g(!0), O()) : (z(), typeof window < "u" && window.removeEventListener("resize", y), o.value = r.value === "auto" ? l[0] : r.value, b = !0);
  }), T(() => {
    z(), typeof window < "u" && window.removeEventListener("resize", y);
  }), {
    actualPlacement: o,
    rect: p,
    available: P,
    refresh: C,
    stop: z
  };
}
export {
  G as default,
  G as useFloatingPosition
};

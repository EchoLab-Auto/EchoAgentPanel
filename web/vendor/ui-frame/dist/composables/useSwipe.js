import { ref as h, onMounted as E, onBeforeUnmount as L } from "vue";
function T(v, t = {}) {
  const { threshold: b = 50, edgeOnly: a = !1, edgeWidth: i = 40 } = t, u = h(null), l = h(0), c = h(!1);
  let s = 0, d = 0;
  function S(n, e) {
    return Math.abs(n) > Math.abs(e) ? n > 0 ? "right" : "left" : e > 0 ? "down" : "up";
  }
  function f(n) {
    if (n.touches.length !== 1) return;
    const e = n.touches[0];
    a && e.clientX > i && e.clientX < window.innerWidth - i || (s = e.clientX, d = e.clientY, u.value = null, l.value = 0);
  }
  function w(n) {
    if (u.value === null && n.touches.length === 1) {
      const e = n.touches[0].clientX - s, r = n.touches[0].clientY - d;
      (Math.abs(e) > 10 || Math.abs(r) > 10) && (u.value = S(e, r), c.value = !0), l.value = Math.sqrt(e * e + r * r);
    }
  }
  function o() {
    var n, e, r, g, m;
    if (c.value = !1, !u.value || l.value < b) {
      u.value = null;
      return;
    }
    switch (u.value) {
      case "left":
        (n = t.onSwipeLeft) == null || n.call(t);
        break;
      case "right":
        (e = t.onSwipeRight) == null || e.call(t);
        break;
      case "up":
        (r = t.onSwipeUp) == null || r.call(t);
        break;
      case "down":
        (g = t.onSwipeDown) == null || g.call(t);
        break;
    }
    (m = t.onSwipe) == null || m.call(t, u.value), u.value = null, l.value = 0;
  }
  return E(() => {
    const n = v.value;
    if (!n && !a) return;
    const e = n ?? (a ? document : null);
    e && (e.addEventListener("touchstart", f, { passive: !0 }), e.addEventListener("touchmove", w, { passive: !0 }), e.addEventListener("touchend", o));
  }), L(() => {
    const e = v.value ?? document;
    e.removeEventListener("touchstart", f), e.removeEventListener("touchmove", w), e.removeEventListener("touchend", o);
  }), { direction: u, distance: l, isSwiping: c };
}
export {
  T as useSwipe
};

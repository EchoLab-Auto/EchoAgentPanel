import { ref as u, onMounted as d, onBeforeUnmount as l } from "vue";
function v() {
  const t = u(!1), o = u(!1);
  let i;
  function r() {
    o.value = window.innerWidth < 768;
  }
  function a() {
    clearTimeout(i), i = setTimeout(r, 100);
  }
  function s() {
    t.value = !0;
  }
  let e, n;
  return d(() => {
    window.matchMedia && (e = window.matchMedia("(pointer: coarse)"), t.value = e.matches, n = (c) => {
      t.value = c.matches;
    }, e.addEventListener("change", n)), window.addEventListener("touchstart", s, { once: !0, passive: !0 }), r(), window.addEventListener("resize", a, { passive: !0 });
  }), l(() => {
    e && n && e.removeEventListener("change", n), window.removeEventListener("touchstart", s), window.removeEventListener("resize", a), clearTimeout(i);
  }), { isTouch: t, isMobile: o };
}
export {
  v as useTouchDevice
};

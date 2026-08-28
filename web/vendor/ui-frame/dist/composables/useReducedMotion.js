import { ref as r, getCurrentInstance as u, onBeforeUnmount as c } from "vue";
const d = "(prefers-reduced-motion: reduce)";
function f() {
  return typeof window < "u" && window.matchMedia(d).matches;
}
function l() {
  const t = r(f());
  let e = null, n = null;
  typeof window < "u" && (e = window.matchMedia(d), n = (i) => {
    t.value = i.matches;
  }, e.addEventListener("change", n));
  function o() {
    e && n && (e.removeEventListener("change", n), e = null, n = null);
  }
  return u() && c(o), { isReducedMotion: t, stop: o };
}
export {
  l as default,
  f as prefersReducedMotion,
  l as useReducedMotion
};

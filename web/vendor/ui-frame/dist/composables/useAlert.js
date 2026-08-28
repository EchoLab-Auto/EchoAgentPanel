import { ref as o, onBeforeUnmount as a } from "vue";
function m(s = {}) {
  const { duration: i = 0 } = s, t = o(!0), l = o(!1);
  let u = null, e = null;
  function n() {
    u && (clearTimeout(u), u = null), e && (clearTimeout(e), e = null);
  }
  function r() {
    l.value || !t.value || (n(), l.value = !0, e = setTimeout(() => {
      t.value = !1, l.value = !1, e = null;
    }, 250));
  }
  return i > 0 && (u = setTimeout(() => {
    r();
  }, i)), a(() => {
    n();
  }), {
    isVisible: t,
    close: r,
    leaving: l
  };
}
export {
  m as useAlert
};

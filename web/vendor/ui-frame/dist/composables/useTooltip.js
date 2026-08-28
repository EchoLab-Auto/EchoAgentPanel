import { ref as m, onBeforeUnmount as s } from "vue";
function v(t = {}) {
  const { disabled: u } = t, f = t.delay ?? 150, n = m(!1);
  let e = null, l = null;
  function i() {
    u != null && u.value || (l && (clearTimeout(l), l = null), e = setTimeout(() => {
      n.value = !0;
    }, f));
  }
  function o() {
    e && (clearTimeout(e), e = null), l = setTimeout(() => {
      n.value = !1;
    }, 100);
  }
  function r() {
    u != null && u.value || (n.value ? o() : i());
  }
  function a(c) {
    c.key === "Escape" && (n.value = !1);
  }
  return s(() => {
    e && (clearTimeout(e), e = null), l && (clearTimeout(l), l = null);
  }), { isVisible: n, show: i, hide: o, toggle: r, handleKeydown: a };
}
export {
  v as useTooltip
};

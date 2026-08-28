import { ref as s, onBeforeUnmount as T } from "vue";
function p(t = {}) {
  const { trigger: o, disabled: e } = t, f = t.delay ?? 150, n = s(!1);
  let u = null, l = null;
  const c = (o == null ? void 0 : o.value) ?? "click";
  function r() {
    e != null && e.value || (l && (clearTimeout(l), l = null), c === "hover" ? u = setTimeout(() => {
      n.value = !0;
    }, f) : n.value = !0);
  }
  function i() {
    u && (clearTimeout(u), u = null), l = setTimeout(() => {
      n.value = !1;
    }, 100);
  }
  function a() {
    e != null && e.value || (n.value ? i() : r());
  }
  function v(m) {
    if (!(e != null && e.value) && m.key === "Escape") {
      n.value = !1;
      return;
    }
  }
  return T(() => {
    u && (clearTimeout(u), u = null), l && (clearTimeout(l), l = null);
  }), {
    isOpen: n,
    show: r,
    hide: i,
    toggle: a,
    handleKeydown: v
  };
}
export {
  p as usePopover
};

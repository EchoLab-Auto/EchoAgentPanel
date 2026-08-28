import { ref as b, watch as i } from "vue";
function m(a) {
  const { modelValue: r } = a;
  function o(e) {
    return r.value === e.value;
  }
  function t(e) {
    var n;
    return !!((n = a.disabled) != null && n.value || e.disabled);
  }
  function f() {
    return a.options.value.map((e, n) => ({ option: e, index: n })).filter(({ option: e }) => !t(e)).map(({ index: e }) => e);
  }
  function d() {
    const n = a.options.value.findIndex((c) => c.value === r.value && !t(c));
    if (n >= 0) return n;
    const l = f();
    return l.length > 0 ? l[0] : 0;
  }
  const u = b(d());
  i(
    () => a.options.value,
    () => {
      const e = a.options.value[u.value];
      (!e || t(e)) && (u.value = d());
    }
  ), i(r, () => {
    const e = a.options.value.findIndex(
      (n) => n.value === r.value && !t(n)
    );
    e >= 0 && (u.value = e);
  });
  function v(e) {
    var l;
    if (t(e)) return;
    r.value = e.value;
    const n = a.options.value.indexOf(e);
    n >= 0 && (u.value = n), (l = a.onChange) == null || l.call(a, e.value);
  }
  function h(e) {
    return e === u.value ? 0 : -1;
  }
  function s(e) {
    const n = f();
    if (n.length === 0) return;
    const l = n.indexOf(u.value), c = l === -1 ? n[0] : n[(l + e + n.length) % n.length];
    u.value = c, v(a.options.value[c]);
  }
  function x(e) {
    const n = f();
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault(), s(1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault(), s(-1);
        break;
      case "Home":
        n.length > 0 && (e.preventDefault(), u.value = n[0], v(a.options.value[n[0]]));
        break;
      case "End":
        n.length > 0 && (e.preventDefault(), u.value = n[n.length - 1], v(a.options.value[n[n.length - 1]]));
        break;
    }
  }
  return { isActive: o, isItemDisabled: t, select: v, focusIndex: u, tabindexFor: h, handleKeydown: x };
}
export {
  m as useSegmented
};

function f(s) {
  const { modelValue: n, items: c } = s, l = s.accordion;
  function o(e) {
    const i = c.value.find((r) => r.key === e);
    if (i != null && i.disabled) return;
    const u = [...n.value], t = u.indexOf(e);
    if (t >= 0)
      u.splice(t, 1);
    else {
      if (l != null && l.value) {
        n.value = [e];
        return;
      }
      u.push(e);
    }
    n.value = u;
  }
  function a(e) {
    return n.value.includes(e);
  }
  return { toggle: o, isActive: a };
}
export {
  f as useCollapse
};

import { computed as i } from "vue";
function D(o) {
  const { modelValue: f, total: g } = o, p = o.pageSize ?? i(() => 10), d = o.maxVisiblePages ?? i(() => 7), c = o.disabled ?? i(() => !1), u = i(() => Math.max(1, Math.ceil(g.value / p.value))), l = i(() => Math.min(Math.max(1, f.value), u.value));
  function v(n) {
    if (isNaN(n) || !isFinite(n)) return;
    const e = Math.round(n);
    c.value || e < 1 || e > u.value || e === l.value || (f.value = e);
  }
  function x() {
    v(l.value - 1);
  }
  function P() {
    v(l.value + 1);
  }
  const M = i(() => l.value <= 1 || c.value), b = i(() => l.value >= u.value || c.value), N = i(() => {
    const n = d.value, e = u.value, h = l.value;
    if (e <= n)
      return Array.from({ length: e }, (r, V) => V + 1);
    const m = Math.floor(n / 2);
    let a = h - m, t = h + m;
    a < 1 && (t += 1 - a, a = 1), t > e && (a -= t - e, t = e), a = Math.max(1, a), t = Math.min(e, t);
    const s = [];
    a > 1 && s.push(1), a > 2 && s.push("prev-ellipsis");
    for (let r = a; r <= t; r++) s.push(r);
    return t < e - 1 && s.push("next-ellipsis"), t < e && s.push(e), s;
  });
  return {
    totalPages: u,
    currentPage: l,
    visiblePages: N,
    changePage: v,
    prevPage: x,
    nextPage: P,
    isPrevDisabled: M,
    isNextDisabled: b
  };
}
export {
  D as usePagination
};

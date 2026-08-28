import { ref as h, computed as i } from "vue";
function B(u, s) {
  return u == null && s == null ? 0 : u == null ? -1 : s == null ? 1 : typeof u == "number" && typeof s == "number" ? u - s : String(u).localeCompare(String(s));
}
function I(u, s) {
  const o = u[s];
  return o != null ? String(o) : "";
}
function q(u) {
  const { data: s, columns: o } = u, F = u.rowKey ?? { value: "key" }, d = u.selectable ?? { value: !1 }, r = u.selectedKeys ?? h([]), c = h({ key: "", direction: null }), g = h({}), w = i(
    () => o.value.map((e) => ({
      align: "left",
      ...e
    }))
  ), k = i(() => {
    const e = [...s.value], { key: t, direction: l } = c.value;
    if (!t || !l) return e;
    const n = o.value.find((a) => a.key === t);
    return n != null && n.sortable && e.sort((a, S) => {
      const y = a[t], p = S[t], v = n.sorter ? n.sorter(y, p) : B(y, p);
      return l === "ascend" ? v : -v;
    }), e;
  }), m = i(() => {
    const e = g.value, t = Object.keys(e).filter((l) => {
      var n;
      return ((n = e[l]) == null ? void 0 : n.length) > 0;
    });
    return t.length === 0 ? k.value : k.value.filter((l) => {
      for (const n of t) {
        const a = o.value.find((v) => v.key === n);
        if (!(a != null && a.filterable)) continue;
        const S = l[n], y = e[n];
        if (!(a.filter ? y.some((v) => a.filter(S, v)) : y.includes(S))) return !1;
      }
      return !0;
    });
  }), x = i(() => m.value.length), b = i(() => {
    const e = u.pagination;
    if (!e || !e.enabled.value) return m.value;
    const t = (e.currentPage.value - 1) * e.pageSize.value;
    return m.value.slice(t, t + e.pageSize.value);
  });
  function D(e) {
    const t = c.value;
    t.key !== e ? c.value = { key: e, direction: "ascend" } : t.direction === "ascend" ? c.value = { key: e, direction: "descend" } : c.value = { key: "", direction: null };
  }
  function z(e, t) {
    c.value = { key: e, direction: t };
  }
  function A(e, t) {
    t.length === 0 ? delete g.value[e] : g.value[e] = t;
  }
  function C() {
    g.value = {};
  }
  const f = i(
    () => b.value.map((e) => I(e, F.value)).filter(Boolean)
  );
  function O(e) {
    return d.value ? r.value.includes(e) : !1;
  }
  function R(e) {
    if (!d.value) return;
    const t = d.value === !0 ? "multiple" : d.value, l = r.value, n = l.indexOf(e);
    t === "single" ? r.value = n >= 0 ? [] : [e] : n >= 0 ? l.splice(n, 1) : l.push(e);
  }
  function T() {
    if (!d.value) return;
    const e = f.value;
    if (e.every((l) => r.value.includes(l)))
      r.value = r.value.filter((l) => !e.includes(l));
    else {
      const l = /* @__PURE__ */ new Set([...r.value, ...e]);
      r.value = [...l];
    }
  }
  function V() {
    r.value = [];
  }
  const K = i(() => f.value.length === 0 ? !1 : f.value.every((e) => r.value.includes(e))), j = i(() => f.value.length === 0 ? !1 : f.value.some((t) => r.value.includes(t)) && !K.value);
  return {
    resolvedColumns: w,
    displayData: b,
    filteredTotal: x,
    sortState: c,
    filterState: g,
    toggleSort: D,
    setSort: z,
    setFilter: A,
    clearFilters: C,
    isSelected: O,
    toggleSelect: R,
    selectAll: T,
    clearSelection: V,
    selectedKeys: r,
    allKeys: f,
    isAllSelected: K,
    isIndeterminate: j
  };
}
export {
  q as useTable
};

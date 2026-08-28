import { ref as O, computed as p, watch as N, onBeforeUnmount as W } from "vue";
function z(C) {
  const { modelValue: f, options: h, disabled: t, multiple: k, filterText: y } = C, n = O(!1), c = p(() => (k == null ? void 0 : k.value) ?? !1);
  function m(e) {
    return Array.isArray(e) ? e : e == null || e === "" ? [] : [e];
  }
  const w = p(() => m(f.value)), E = p(() => h.value.find((e) => e.value === f.value)), L = p(
    () => h.value.filter((e) => w.value.includes(e.value))
  );
  function B(e) {
    return c.value ? w.value.includes(e.value) : f.value === e.value;
  }
  const D = p(() => {
    const e = y == null ? void 0 : y.value.trim().toLowerCase();
    return e ? h.value.filter((u) => u.label.toLowerCase().includes(e)) : h.value;
  }), M = p(() => {
    const e = [], u = /* @__PURE__ */ new Map();
    for (const a of D.value) {
      const l = a.group ?? "";
      let r = u.get(l);
      r || (r = { name: l, options: [] }, u.set(l, r), e.push(r)), r.options.push(a);
    }
    return e;
  }), i = O(void 0);
  function o() {
    return D.value.filter((e) => !e.disabled);
  }
  function A() {
    const e = o();
    if (e.length === 0) {
      i.value = void 0;
      return;
    }
    const u = w.value, a = u[u.length - 1], l = e.find((r) => r.value === a);
    i.value = (l ?? e[0]).value;
  }
  N(n, (e) => {
    e && c.value && A();
  });
  const g = O("");
  let v = null;
  function s() {
    g.value = "", v && (clearTimeout(v), v = null);
  }
  W(s);
  function x(e) {
    g.value += e.toLowerCase(), v && clearTimeout(v), v = setTimeout(() => {
      g.value = "";
    }, 500);
    const u = o(), a = g.value;
    let l = u.find((r) => r.label.toLowerCase().startsWith(a));
    l || (l = u.find((r) => r.label.toLowerCase().includes(a))), l && (c.value ? i.value = l.value : d(l));
  }
  function K() {
    t != null && t.value || (n.value = !n.value);
  }
  function S() {
    n.value = !1, s();
  }
  function d(e) {
    e.disabled || t != null && t.value || (f.value = e.value);
  }
  function T(e) {
    if (e.disabled || t != null && t.value) return;
    const u = m(f.value), a = u.indexOf(e.value);
    a >= 0 ? u.splice(a, 1) : u.push(e.value), f.value = u, i.value = e.value, y && (y.value = "");
  }
  function U(e) {
    if (!(e.disabled || t != null && t.value)) {
      if (c.value) {
        T(e), s();
        return;
      }
      f.value = e.value, n.value = !1, s();
    }
  }
  function b(e) {
    t != null && t.value || (f.value = m(f.value).filter((u) => u !== e));
  }
  function H(e) {
    t != null && t.value || (c.value ? f.value = e ?? [] : f.value = e, n.value = !1, s());
  }
  function V(e) {
    const u = o();
    if (u.length === 0) return;
    const a = u.findIndex((r) => r.value === i.value), l = a === -1 ? e === 1 ? u[0] : u[u.length - 1] : u[(a + e + u.length) % u.length];
    l && (i.value = l.value);
  }
  function I(e) {
    if (t != null && t.value) return;
    if (e.key === "Escape") {
      n.value = !1, s();
      return;
    }
    if (c.value) {
      if (e.key === "Enter" || e.key === " ") {
        if (e.preventDefault(), !n.value) {
          n.value = !0;
          return;
        }
        i.value === void 0 && A();
        const l = o().find((r) => r.value === i.value);
        l && T(l);
        return;
      }
      if (e.key === "ArrowDown") {
        if (e.preventDefault(), !n.value) {
          n.value = !0;
          return;
        }
        V(1);
        return;
      }
      if (e.key === "ArrowUp") {
        if (e.preventDefault(), !n.value) return;
        V(-1);
        return;
      }
      if (!n.value) return;
      if (e.key === "Home") {
        e.preventDefault();
        const l = o()[0];
        l && (i.value = l.value);
      } else if (e.key === "End") {
        e.preventDefault();
        const l = o(), r = l[l.length - 1];
        r && (i.value = r.value);
      } else e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && (e.preventDefault(), x(e.key));
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault(), K();
      return;
    }
    if (e.key === "ArrowDown" && !n.value) {
      e.preventDefault(), n.value = !0;
      return;
    }
    if (!n.value) return;
    const u = o();
    if (u.length === 0) return;
    const a = u.findIndex((l) => l.value === f.value);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const l = a + 1 < u.length ? u[a + 1] : u[0];
      l && d(l);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const l = a - 1 >= 0 ? u[a - 1] : u[u.length - 1];
      l && d(l);
    } else e.key === "Home" ? (e.preventDefault(), u[0] && d(u[0])) : e.key === "End" ? (e.preventDefault(), u[u.length - 1] && d(u[u.length - 1])) : e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && (e.preventDefault(), x(e.key));
  }
  function q(e, u) {
    u.contains(e) || (n.value = !1, s());
  }
  return {
    isOpen: n,
    selectedOption: E,
    selectedOptions: L,
    filteredOptions: D,
    groupedOptions: M,
    activeValue: i,
    isSelected: B,
    toggleOpen: K,
    close: S,
    selectOption: U,
    removeValue: b,
    clearValue: H,
    handleKeydown: I,
    handleBlur: q
  };
}
export {
  z as useSelect
};

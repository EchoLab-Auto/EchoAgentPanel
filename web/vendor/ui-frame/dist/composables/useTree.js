import { ref as p, computed as K, onBeforeUnmount as G, watch as A, nextTick as E } from "vue";
function M(r, a) {
  if (r.length !== a.length) return !1;
  for (let c = 0; c < r.length; c++)
    if (r[c] !== a[c]) return !1;
  return !0;
}
function J(r) {
  const a = [];
  function c(l) {
    var u;
    for (const o of l)
      a.push(o.key), (u = o.children) != null && u.length && c(o.children);
  }
  return c(r), a;
}
function Q(r, a) {
  const c = [], l = a.toLowerCase();
  function u(o) {
    var s;
    let t = !1;
    for (const d of o) {
      const g = d.label.toLowerCase().includes(l);
      let h = !1;
      (s = d.children) != null && s.length && (h = u(d.children)), (g || h) && (c.push(d.key), t = !0);
    }
    return t;
  }
  return u(r), c;
}
function k(r, a) {
  var c;
  for (const l of r) {
    if (l.key === a) return l;
    if ((c = l.children) != null && c.length) {
      const u = k(l.children, a);
      if (u) return u;
    }
  }
  return null;
}
function I(r, a, c = []) {
  var l;
  for (const u of r)
    c.push(u), (l = u.children) != null && l.length && a.includes(u.key) && I(u.children, a, c);
  return c;
}
function P(r, a = null, c = /* @__PURE__ */ new Map()) {
  var l;
  for (const u of r)
    c.set(u.key, a), (l = u.children) != null && l.length && P(u.children, u.key, c);
  return c;
}
function Y(r) {
  var T, L;
  const { data: a } = r, c = r.multiple ?? p(!1), l = p([...((T = r.expandedKeys) == null ? void 0 : T.value) ?? []]), u = p([...((L = r.selectedKeys) == null ? void 0 : L.value) ?? []]), o = p(""), t = p(null), s = /* @__PURE__ */ new Set();
  function d(e, n, i) {
    e && A(
      () => e.value,
      (w) => {
        if (s.has(i)) return;
        const f = [...w];
        M(n.value, f) || (s.add(i), n.value = f, E(() => {
          s.delete(i);
        }));
      },
      { immediate: !0, deep: !0 }
    );
  }
  function g(e, n, i) {
    n && A(
      () => e.value,
      (w) => {
        if (s.has(i)) return;
        const f = [...w];
        M(n.value, f) || (s.add(i), n.value = f, E(() => {
          s.delete(i);
        }));
      },
      { deep: !0 }
    );
  }
  d(r.selectedKeys, u, "selected"), d(r.expandedKeys, l, "expanded"), g(u, r.selectedKeys, "selected"), g(l, r.expandedKeys, "expanded");
  const h = K(() => J(a.value)), v = K(() => I(a.value, l.value)), C = K(() => P(a.value));
  function x(e) {
    const n = l.value.indexOf(e);
    n === -1 ? l.value.push(e) : l.value.splice(n, 1);
  }
  function D(e) {
    if (c.value) {
      const n = u.value.indexOf(e);
      n === -1 ? u.value.push(e) : u.value.splice(n, 1);
    } else
      u.value = [e];
  }
  function F() {
    l.value = [...h.value];
  }
  function N() {
    l.value = [];
  }
  function S(e) {
    if (o.value = e, e.trim()) {
      const n = Q(a.value, e);
      l.value = [.../* @__PURE__ */ new Set([...l.value, ...n])];
    }
  }
  let b = "", y = null;
  function O(e) {
    b += e.toLowerCase(), y && clearTimeout(y), y = setTimeout(() => {
      b = "";
    }, 500);
    const n = v.value, i = t.value ? n.findIndex((m) => m.key === t.value) + 1 : 0, f = [...n.slice(i), ...n.slice(0, i)].find((m) => m.label.toLowerCase().startsWith(b));
    f && (t.value = f.key);
  }
  G(() => {
    y && clearTimeout(y);
  });
  function B() {
    const e = v.value;
    if (!e.length) return;
    if (!t.value) {
      t.value = e[0].key;
      return;
    }
    const n = e.findIndex((i) => i.key === t.value);
    n >= 0 && n < e.length - 1 && (t.value = e[n + 1].key);
  }
  function U() {
    const e = v.value;
    if (!e.length) return;
    if (!t.value) {
      t.value = e[e.length - 1].key;
      return;
    }
    const n = e.findIndex((i) => i.key === t.value);
    n > 0 && (t.value = e[n - 1].key);
  }
  function q() {
    const e = v.value;
    e.length && (t.value = e[0].key);
  }
  function H() {
    const e = v.value;
    e.length && (t.value = e[e.length - 1].key);
  }
  function R() {
    if (!t.value) return;
    const e = C.value.get(t.value);
    e && (t.value = e);
  }
  function V() {
    var n;
    if (!t.value) return;
    const e = k(a.value, t.value);
    (n = e == null ? void 0 : e.children) != null && n.length && (l.value.includes(e.key) || x(e.key), t.value = e.children[0].key);
  }
  function W() {
    var n;
    if (!t.value) return;
    const e = k(a.value, t.value);
    (n = e == null ? void 0 : e.children) != null && n.length && l.value.includes(e.key) ? x(e.key) : R();
  }
  function j() {
    var n;
    if (!t.value) return;
    const e = k(a.value, t.value);
    (n = e == null ? void 0 : e.children) != null && n.length && x(e.key);
  }
  function z(e) {
    const n = e.key;
    if (n.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      O(n), e.preventDefault();
      return;
    }
    switch (n) {
      case "ArrowDown":
        B(), e.preventDefault();
        break;
      case "ArrowUp":
        U(), e.preventDefault();
        break;
      case "ArrowRight":
        V(), e.preventDefault();
        break;
      case "ArrowLeft":
        W(), e.preventDefault();
        break;
      case "Enter":
      case " ":
        t.value && D(t.value), e.preventDefault();
        break;
      case "Home":
        q(), e.preventDefault();
        break;
      case "End":
        H(), e.preventDefault();
        break;
      case "*":
        j(), e.preventDefault();
        break;
    }
  }
  return {
    localExpandedKeys: l,
    localSelectedKeys: u,
    allKeys: h,
    searchText: o,
    focusedKey: t,
    toggleExpand: x,
    select: D,
    findNode: k,
    expandAll: F,
    collapseAll: N,
    onSearchInput: S,
    handleKeydown: z
  };
}
export {
  Y as useTree
};

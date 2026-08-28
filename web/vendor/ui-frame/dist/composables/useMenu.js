import { ref as g, watch as b, nextTick as x, computed as K, onBeforeUnmount as J } from "vue";
function C(a, u, t = []) {
  var r;
  for (const i of a)
    t.push(i), (r = i.children) != null && r.length && u.includes(i.key) && C(i.children, u, t);
  return t;
}
function Q(a) {
  const u = [];
  function t(r) {
    var i;
    for (const n of r)
      u.push(n.key), (i = n.children) != null && i.length && t(n.children);
  }
  return t(a), u;
}
function w(a, u) {
  var t;
  for (const r of a) {
    if (r.key === u) return r;
    if ((t = r.children) != null && t.length) {
      const i = w(r.children, u);
      if (i) return i;
    }
  }
  return null;
}
function M(a, u = null, t = /* @__PURE__ */ new Map()) {
  var r;
  for (const i of a)
    t.set(i.key, u), (r = i.children) != null && r.length && M(i.children, i.key, t);
  return t;
}
function z(a, u) {
  if (a.length !== u.length) return !1;
  for (let t = 0; t < a.length; t++)
    if (a[t] !== u[t]) return !1;
  return !0;
}
function Y(a) {
  const { items: u, onSelect: t } = a, r = a.mode ?? g("vertical"), i = a.disabled ?? g(!1), n = g(null), f = g([]);
  let o = !1;
  a.activeKey && (b(
    () => a.activeKey.value,
    (e) => {
      o || n.value !== e && (o = !0, n.value = e, x(() => {
        o = !1;
      }));
    },
    { immediate: !0 }
  ), b(
    () => n.value,
    (e) => {
      o || a.activeKey.value !== e && (o = !0, a.activeKey.value = e, x(() => {
        o = !1;
      }));
    }
  ));
  let d = !1;
  a.expandedKeys && (b(
    () => a.expandedKeys.value,
    (e) => {
      d || z(f.value, e) || (d = !0, f.value = [...e], x(() => {
        d = !1;
      }));
    },
    { immediate: !0, deep: !0 }
  ), b(
    () => f.value,
    (e) => {
      d || z(a.expandedKeys.value, e) || (d = !0, a.expandedKeys.value = [...e], x(() => {
        d = !1;
      }));
    },
    { deep: !0 }
  ));
  const N = K(() => Q(u.value)), F = K(() => C(u.value, f.value)), V = K(() => M(u.value)), v = K(() => F.value.filter((e) => !e.disabled));
  function k(e) {
    return f.value.includes(e);
  }
  function B(e) {
    return n.value === e;
  }
  function p(e) {
    f.value.includes(e) || f.value.push(e);
  }
  function m(e) {
    const l = f.value.indexOf(e);
    l !== -1 && f.value.splice(l, 1);
  }
  function D(e) {
    k(e) ? m(e) : p(e);
  }
  function H(e) {
    var l;
    i.value || e.disabled || ((l = e.children) != null && l.length ? D(e.key) : (n.value = e.key, t == null || t(e)));
  }
  function O(e) {
    var l;
    i.value || e.disabled || (r.value === "horizontal" && ((l = e.children) != null && l.length) && p(e.key), n.value = e.key);
  }
  function U(e) {
    var l;
    i.value || e.disabled || r.value === "horizontal" && ((l = e.children) != null && l.length);
  }
  let A = "", h = null;
  function _(e) {
    A += e.toLowerCase(), h && clearTimeout(h), h = setTimeout(() => {
      A = "";
    }, 500);
    const l = v.value, c = n.value ? l.findIndex((E) => E.key === n.value) + 1 : 0, s = [...l.slice(c), ...l.slice(0, c)].find((E) => E.label.toLowerCase().startsWith(A));
    s && (n.value = s.key);
  }
  J(() => {
    h && clearTimeout(h);
  });
  function I() {
    const e = v.value;
    if (!e.length) return;
    if (!n.value) {
      n.value = e[0].key;
      return;
    }
    const l = e.findIndex((c) => c.key === n.value);
    l >= 0 && l < e.length - 1 ? n.value = e[l + 1].key : n.value = e[0].key;
  }
  function L() {
    const e = v.value;
    if (!e.length) return;
    if (!n.value) {
      n.value = e[e.length - 1].key;
      return;
    }
    const l = e.findIndex((c) => c.key === n.value);
    l > 0 ? n.value = e[l - 1].key : n.value = e[e.length - 1].key;
  }
  function q() {
    const e = v.value;
    e.length && (n.value = e[0].key);
  }
  function R() {
    const e = v.value;
    e.length && (n.value = e[e.length - 1].key);
  }
  function W() {
    if (!n.value) return;
    const e = V.value.get(n.value);
    e && (n.value = e);
  }
  function P() {
    var l;
    if (!n.value) return;
    const e = w(u.value, n.value);
    (l = e == null ? void 0 : e.children) != null && l.length && (k(e.key) || p(e.key), n.value = e.children[0].key);
  }
  function T() {
    var l;
    if (!n.value) return;
    const e = w(u.value, n.value);
    (l = e == null ? void 0 : e.children) != null && l.length && k(e.key) ? m(e.key) : W();
  }
  function j() {
    var l;
    if (!n.value) return;
    const e = w(u.value, n.value);
    !e || e.disabled || ((l = e.children) != null && l.length ? D(e.key) : t == null || t(e));
  }
  function G(e) {
    if (i.value) return;
    const l = e.key;
    if (l.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      _(l), e.preventDefault();
      return;
    }
    const y = r.value === "vertical", s = r.value === "horizontal";
    switch (l) {
      case "ArrowDown":
        y ? I() : s && P(), e.preventDefault();
        break;
      case "ArrowUp":
        y ? L() : s && T(), e.preventDefault();
        break;
      case "ArrowRight":
        y ? P() : s && I(), e.preventDefault();
        break;
      case "ArrowLeft":
        y ? T() : s && L(), e.preventDefault();
        break;
      case "Enter":
      case " ":
        j(), e.preventDefault();
        break;
      case "Escape":
        f.value = [], n.value = null, e.preventDefault();
        break;
      case "Home":
        q(), e.preventDefault();
        break;
      case "End":
        R(), e.preventDefault();
        break;
    }
  }
  return {
    activeKey: n,
    expandedKeys: f,
    allKeys: N,
    handleKeydown: G,
    handleItemClick: H,
    handleItemEnter: O,
    handleItemLeave: U,
    isExpanded: k,
    isActive: B,
    expand: p,
    collapse: m,
    toggleExpand: D
  };
}
export {
  Y as useMenu
};

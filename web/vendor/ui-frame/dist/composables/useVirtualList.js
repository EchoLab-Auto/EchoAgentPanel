import { computed as M, ref as s, onMounted as k, onBeforeUnmount as q, watch as B } from "vue";
function C(v) {
  const { items: a } = v, R = M(() => {
    const e = v.overscan;
    return e == null ? 5 : typeof e == "number" ? e : e.value ?? 5;
  }), z = M(() => {
    const e = v.itemHeight;
    let n;
    if (typeof e == "number")
      n = () => e;
    else if (typeof e == "function")
      n = e;
    else {
      const t = e.value;
      n = typeof t == "number" ? () => t : t;
    }
    return n;
  }), d = s(null), f = s(0);
  let h = null;
  function F() {
    h && (h.disconnect(), h = null);
  }
  function E() {
    F();
    const e = d.value;
    !e || typeof ResizeObserver > "u" || (f.value = e.clientHeight, h = new ResizeObserver(([n]) => {
      const t = n.contentRect.height;
      t !== f.value && (f.value = t);
    }), h.observe(e));
  }
  k(() => {
    E();
  }), q(() => {
    F();
  });
  const O = s(0);
  function L() {
    const e = d.value;
    e && (O.value = e.scrollTop);
  }
  let p = /* @__PURE__ */ new Map();
  function I(e) {
    const n = z.value, t = p.get(e);
    if (t !== void 0) return t;
    const l = n(e);
    return p.set(e, l), l;
  }
  const T = M(() => {
    const e = v.itemHeight;
    return typeof e == "number" || typeof e != "function" && typeof e.value == "number";
  });
  function x() {
    const e = v.itemHeight;
    return typeof e == "number" ? e : typeof e != "function" ? e.value ?? 30 : 30;
  }
  let c = null;
  function S() {
    const e = a.value.length, n = [0];
    for (let t = 0; t < e; t++)
      n.push(n[t] + I(t));
    return n;
  }
  const g = s(0), b = s(0), w = s(0), y = s(0);
  function V() {
    const e = a.value.length;
    if (e === 0) {
      g.value = 0, b.value = 0, w.value = 0, y.value = 0;
      return;
    }
    const n = f.value;
    if (n === 0) return;
    const t = R.value, l = O.value;
    let u, o;
    if (T.value) {
      const r = x();
      g.value = e * r, u = Math.floor(l / r), o = Math.ceil((l + n) / r);
    } else {
      c = S(), g.value = c[e];
      let r = 0, i = e - 1;
      for (u = 0; r <= i; ) {
        const H = r + i >>> 1;
        c[H + 1] <= l ? r = H + 1 : (u = H, i = H - 1);
      }
      const j = l + n;
      for (o = u; o < e && c[o + 1] < j; ) o++;
    }
    const m = Math.max(0, u - t);
    o = Math.min(e, o + 1 + t), b.value = m, w.value = o, T.value ? y.value = m * x() : y.value = (c == null ? void 0 : c[m]) ?? 0;
  }
  B([() => a.value, () => a.value.length], () => {
    p = /* @__PURE__ */ new Map(), V();
  }), B(
    [O, f, R, z],
    () => {
      p = /* @__PURE__ */ new Map(), V();
    },
    { deep: !1, immediate: !1 }
  );
  const U = M(() => a.value.slice(b.value, w.value));
  function Y(e, n = "top") {
    const t = d.value;
    if (!t) return;
    const l = a.value.length;
    if (l === 0) return;
    const u = Math.max(0, Math.min(l - 1, e)), o = T.value ? u * x() : S()[u], m = I(u), r = f.value;
    let i;
    n === "center" ? i = o - (r - m) / 2 : i = o, t.scrollTo({ top: Math.max(0, i), behavior: "smooth" });
  }
  return {
    containerRef: d,
    visibleItems: U,
    totalHeight: g,
    offsetY: y,
    startIndex: b,
    endIndex: w,
    scrollTo: Y,
    handleScroll: L
  };
}
export {
  C as useVirtualList
};

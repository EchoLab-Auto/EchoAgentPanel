import { computed as w, ref as M, watch as D } from "vue";
function v(r, n, e) {
  return Math.min(Math.max(r, n), e);
}
function g(r, n) {
  const e = Math.pow(10, n);
  return Math.round(r * e) / e;
}
function P(r) {
  if (!Number.isFinite(r) || r <= 0) return 0;
  const n = String(r), e = n.indexOf(".");
  return e === -1 ? 0 : n.length - e - 1;
}
function l(r, n) {
  return r == null || !Number.isFinite(r) ? "" : g(r, n).toFixed(n);
}
function b(r) {
  const n = r.trim();
  if (n === "" || n === "-" || n === "+") return;
  const e = Number(n);
  return Number.isFinite(e) ? e : void 0;
}
function B(r) {
  const {
    modelValue: n,
    min: e = -1 / 0,
    max: m = 1 / 0,
    step: c = 1,
    precision: d,
    disabled: o
  } = r, f = w(() => d !== void 0 ? d : P(c)), i = M(l(n.value, f.value)), k = w(() => i.value);
  D(n, (t) => {
    const u = l(t, f.value);
    b(i.value) !== t && (i.value = u);
  });
  function p(t) {
    if (c <= 0) return t;
    const u = f.value, a = Number.isFinite(e) ? e : 0, I = Math.round((t - a) / c) * c + a;
    return g(I, u);
  }
  function s(t) {
    if (o != null && o.value) return;
    const u = v(t, e, m), a = p(u);
    n.value = a, i.value = l(a, f.value);
  }
  function h() {
    const t = n.value ?? 0, u = v(t + c, e, m);
    s(p(u));
  }
  function x() {
    const t = n.value ?? 0, u = v(t - c, e, m);
    s(p(u));
  }
  function y(t) {
    if (!(o != null && o.value))
      switch (t.key) {
        case "ArrowUp": {
          t.preventDefault(), h();
          break;
        }
        case "ArrowDown": {
          t.preventDefault(), x();
          break;
        }
        case "Enter": {
          t.preventDefault(), N();
          break;
        }
      }
  }
  function F(t) {
    if (o != null && o.value) return;
    const u = t.target;
    i.value = u.value;
  }
  function N() {
    if (o != null && o.value) return;
    const t = b(i.value);
    if (t === void 0) {
      const u = n.value ?? e;
      i.value = l(u, f.value);
      return;
    }
    s(t);
  }
  return {
    displayValue: k,
    increment: h,
    decrement: x,
    setValue: s,
    handleInput: F,
    handleKeydown: y,
    handleBlur: N
  };
}
export {
  l as formatNumber,
  b as parseNumber,
  B as useNumberInput
};

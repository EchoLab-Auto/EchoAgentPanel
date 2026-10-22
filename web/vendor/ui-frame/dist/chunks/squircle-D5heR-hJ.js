const x = Math.PI / 2;
function m(s = 2.5) {
  return 2 / Math.max(2, s);
}
function p(s, e, c, a, n, t, o = 2.5, r = 28) {
  const h = m(o), u = Math.max(2, Math.floor(r)), f = [];
  for (let i = 0; i <= u; i += 1) {
    const l = i / u * x, M = Math.cos(l) ** h, P = Math.sin(l) ** h;
    f.push([s + n * c * (1 - M), e + t * a * (1 - P)]);
  }
  return f;
}
function y(s) {
  const { width: e, height: c, radius: a, exponent: n = 2.5, steps: t = 28 } = s, o = Math.max(0, Math.min(a, e / 2, c / 2)), r = o;
  return [
    ...p(0, 0, o, r, 1, 1, n, t),
    ...p(e, 0, o, r, -1, 1, n, t).reverse(),
    ...p(e, c, o, r, -1, -1, n, t),
    ...p(0, c, o, r, 1, -1, n, t).reverse()
  ];
}
function C(s, e = 2) {
  const c = 10 ** e, a = (t) => Math.round(t * c) / c, n = [];
  for (let t = 0; t < s.length; t += 1) {
    const [o, r] = s[t];
    n.push(`${t === 0 ? "M" : "L"}${a(o)} ${a(r)}`);
  }
  return n.push("Z"), n.join(" ");
}
function $(s, e = 2) {
  return `path("${C(s, e)}")`;
}
function g(s) {
  return $(y(s));
}
function d(s, e, c, a) {
  const n = s.length;
  return s.map((t, o) => {
    const r = s[o === 0 ? 0 : o - 1], h = s[o === n - 1 ? n - 1 : o + 1];
    let u = h[0] - r[0], f = h[1] - r[1];
    const i = Math.hypot(u, f) || 1;
    u /= i, f /= i;
    let l = -f, M = u;
    return (c - t[0]) * l + (a - t[1]) * M < 0 && (l = -l, M = -M), [t[0] + l * e, t[1] + M * e];
  });
}
function k(s, e, c = 2.5, a = 28) {
  const n = s, t = m(c), o = Math.max(2, Math.floor(a)), r = [];
  for (let h = 0; h <= o; h += 1) {
    const u = h / o * x;
    r.push([n - n * Math.cos(u) ** t, n - n * Math.sin(u) ** t]);
  }
  return d(r, e, n, n);
}
export {
  C as a,
  g as b,
  y as c,
  m as d,
  p as e,
  $ as p,
  k as s
};

const n = ["float", "raised", "pressed"];
function e(s) {
  return s ? s === !0 ? "float" : n.includes(s) ? s : !1 : !1;
}
function t(s, r) {
  return r ? [`${s}--glass`, `${s}--glass-${r}`] : [];
}
export {
  n as G,
  t as g,
  e as n
};

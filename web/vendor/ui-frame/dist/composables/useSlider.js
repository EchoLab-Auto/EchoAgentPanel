import { ref as v, computed as g } from "vue";
function s(u, o, e) {
  return Math.min(Math.max(u, o), e);
}
function h(u, o, e) {
  if (e <= 0) return u;
  const r = Math.round((u - o) / e) * e + o, t = (String(e).split(".")[1] ?? "").length;
  return t > 0 ? Number(r.toFixed(t)) : r;
}
function x(u, o, e, r, t, c, d) {
  if (e <= 0) return r;
  let n = (u - o) / e;
  d && (n = 1 - n), n = s(n, 0, 1);
  const m = r + n * (t - r);
  return s(h(m, r, c), r, t);
}
function M(u) {
  const { modelValue: o, min: e, max: r, step: t, disabled: c } = u, d = v(!1), n = g(() => s(o.value, e, r)), m = g(() => {
    const l = r - e;
    return l === 0 ? 0 : (n.value - e) / l * 100;
  });
  function i(l) {
    if (c != null && c.value) return n.value;
    const a = s(h(l, e, t), e, r);
    return o.value = a, a;
  }
  function w(l) {
    if (c != null && c.value) return;
    let a;
    const p = n.value;
    switch (l.key) {
      case "ArrowRight":
      case "ArrowUp": {
        a = i(s(p + t, e, r));
        break;
      }
      case "ArrowLeft":
      case "ArrowDown": {
        a = i(s(p - t, e, r));
        break;
      }
      case "Home": {
        a = i(e);
        break;
      }
      case "End": {
        a = i(r);
        break;
      }
      case "PageUp": {
        const f = Math.max(t * 10, (r - e) / 10);
        a = i(s(p + f, e, r));
        break;
      }
      case "PageDown": {
        const f = Math.max(t * 10, (r - e) / 10);
        a = i(s(p - f, e, r));
        break;
      }
      default:
        return;
    }
    return l.preventDefault(), a;
  }
  return {
    sliderValue: n,
    percentage: m,
    setValue: i,
    handleKeydown: w,
    isDragging: d
  };
}
export {
  x as coordinateToValue,
  M as useSlider
};

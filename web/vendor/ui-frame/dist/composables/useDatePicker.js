import { computed as i, ref as I } from "vue";
function Y(t, n, d) {
  const r = new Date(t, n - 1, d);
  return r.setHours(0, 0, 0, 0), r;
}
function f(t) {
  const n = new Date(t.getTime());
  return n.setHours(0, 0, 0, 0), n;
}
function D(t, n) {
  return !t || !n ? !1 : t.getFullYear() === n.getFullYear() && t.getMonth() === n.getMonth() && t.getDate() === n.getDate();
}
function G(t, n) {
  return (t.getDay() - n + 7) % 7;
}
function J(t, n) {
  const d = t.getFullYear(), r = t.getMonth() + 1, v = t.getDate();
  return n.replace(/yyyy/g, String(d)).replace(/yy/g, String(d).slice(-2)).replace(/MM/g, String(r).padStart(2, "0")).replace(/M/g, String(r)).replace(/dd/g, String(v).padStart(2, "0")).replace(/d/g, String(v));
}
const N = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
function Z(t) {
  const { modelValue: n } = t, d = i(() => {
    const e = t.format;
    return typeof e == "object" && "value" in e ? e.value : e ?? "yyyy-MM-dd";
  }), r = i(() => {
    const e = t.firstDayOfWeek;
    return typeof e == "object" && "value" in e ? e.value : e ?? 0;
  }), v = i(() => {
    const e = t.minDate;
    if (e)
      return e instanceof Date ? e : e.value;
  }), M = i(() => {
    const e = t.maxDate;
    if (e)
      return e instanceof Date ? e : e.value;
  }), y = i(() => n.value), h = n.value ? f(n.value) : typeof window > "u" ? new Date(2024, 0, 1) : /* @__PURE__ */ new Date(), u = I(h.getFullYear()), o = I(h.getMonth() + 1), F = i(() => {
    const e = u.value, a = o.value, s = r.value ?? 0, c = /* @__PURE__ */ new Date();
    c.setHours(0, 0, 0, 0);
    const C = y.value, S = v.value, p = M.value, _ = Y(e, a, 1), K = G(_, s), w = [];
    for (let g = 0; g < 42; g++) {
      const L = g - K, l = Y(e, a, 1 + L), P = l.getMonth() + 1, U = l.getFullYear(), V = P === a && U === e, q = D(l, c), z = D(l, C), B = (S ? l < f(S) : !1) || (p ? l > f(p) : !1);
      w.push({
        date: l,
        day: l.getDate(),
        isCurrentMonth: V,
        isToday: q,
        isSelected: z,
        isDisabled: B,
        isInRange: !1
      });
    }
    return w;
  }), T = i(() => {
    const e = r.value ?? 0, a = [];
    for (let s = 0; s < 7; s++) {
      const c = (e + s) % 7;
      a.push(N[c]);
    }
    return a;
  });
  function x() {
    o.value === 1 ? (o.value = 12, u.value--) : o.value--;
  }
  function O() {
    o.value === 12 ? (o.value = 1, u.value++) : o.value++;
  }
  function k() {
    u.value--;
  }
  function R() {
    u.value++;
  }
  function W() {
    const e = /* @__PURE__ */ new Date();
    u.value = e.getFullYear(), o.value = e.getMonth() + 1;
  }
  function H(e) {
    m(e) || (n.value = f(e));
  }
  function b(e) {
    return D(e, y.value);
  }
  function j(e) {
    const a = /* @__PURE__ */ new Date();
    return a.setHours(0, 0, 0, 0), D(e, a);
  }
  function E(e) {
    return !1;
  }
  function m(e) {
    const a = v.value, s = M.value, c = f(e);
    return !!(a && c < f(a) || s && c > f(s));
  }
  function A(e) {
    return e ? J(e, d.value ?? "yyyy-MM-dd") : "";
  }
  return {
    currentYear: u,
    currentMonth: o,
    calendarDays: F,
    weekdays: T,
    selectedDate: y,
    selectDate: H,
    prevMonth: x,
    nextMonth: O,
    prevYear: k,
    nextYear: R,
    isSelected: b,
    isToday: j,
    isInRange: E,
    isDisabled: m,
    formatDate: A,
    goToToday: W
  };
}
export {
  Z as useDatePicker
};

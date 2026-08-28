import { ref as f, computed as O, watch as L } from "vue";
import { escapeHtml as h } from "../utils/index.js";
function F(C) {
  const { modelValue: b, options: d, searchFn: i, loading: n, debounceMs: D = 300 } = C, r = f(""), u = f(!1), t = f(-1), v = f([]), w = f(!1);
  let s = null;
  function T() {
    s && (clearTimeout(s), s = null);
  }
  const p = O(() => i ? v.value : (d == null ? void 0 : d.value) ?? []), g = O(() => {
    const e = r.value.trim().toLowerCase();
    return i || !e ? p.value : p.value.filter((l) => l.label.toLowerCase().includes(e));
  });
  function x(e) {
    const l = r.value.trim();
    if (!l) return h(e);
    const a = e.toLowerCase(), y = l.toLowerCase();
    let m = "", o = 0;
    for (; o < e.length; ) {
      const c = a.indexOf(y, o);
      if (c === -1) {
        m += h(e.slice(o));
        break;
      }
      m += h(e.slice(o, c)), m += '<mark class="nm-autocomplete__mark">' + h(e.slice(c, c + l.length)) + "</mark>", o = c + l.length;
    }
    return m;
  }
  function A(e) {
    if (!i) return;
    s && clearTimeout(s);
    const l = e.trim();
    if (!l) {
      v.value = [], w.value = !1, n && (n.value = !1);
      return;
    }
    w.value = !0, n && (n.value = !0), s = setTimeout(async () => {
      try {
        const a = await i(l);
        v.value = a;
      } catch {
        v.value = [];
      } finally {
        w.value = !1, n && (n.value = !1);
      }
    }, D);
  }
  L(
    b,
    (e) => {
      if (e === void 0 || e === "" || e === null)
        return;
      const a = p.value.find((y) => y.value === e);
      a && a.label !== r.value && (r.value = a.label);
    },
    { flush: "sync" }
  ), L(g, () => {
    t.value = -1;
  });
  function q() {
    u.value = !0;
  }
  function E() {
    u.value = !1, t.value = -1;
  }
  function k(e) {
    e.disabled || (b.value = e.value, r.value = e.label, u.value = !1, t.value = -1);
  }
  function I(e) {
    r.value = e, t.value = -1, i && A(e), u.value || (u.value = !0);
  }
  function M(e) {
    const l = g.value.filter((a) => !a.disabled);
    switch (e.key) {
      case "ArrowDown":
        if (e.preventDefault(), !u.value) {
          u.value = !0;
          return;
        }
        if (l.length === 0) return;
        t.value = t.value + 1 >= l.length ? 0 : t.value + 1;
        break;
      case "ArrowUp":
        if (e.preventDefault(), !u.value) {
          u.value = !0;
          return;
        }
        if (l.length === 0) return;
        t.value = t.value - 1 < 0 ? l.length - 1 : t.value - 1;
        break;
      case "Enter":
        if (!u.value || l.length === 0) return;
        e.preventDefault(), t.value >= 0 && t.value < l.length && k(l[t.value]);
        break;
      case "Escape":
        e.preventDefault(), u.value = !1, t.value = -1;
        break;
    }
  }
  return {
    inputValue: r,
    isOpen: u,
    filteredOptions: g,
    activeIndex: t,
    highlightMatch: x,
    selectOption: k,
    handleKeydown: M,
    handleInput: I,
    open: q,
    close: E,
    // Expose cleanup for lifecycle integration
    cleanupTimers: T
  };
}
export {
  F as useAutoComplete
};

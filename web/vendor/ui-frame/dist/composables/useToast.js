import { ref as d, onBeforeUnmount as T } from "vue";
function h() {
  return `nm-toast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
function A(c = {}) {
  const { maxCount: i = 5 } = c, t = d([]), a = /* @__PURE__ */ new Map();
  let r = !1;
  function u(e) {
    const l = a.get(e);
    l && (clearTimeout(l), a.delete(e));
  }
  function f(e) {
    const l = h(), o = {
      id: l,
      message: e.message,
      type: e.type || "info",
      duration: e.duration ?? 3e3,
      closable: e.closable ?? !0,
      timestamp: Date.now(),
      leaving: !1
    }, v = t.value.slice(0, Math.max(0, t.value.length - (i - 1)));
    for (const n of v) u(n.id);
    if (t.value = [...t.value.slice(Math.max(0, t.value.length - (i - 1))), o], r) {
      const n = a.get("__clearAll");
      n && (clearTimeout(n), a.delete("__clearAll")), r = !1, t.value = t.value.filter((g) => !g.leaving);
    }
    return o.duration > 0 && (u(l), a.set(
      l,
      setTimeout(() => s(l), o.duration)
    )), l;
  }
  function s(e) {
    u(e);
    const l = t.value.find((o) => o.id === e);
    l && (l.leaving = !0, a.set(
      e,
      setTimeout(() => {
        t.value = t.value.filter((o) => o.id !== e), a.delete(e);
      }, 250)
    ));
  }
  function m() {
    a.forEach((e) => clearTimeout(e)), a.clear(), r = !0, t.value.forEach((e) => {
      e.leaving = !0;
    }), a.set(
      "__clearAll",
      setTimeout(() => {
        t.value = [], a.delete("__clearAll"), r = !1;
      }, 250)
    );
  }
  return T(() => {
    a.forEach((e) => clearTimeout(e)), a.clear();
  }), { toasts: t, addToast: f, removeToast: s, clearAll: m };
}
export {
  A as useToast
};

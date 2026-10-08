import { hasInjectionContext as g, inject as _, ref as h } from "vue";
const A = Symbol("echo-toast");
function x() {
  return `nm-toast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
function p(u = {}) {
  const { maxCount: r = 5 } = u, t = h([]), l = /* @__PURE__ */ new Map();
  let i = !1;
  function c(e) {
    const a = l.get(e);
    a && (clearTimeout(a), l.delete(e));
  }
  function m(e) {
    const a = x(), n = {
      id: a,
      message: e.message,
      type: e.type || "info",
      duration: e.duration ?? 3e3,
      closable: e.closable ?? !0,
      timestamp: Date.now(),
      leaving: !1
    }, d = t.value.slice(0, Math.max(0, t.value.length - (r - 1)));
    for (const s of d) c(s.id);
    if (t.value = [...t.value.slice(Math.max(0, t.value.length - (r - 1))), n], i) {
      const s = l.get("__clearAll");
      s && (clearTimeout(s), l.delete("__clearAll")), i = !1, t.value = t.value.filter((T) => !T.leaving);
    }
    return n.duration > 0 && (c(a), l.set(
      a,
      setTimeout(() => f(a), n.duration)
    )), a;
  }
  function f(e) {
    c(e);
    const a = t.value.find((n) => n.id === e);
    a && (a.leaving = !0, l.set(
      e,
      setTimeout(() => {
        t.value = t.value.filter((n) => n.id !== e), l.delete(e);
      }, 250)
    ));
  }
  function v() {
    l.forEach((e) => clearTimeout(e)), l.clear(), i = !0, t.value.forEach((e) => {
      e.leaving = !0;
    }), l.set(
      "__clearAll",
      setTimeout(() => {
        t.value = [], l.delete("__clearAll"), i = !1;
      }, 250)
    );
  }
  return { toasts: t, addToast: m, removeToast: f, clearAll: v };
}
let o = null;
function M() {
  o == null || o.clearAll(), o = null;
}
function S(u = {}) {
  if (g()) {
    const r = _(A, null);
    if (r) return r;
  }
  return o || (o = p(u)), o;
}
export {
  A as ToastInjectionKey,
  M as __resetSharedToastForTest,
  S as useToast
};

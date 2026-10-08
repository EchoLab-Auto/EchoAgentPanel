import { ref as d, watch as O, nextTick as k, onMounted as B, onBeforeUnmount as D, computed as E } from "vue";
import { useFocusStack as I } from "./useFocusStack.js";
import { useZIndex as Z } from "./useZIndex.js";
const y = /* @__PURE__ */ new WeakMap();
function g(u) {
  return y.get(u) ?? 0;
}
function x(u, n) {
  n <= 0 ? y.delete(u) : y.set(u, n);
}
function A() {
  return typeof window > "u" ? 0 : window.innerWidth - document.documentElement.clientWidth;
}
function U(u) {
  const { modelValue: n } = u, b = u.closable ?? d(!0), w = u.destroyOnClose ?? d(!1), c = d(n.value), r = d(n.value), s = I();
  let m, i = !1;
  const { getZIndex: S, registerOverlay: T } = Z();
  let l = null;
  function C() {
    if (typeof document > "u") return;
    const e = g(document);
    if (x(document, e + 1), e === 0) {
      const t = A();
      t > 0 && (document.body.style.paddingRight = `${t}px`), document.body.style.overflow = "hidden";
    }
  }
  function v() {
    if (typeof document > "u") return;
    const e = g(document), t = Math.max(0, e - 1);
    x(document, t), t === 0 && (document.body.style.overflow = "", document.body.style.paddingRight = "");
  }
  O(
    () => n.value,
    (e) => {
      var t;
      if (e) {
        r.value = !0;
        const o = document.activeElement;
        s.push(o instanceof HTMLElement ? o : null), i = !1, C(), l || (l = T()), k(() => {
          c.value = !0;
        });
      } else if (c.value = !1, clearTimeout(m), w.value && (m = setTimeout(() => {
        r.value = !1;
      }, 200)), i || (v(), i = !0), (t = s.pop()) == null || t.focus(), l) {
        const o = l;
        l = null, setTimeout(o, 250);
      }
    }
  );
  function p() {
    b.value && (n.value = !1);
  }
  function M() {
    n.value = !1;
  }
  function h(e) {
    return e ? Array.from(
      e.querySelectorAll(
        'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled]), [contenteditable]:not([contenteditable="false"])'
      )
    ) : [];
  }
  function W(e) {
    if (!e) return;
    e.focus();
    const t = h(e);
    t.length > 0 && t[0].focus();
  }
  function L(e, t) {
    if (e.key === "Escape" && b.value) {
      p();
      return;
    }
    if (e.key === "Tab" && t) {
      const o = h(t);
      if (o.length === 0) return;
      const f = o[0], a = o[o.length - 1];
      e.shiftKey ? document.activeElement === f && (e.preventDefault(), a == null || a.focus()) : document.activeElement === a && (e.preventDefault(), f == null || f.focus());
    }
  }
  return B(() => {
    n.value && (r.value = !0, k(() => {
      c.value = !0;
    }));
  }), D(() => {
    var e;
    clearTimeout(m), i || (v(), i = !0), c.value && ((e = s.pop()) == null || e.focus()), s.destroy(), l && (l(), l = null);
  }), {
    visible: c,
    rendered: r,
    close: p,
    confirm: M,
    handleKeydown: L,
    focusDialog: W,
    /** Current z-index for the overlay mask (context-aware). */
    overlayZIndex: E(() => S("overlay"))
  };
}
export {
  U as useModal
};

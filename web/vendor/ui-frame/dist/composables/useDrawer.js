import { ref as i, watch as B, nextTick as k, onMounted as E, onBeforeUnmount as I, computed as Z } from "vue";
import { useZIndex as A } from "./useZIndex.js";
import { useFocusStack as F } from "./useFocusStack.js";
const v = /* @__PURE__ */ new WeakMap();
function g(n) {
  return v.get(n) ?? 0;
}
function x(n, o) {
  o <= 0 ? v.delete(n) : v.set(n, o);
}
function K() {
  return typeof window > "u" ? 0 : window.innerWidth - document.documentElement.clientWidth;
}
function H(n) {
  const { modelValue: o } = n, C = n.maskClosable ?? i(!0), m = n.closable ?? i(!0), S = n.destroyOnClose ?? i(!1), c = i(o.value), s = i(o.value), r = F();
  let y, a = !1;
  const { getZIndex: T, registerOverlay: w } = A();
  let l = null;
  function M() {
    if (typeof document > "u") return;
    const e = g(document);
    if (x(document, e + 1), e === 0) {
      const t = K();
      t > 0 && (document.body.style.paddingRight = `${t}px`), document.body.style.overflow = "hidden";
    }
  }
  function p() {
    if (typeof document > "u") return;
    const e = g(document), t = Math.max(0, e - 1);
    x(document, t), t === 0 && (document.body.style.overflow = "", document.body.style.paddingRight = "");
  }
  B(
    () => o.value,
    (e) => {
      var t;
      if (e) {
        s.value = !0;
        const u = document.activeElement;
        r.push(u instanceof HTMLElement ? u : null), M(), l || (l = w()), k(() => {
          c.value = !0;
        });
      } else if (c.value = !1, clearTimeout(y), S.value && (y = setTimeout(() => {
        s.value = !1;
      }, 200)), a || (p(), a = !0), (t = r.pop()) == null || t.focus(), l) {
        const u = l;
        l = null, setTimeout(u, 250);
      }
    }
  );
  function O() {
    o.value = !0;
  }
  function b() {
    m.value && (o.value = !1);
  }
  function W() {
    C.value && m.value && b();
  }
  function h(e) {
    return e ? Array.from(
      e.querySelectorAll(
        'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled]), [contenteditable]:not([contenteditable="false"])'
      )
    ) : [];
  }
  function D(e) {
    if (!e) return;
    e.focus();
    const t = h(e);
    t.length > 0 && t[0].focus();
  }
  function L(e, t) {
    if (e.key === "Escape" && m.value) {
      b();
      return;
    }
    if (e.key === "Tab" && t) {
      const u = h(t);
      if (u.length === 0) return;
      const f = u[0], d = u[u.length - 1];
      e.shiftKey ? document.activeElement === f && (e.preventDefault(), d == null || d.focus()) : document.activeElement === d && (e.preventDefault(), f == null || f.focus());
    }
  }
  return E(() => {
    o.value && (s.value = !0, k(() => {
      c.value = !0;
    }));
  }), I(() => {
    var e;
    clearTimeout(y), a || (p(), a = !0), c.value && ((e = r.pop()) == null || e.focus()), r.destroy(), l && (l(), l = null);
  }), {
    isOpen: c,
    rendered: s,
    open: O,
    close: b,
    handleKeydown: L,
    handleMaskClick: W,
    focusDrawer: D,
    /** Current z-index for the overlay mask (context-aware). */
    overlayZIndex: Z(() => T("overlay"))
  };
}
export {
  H as useDrawer
};

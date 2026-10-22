import { G as A, g as G, n as I } from "../chunks/glass-BqY-XLAc.js";
const t = typeof window < "u", i = !t;
function c(e) {
  return t ? window.matchMedia(e) : {
    matches: !1,
    media: e,
    onchange: null,
    addListener: () => {
    },
    removeListener: () => {
    },
    addEventListener: () => {
    },
    removeEventListener: () => {
    },
    dispatchEvent: () => !1
  };
}
function u(e) {
  if (!t) return null;
  try {
    return localStorage.getItem(e);
  } catch {
    return null;
  }
}
function s(e, n) {
  if (t)
    try {
      localStorage.setItem(e, n);
    } catch {
    }
}
function l(e) {
  if (t)
    try {
      localStorage.removeItem(e);
    } catch {
    }
}
function f() {
  return t ? document : void 0;
}
function g() {
  return t ? window : void 0;
}
function m(e) {
  return t ? window.getComputedStyle(e) : {
    getPropertyValue: () => ""
  };
}
function d(e = "nm") {
  return `${e}-${Math.random().toString(36).slice(2, 9)}`;
}
function p(e) {
  return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function S(e) {
  return e.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/[\s-]+/g, "-").replace(/^-+|-+$/g, "");
}
function y(e, n) {
  let r = null;
  const o = (...a) => {
    r && clearTimeout(r), r = setTimeout(() => e(...a), n);
  };
  return o.cancel = () => {
    r && (clearTimeout(r), r = null);
  }, o;
}
function h(e) {
  return e == null ? !0 : typeof e == "string" ? e.trim() === "" : Array.isArray(e) ? e.length === 0 : typeof e == "object" ? Object.keys(e).length === 0 : !1;
}
export {
  A as GLASS_VARIANTS,
  y as debounce,
  p as escapeHtml,
  d as generateId,
  G as glassClassNames,
  t as isBrowser,
  h as isEmpty,
  i as isServer,
  I as normalizeGlass,
  f as safeDocument,
  m as safeGetComputedStyle,
  u as safeLocalStorageGet,
  l as safeLocalStorageRemove,
  s as safeLocalStorageSet,
  c as safeMatchMedia,
  g as safeWindow,
  S as slugify
};

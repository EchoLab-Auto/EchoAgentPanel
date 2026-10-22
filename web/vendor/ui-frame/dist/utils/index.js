import { G as C, g as P, n as T } from "../chunks/glass-BqY-XLAc.js";
import { p as A, a as G, s as I, b as v, c as E, d as M, e as q } from "../chunks/squircle-D5heR-hJ.js";
const t = typeof window < "u", i = !t;
function s(e) {
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
function c(e) {
  if (!t) return null;
  try {
    return localStorage.getItem(e);
  } catch {
    return null;
  }
}
function l(e, n) {
  if (t)
    try {
      localStorage.setItem(e, n);
    } catch {
    }
}
function u(e) {
  if (t)
    try {
      localStorage.removeItem(e);
    } catch {
    }
}
function f() {
  return t ? document : void 0;
}
function p() {
  return t ? window : void 0;
}
function m(e) {
  return t ? window.getComputedStyle(e) : {
    getPropertyValue: () => ""
  };
}
function g(e = "nm") {
  return `${e}-${Math.random().toString(36).slice(2, 9)}`;
}
function d(e) {
  return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function h(e) {
  return e.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/[\s-]+/g, "-").replace(/^-+|-+$/g, "");
}
function S(e, n) {
  let r = null;
  const o = (...a) => {
    r && clearTimeout(r), r = setTimeout(() => e(...a), n);
  };
  return o.cancel = () => {
    r && (clearTimeout(r), r = null);
  }, o;
}
function y(e) {
  return e == null ? !0 : typeof e == "string" ? e.trim() === "" : Array.isArray(e) ? e.length === 0 : typeof e == "object" ? Object.keys(e).length === 0 : !1;
}
export {
  C as GLASS_VARIANTS,
  S as debounce,
  d as escapeHtml,
  g as generateId,
  P as glassClassNames,
  t as isBrowser,
  y as isEmpty,
  i as isServer,
  T as normalizeGlass,
  A as pointsToClipPath,
  G as pointsToPathData,
  f as safeDocument,
  m as safeGetComputedStyle,
  c as safeLocalStorageGet,
  u as safeLocalStorageRemove,
  l as safeLocalStorageSet,
  s as safeMatchMedia,
  p as safeWindow,
  I as sampleCornerOffset,
  h as slugify,
  v as squircleClipPath,
  E as squirclePoints,
  M as squirclePower,
  q as superellipseCorner
};

const t = typeof window < "u", i = !t;
function a(e) {
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
function l(e, n) {
  if (t)
    try {
      localStorage.setItem(e, n);
    } catch {
    }
}
function f(e) {
  if (t)
    try {
      localStorage.removeItem(e);
    } catch {
    }
}
function s() {
  return t ? document : void 0;
}
function d() {
  return t ? window : void 0;
}
function g(e) {
  return t ? window.getComputedStyle(e) : {
    getPropertyValue: () => ""
  };
}
function m(e = "nm") {
  return `${e}-${Math.random().toString(36).slice(2, 9)}`;
}
function p(e) {
  return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function y(e) {
  return e.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/[\s-]+/g, "-").replace(/^-+|-+$/g, "");
}
function h(e, n) {
  let r = null;
  const o = (...c) => {
    r && clearTimeout(r), r = setTimeout(() => e(...c), n);
  };
  return o.cancel = () => {
    r && (clearTimeout(r), r = null);
  }, o;
}
function w(e) {
  return e == null ? !0 : typeof e == "string" ? e.trim() === "" : Array.isArray(e) ? e.length === 0 : typeof e == "object" ? Object.keys(e).length === 0 : !1;
}
export {
  h as debounce,
  p as escapeHtml,
  m as generateId,
  t as isBrowser,
  w as isEmpty,
  i as isServer,
  s as safeDocument,
  g as safeGetComputedStyle,
  u as safeLocalStorageGet,
  f as safeLocalStorageRemove,
  l as safeLocalStorageSet,
  a as safeMatchMedia,
  d as safeWindow,
  y as slugify
};

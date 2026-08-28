import { inject as v, onBeforeUnmount as l, unref as y, provide as k, isRef as S, watch as h, ref as E, computed as m } from "vue";
const p = Symbol("neumorphism-theme"), b = "nm-theme-preference";
function s() {
  return typeof window > "u" ? "light" : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function A(t) {
  if (typeof window > "u") return null;
  try {
    const e = localStorage.getItem(t);
    return e === "light" || e === "dark" || e === "auto" ? e : null;
  } catch {
    return null;
  }
}
function x(t, e) {
  if (!(typeof window > "u"))
    try {
      localStorage.setItem(e, t);
    } catch {
    }
}
function f(t) {
  if (typeof document > "u") return;
  const e = document.documentElement;
  t ? e.setAttribute("data-theme", "dark") : e.removeAttribute("data-theme");
}
function g(t = {}) {
  const { defaultTheme: e = "auto", storageKey: r = b, followSystem: w = !0 } = t, T = A(r), o = E(T || e), c = m(() => o.value === "auto" ? s() : o.value), u = m(() => c.value === "dark");
  h(
    u,
    (n) => {
      f(n);
    },
    { immediate: !0 }
  );
  let a, i;
  w && typeof window < "u" && (a = window.matchMedia("(prefers-color-scheme: dark)"), i = () => {
    o.value === "auto" && f(s() === "dark");
  }, a.addEventListener("change", i));
  const d = (n) => {
    o.value = n, x(n, r);
  };
  return {
    theme: o,
    currentTheme: c,
    isDark: u,
    setTheme: d,
    toggleTheme: () => {
      const n = u.value ? "light" : "dark";
      d(n);
    },
    dispose: () => {
      a && i && a.removeEventListener("change", i);
    }
  };
}
function M(t = {}) {
  const e = g(y(t));
  return k(p, e), S(t) && h(
    () => t.value.defaultTheme,
    (r) => {
      r !== void 0 && e.setTheme(r);
    }
  ), l(() => {
    e.dispose();
  }), e;
}
function L() {
  const t = v(p, null);
  if (!t) {
    const e = g();
    return l(() => {
      e.dispose();
    }), e;
  }
  return t;
}
function R(t = "nm-theme-preference") {
  return `!function(){try{var t=localStorage.getItem('${t}');if(!t)return;if(t==='dark'||(t==='auto'&&window.matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.setAttribute('data-theme','dark')}catch(e){}}()`;
}
export {
  g as createTheme,
  R as getAntiFlickerScript,
  M as provideTheme,
  L as useTheme
};

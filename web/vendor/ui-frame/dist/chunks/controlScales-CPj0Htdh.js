function t(m) {
  return Math.round(m * 10) / 10;
}
function d(m, s) {
  const r = Math.min(2, Math.max(0, s));
  return r <= 1 ? t(m.sm + (m.md - m.sm) * r) : t(m.md + (m.lg - m.md) * (r - 1));
}
function e(m, s) {
  const { sm: r, md: n, lg: a } = m;
  return s <= r ? 0 : s >= a ? 2 : s <= n ? (s - r) / (n - r) : 1 + (s - n) / (a - n);
}
function l(m, s) {
  const r = e(m.primary, s), n = { [m.primaryVar]: `${t(s)}px` };
  for (const [a, i] of Object.entries(m.metrics))
    n[a] = `${d(i, r)}px`;
  return n;
}
function o(m, s) {
  return typeof m != "number" || !Number.isFinite(m) || m <= 0 ? s : m;
}
const p = {
  primary: { sm: 32, md: 44, lg: 56 },
  primaryVar: "--nm-button-sz-height",
  metrics: {
    "--nm-button-sz-font": { sm: 13, md: 14, lg: 16 },
    "--nm-button-sz-pad-y": { sm: 8, md: 12, lg: 16 },
    "--nm-button-sz-pad-x": { sm: 16, md: 24, lg: 32 }
  }
}, c = {
  primary: { sm: 36, md: 48, lg: 60 },
  primaryVar: "--nm-field-sz-height",
  metrics: {
    "--nm-field-sz-font": { sm: 13, md: 14, lg: 16 },
    "--nm-field-sz-pad-y": { sm: 6, md: 10, lg: 14 },
    "--nm-field-sz-pad-x": { sm: 12, md: 16, lg: 20 },
    "--nm-field-sz-affix-x": { sm: 10, md: 14, lg: 16 }
  }
}, z = {
  primary: { sm: 26, md: 32, lg: 38 },
  primaryVar: "--nm-segmented-sz-height",
  metrics: {
    // medium 档不声明 font-size，继承根上的 --nm-font-md = 13
    "--nm-segmented-sz-font": { sm: 12, md: 13, lg: 15 },
    "--nm-segmented-sz-pad-y": { sm: 2, md: 4, lg: 8 },
    "--nm-segmented-sz-pad-x": { sm: 8, md: 16, lg: 24 }
  }
}, y = {
  primary: { sm: 5, md: 6, lg: 8 },
  primaryVar: "--nm-theme-toggle-sz-btn-pad-y",
  metrics: {
    "--nm-theme-toggle-sz-btn-pad-x": { sm: 8, md: 12, lg: 16 },
    "--nm-theme-toggle-sz-pad": { sm: 2, md: 3, lg: 4 },
    "--nm-theme-toggle-sz-icon": { sm: 14, md: 16, lg: 18 },
    "--nm-theme-toggle-sz-font": { sm: 12, md: 12, lg: 14 }
  }
}, E = {
  primary: { sm: 72, md: 100, lg: 140 },
  primaryVar: "--nm-upload-sz-trigger-height",
  metrics: {}
}, f = {
  primary: { sm: 11, md: 12, lg: 14 },
  primaryVar: "--nm-tag-sz-font",
  metrics: {
    "--nm-tag-sz-pad-y": { sm: 2, md: 4, lg: 6 },
    "--nm-tag-sz-pad-x": { sm: 8, md: 12, lg: 16 },
    "--nm-tag-sz-height": { sm: 22, md: 28, lg: 34 }
  }
}, A = {
  primary: { sm: 12, md: 13, lg: 14 },
  primaryVar: "--nm-alert-sz-font",
  metrics: {
    "--nm-alert-sz-title-font": { sm: 13, md: 14, lg: 16 },
    "--nm-alert-sz-pad-y": { sm: 8, md: 12, lg: 16 },
    "--nm-alert-sz-pad-x": { sm: 12, md: 16, lg: 20 }
  }
}, S = {
  primary: { sm: 12, md: 14, lg: 16 },
  primaryVar: "--nm-breadcrumb-sz-font",
  metrics: {}
}, L = {
  primary: { sm: 12, md: 14, lg: 15 },
  primaryVar: "--nm-list-sz-font",
  metrics: {
    "--nm-list-sz-pad-y": { sm: 4, md: 8, lg: 16 },
    "--nm-list-sz-pad-x": { sm: 8, md: 16, lg: 24 }
  }
}, C = {
  primary: { sm: 12, md: 14, lg: 16 },
  primaryVar: "--nm-tabs-sz-font",
  metrics: {
    "--nm-tabs-sz-pad-y": { sm: 6, md: 10, lg: 14 },
    "--nm-tabs-sz-pad-x": { sm: 14, md: 20, lg: 28 }
  }
}, u = {
  primary: { sm: 13, md: 15, lg: 16 },
  primaryVar: "--nm-collapse-sz-font",
  metrics: {
    "--nm-collapse-sz-pad-y": { sm: 12, md: 16, lg: 20 },
    "--nm-collapse-sz-pad-x": { sm: 16, md: 20, lg: 28 }
  }
}, V = {
  primary: { sm: 8, md: 12, lg: 16 },
  primaryVar: "--nm-table-sz-pad-y",
  metrics: {
    "--nm-table-sz-pad-x": { sm: 12, md: 16, lg: 20 },
    "--nm-table-sz-font": { sm: 12, md: 14, lg: 15 }
  }
}, _ = {
  primary: { sm: 30, md: 38, lg: 46 },
  primaryVar: "--nm-pagination-sz-height",
  metrics: {
    "--nm-pagination-sz-min-width": { sm: 30, md: 38, lg: 46 },
    "--nm-pagination-sz-font": { sm: 12, md: 14, lg: 16 }
  }
}, h = {
  primary: { sm: 28, md: 36, lg: 48 },
  primaryVar: "--nm-steps-sz-circle",
  metrics: {
    "--nm-steps-sz-font": { sm: 12, md: 14, lg: 15 }
  }
}, g = {
  primary: { sm: 4, md: 8, lg: 12 },
  primaryVar: "--nm-progress-sz-height",
  metrics: {
    "--nm-progress-sz-circle": { sm: 64, md: 120, lg: 160 },
    "--nm-progress-sz-stroke": { sm: 4, md: 7, lg: 10 }
  }
}, b = {
  primary: { sm: 11, md: 14, lg: 15 },
  primaryVar: "--nm-menu-sz-font",
  metrics: {
    "--nm-menu-sz-pad-x": { sm: 8, md: 16, lg: 24 },
    "--nm-menu-sz-pad-y": { sm: 5, md: 7, lg: 9 },
    "--nm-menu-sz-gap": { sm: 2, md: 4, lg: 8 },
    "--nm-menu-sz-icon": { sm: 14, md: 18, lg: 20 }
  }
}, x = {
  primary: { sm: 11, md: 14, lg: 15 },
  primaryVar: "--nm-nav-sz-font",
  metrics: {
    "--nm-nav-sz-pad-x": { sm: 8, md: 16, lg: 24 },
    "--nm-nav-sz-pad-y": { sm: 6, md: 8, lg: 10 },
    "--nm-nav-sz-gap": { sm: 2, md: 4, lg: 8 },
    "--nm-nav-sz-icon": { sm: 14, md: 18, lg: 20 },
    "--nm-nav-sz-indicator": { sm: 2, md: 2, lg: 3 }
  }
}, T = {
  primary: { sm: 32, md: 44, lg: 64 },
  primaryVar: "--nm-avatar-sz-size",
  metrics: {
    "--nm-avatar-sz-font": { sm: 12, md: 16, lg: 22 }
  }
}, O = {
  primary: { sm: 60, md: 100, lg: 140 },
  primaryVar: "--nm-empty-sz-illustration",
  metrics: {
    "--nm-empty-sz-font": { sm: 12, md: 14, lg: 15 }
  }
}, N = {
  primary: { sm: 18, md: 24, lg: 30 },
  primaryVar: "--nm-checkbox-sz-box",
  metrics: {
    "--nm-checkbox-sz-icon": { sm: 12, md: 14, lg: 16 }
  }
}, M = {
  primary: { sm: 18, md: 24, lg: 30 },
  primaryVar: "--nm-radio-sz-box",
  metrics: {
    "--nm-radio-sz-dot": { sm: 8, md: 12, lg: 16 }
  }
}, R = {
  primary: { sm: 6, md: 8, lg: 10 },
  primaryVar: "--nm-slider-sz-rail",
  metrics: {}
}, B = {
  progress: g
};
export {
  A,
  S as B,
  B as C,
  O as E,
  c as F,
  L,
  b as M,
  x as N,
  _ as P,
  M as R,
  z as S,
  f as T,
  E as U,
  T as a,
  p as b,
  N as c,
  u as d,
  g as e,
  R as f,
  h as g,
  V as h,
  d as i,
  C as j,
  y as k,
  o as n,
  e as p,
  l as r
};

import { ref as u } from "vue";
const a = {
  /** Select / AutoComplete dropdowns, Menu submenus, Chart tooltips */
  dropdown: 100,
  /** Tooltip */
  tooltip: 200,
  /** Popover, Dropdown */
  popover: 300,
  /** Modal mask, Drawer mask */
  overlay: 400,
  /** Toast notification container */
  toast: 500
}, r = 1e3, t = [], n = u(0);
function c() {
  function l(e) {
    const o = a[e];
    return e === "overlay" ? o + Math.max(0, n.value - 1) * r : o + n.value * r;
  }
  function s() {
    const e = Symbol("nm-overlay");
    return t.push(e), n.value = t.length, () => {
      const o = t.indexOf(e);
      o !== -1 && (t.splice(o, 1), n.value = t.length);
    };
  }
  return {
    getZIndex: l,
    registerOverlay: s,
    /** Reactive count of currently-active overlays (read-only for debugging). */
    overlayCount: n
  };
}
export {
  a as Z_LAYERS,
  r as Z_STRIDE,
  c as useZIndex
};

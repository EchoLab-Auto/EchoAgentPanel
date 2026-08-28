import { computed as p } from "vue";
let g = 0;
function D(o) {
  const { modelValue: h, tabs: f } = o, i = o.position, s = `nm-tabs-${++g}`, y = p(() => `${s}-panel`), u = p(() => {
    const e = i == null ? void 0 : i.value;
    return e === "left" || e === "right" ? "vertical" : "horizontal";
  });
  function c(e) {
    const r = f.value.find((t) => t.key === e);
    r != null && r.disabled || (h.value = e);
  }
  function b(e, r) {
    const t = f.value.filter((a) => !a.disabled);
    if (t.length === 0) return;
    const n = t.findIndex((a) => a.key === r);
    let l;
    if (e.key === "Home")
      e.preventDefault(), l = 0;
    else if (e.key === "End")
      e.preventDefault(), l = t.length - 1;
    else if (u.value === "vertical")
      if (e.key === "ArrowDown")
        e.preventDefault(), l = n + 1 < t.length ? n + 1 : 0;
      else if (e.key === "ArrowUp")
        e.preventDefault(), l = n - 1 >= 0 ? n - 1 : t.length - 1;
      else
        return;
    else if (e.key === "ArrowRight")
      e.preventDefault(), l = n + 1 < t.length ? n + 1 : 0;
    else if (e.key === "ArrowLeft")
      e.preventDefault(), l = n - 1 >= 0 ? n - 1 : t.length - 1;
    else
      return;
    const d = t[l];
    d && c(d.key);
  }
  return {
    activate: c,
    handleKeydown: b,
    panelId: y,
    tabListId: s,
    orientation: u
  };
}
export {
  D as useTabs
};

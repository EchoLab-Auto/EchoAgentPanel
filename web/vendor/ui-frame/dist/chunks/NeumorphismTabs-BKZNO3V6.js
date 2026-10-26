import { defineComponent as A, computed as s, ref as B, openBlock as v, createElementBlock as f, normalizeStyle as I, normalizeClass as h, createElementVNode as c, unref as i, Fragment as D, renderList as F, renderSlot as z, toDisplayString as V, createCommentVNode as M, nextTick as P } from "vue";
import { useTabs as R } from "../composables/useTabs.js";
import { useConfig as j } from "../composables/useConfig.js";
import { useLocale as H } from "../composables/useLocale.js";
import { n as U, r as X, j as Z } from "./controlScales-CPj0Htdh.js";
import { _ as q } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismTabs.css';const G = ["aria-orientation", "aria-label"], J = ["id", "aria-selected", "aria-disabled", "aria-controls", "tabindex", "disabled", "onClick", "onKeydown"], O = {
  key: 0,
  class: "nm-tabs__tab-icon",
  "aria-hidden": "true"
}, Q = { class: "nm-tabs__tab-label" }, W = ["id", "aria-labelledby"], Y = 14, ee = /* @__PURE__ */ A({
  __name: "NeumorphismTabs",
  props: {
    modelValue: { default: "" },
    tabs: { default: () => [] },
    position: {},
    size: {},
    navLabel: {}
  },
  emits: ["update:modelValue", "change", "tabClick"],
  setup(n, { emit: S }) {
    const o = n, m = j(), y = s(() => {
      var e;
      return o.position ?? ((e = m.value.tabs) == null ? void 0 : e.position) ?? "top";
    }), u = s(() => {
      var t;
      const e = o.size ?? ((t = m.value.tabs) == null ? void 0 : t.size);
      return typeof e == "number" ? U(e, Y) : void 0;
    }), C = s(() => {
      var t;
      const e = o.size ?? ((t = m.value.tabs) == null ? void 0 : t.size);
      return typeof e == "string" ? e : "medium";
    }), L = s(
      () => u.value === void 0 ? void 0 : X(Z, u.value)
    ), { t: T } = H(), g = s(() => o.navLabel || T("tabsNavLabel")), b = S, _ = s({
      get: () => o.modelValue,
      set: (e) => {
        b("update:modelValue", e), b("change", e);
        const t = o.tabs.find((a) => a.key === e);
        t && b("tabClick", t);
      }
    }), {
      activate: p,
      handleKeydown: $,
      panelId: d,
      orientation: w
    } = R({
      modelValue: _,
      tabs: s(() => o.tabs),
      position: y
    }), N = s(() => o.tabs.filter((e) => !e.disabled)), k = B(/* @__PURE__ */ new Map());
    function E(e, t) {
      t instanceof HTMLElement && k.value.set(e, t);
    }
    function K(e, t) {
      $(e, t);
      const a = N.value.find((l) => l.key === _.value);
      a && P(() => {
        var l;
        return (l = k.value.get(a.key)) == null ? void 0 : l.focus();
      });
    }
    const x = s(() => [
      "nm-tabs",
      `nm-tabs--${y.value}`,
      u.value === void 0 ? `nm-tabs--${C.value}` : "nm-tabs--sized"
    ]);
    return (e, t) => (v(), f("div", {
      class: h(x.value),
      style: I(L.value)
    }, [
      c("div", {
        class: "nm-tabs__nav",
        role: "tablist",
        "aria-orientation": i(w),
        "aria-label": g.value
      }, [
        (v(!0), f(D, null, F(n.tabs, (a, l) => z(e.$slots, "tab", {
          key: a.key,
          tab: a,
          active: n.modelValue === a.key,
          index: l,
          activate: i(p)
        }, () => [
          c("button", {
            id: `${i(d)}-tab-${a.key}`,
            ref_for: !0,
            ref: (r) => E(a.key, r),
            class: h(["nm-tabs__tab", {
              "nm-tabs__tab--active": n.modelValue === a.key,
              "nm-tabs__tab--disabled": a.disabled
            }]),
            role: "tab",
            "aria-selected": n.modelValue === a.key,
            "aria-disabled": a.disabled,
            "aria-controls": i(d),
            tabindex: n.modelValue === a.key ? 0 : -1,
            disabled: a.disabled,
            onClick: (r) => i(p)(a.key),
            onKeydown: (r) => K(r, a.key)
          }, [
            a.icon ? (v(), f("span", O, V(a.icon), 1)) : M("", !0),
            c("span", Q, V(a.label), 1)
          ], 42, J)
        ], !0)), 128))
      ], 8, G),
      c("div", {
        id: i(d),
        class: "nm-tabs__panel",
        role: "tabpanel",
        "aria-labelledby": `${i(d)}-tab-${n.modelValue}`
      }, [
        z(e.$slots, "default", {}, void 0, !0)
      ], 8, W)
    ], 6));
  }
}), le = /* @__PURE__ */ q(ee, [["__scopeId", "data-v-c0cc59c7"]]);
export {
  le as N
};

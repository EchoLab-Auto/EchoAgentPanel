import { defineComponent as x, computed as l, ref as E, openBlock as k, createElementBlock as p, normalizeClass as _, createElementVNode as r, unref as n, Fragment as S, renderList as B, renderSlot as h, toDisplayString as I, nextTick as M } from "vue";
import { useTabs as R } from "../composables/useTabs.js";
import { useConfig as D } from "../composables/useConfig.js";
import { useLocale as F } from "../composables/useLocale.js";
import { _ as H } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismTabs.css';const P = ["aria-orientation", "aria-label"], j = ["id", "aria-selected", "aria-disabled", "aria-controls", "tabindex", "disabled", "onClick", "onKeydown"], q = { class: "nm-tabs__tab-label" }, A = ["id", "aria-labelledby"], G = /* @__PURE__ */ x({
  __name: "NeumorphismTabs",
  props: {
    modelValue: { default: "" },
    tabs: { default: () => [] },
    position: {},
    size: {},
    navLabel: {}
  },
  emits: ["update:modelValue", "change", "tabClick"],
  setup(s, { emit: V }) {
    const o = s, m = D(), u = l(() => {
      var a;
      return o.position ?? ((a = m.value.tabs) == null ? void 0 : a.position) ?? "top";
    }), $ = l(() => {
      var a;
      return o.size ?? ((a = m.value.tabs) == null ? void 0 : a.size) ?? "medium";
    }), { t: g } = F(), L = l(() => o.navLabel || g("tabsNavLabel")), b = V, f = l({
      get: () => o.modelValue,
      set: (a) => {
        b("update:modelValue", a), b("change", a);
        const t = o.tabs.find((e) => e.key === a);
        t && b("tabClick", t);
      }
    }), {
      activate: v,
      handleKeydown: T,
      panelId: d,
      orientation: C
    } = R({
      modelValue: f,
      tabs: l(() => o.tabs),
      position: u
    }), w = l(() => o.tabs.filter((a) => !a.disabled)), y = E(/* @__PURE__ */ new Map());
    function K(a, t) {
      t instanceof HTMLElement && y.value.set(a, t);
    }
    function N(a, t) {
      T(a, t);
      const e = w.value.find((i) => i.key === f.value);
      e && M(() => {
        var i;
        return (i = y.value.get(e.key)) == null ? void 0 : i.focus();
      });
    }
    const z = l(() => [
      "nm-tabs",
      `nm-tabs--${u.value}`,
      `nm-tabs--${$.value}`
    ]);
    return (a, t) => (k(), p("div", {
      class: _(z.value)
    }, [
      r("div", {
        class: "nm-tabs__nav",
        role: "tablist",
        "aria-orientation": n(C),
        "aria-label": L.value
      }, [
        (k(!0), p(S, null, B(s.tabs, (e, i) => h(a.$slots, "tab", {
          key: e.key,
          tab: e,
          active: s.modelValue === e.key,
          index: i,
          activate: n(v)
        }, () => [
          r("button", {
            id: `${n(d)}-tab-${e.key}`,
            ref_for: !0,
            ref: (c) => K(e.key, c),
            class: _(["nm-tabs__tab", {
              "nm-tabs__tab--active": s.modelValue === e.key,
              "nm-tabs__tab--disabled": e.disabled
            }]),
            role: "tab",
            "aria-selected": s.modelValue === e.key,
            "aria-disabled": e.disabled,
            "aria-controls": n(d),
            tabindex: s.modelValue === e.key ? 0 : -1,
            disabled: e.disabled,
            onClick: (c) => n(v)(e.key),
            onKeydown: (c) => N(c, e.key)
          }, [
            r("span", q, I(e.label), 1)
          ], 42, j)
        ], !0)), 128))
      ], 8, P),
      r("div", {
        id: n(d),
        class: "nm-tabs__panel",
        role: "tabpanel",
        "aria-labelledby": `${n(d)}-tab-${s.modelValue}`
      }, [
        h(a.$slots, "default", {}, void 0, !0)
      ], 8, A)
    ], 2));
  }
}), X = /* @__PURE__ */ H(G, [["__scopeId", "data-v-ecbd74f2"]]);
export {
  X as N
};

import { defineComponent as E, computed as n, ref as S, openBlock as b, createElementBlock as u, normalizeClass as p, createElementVNode as r, unref as i, Fragment as B, renderList as I, renderSlot as h, toDisplayString as V, createCommentVNode as M, nextTick as R } from "vue";
import { useTabs as D } from "../composables/useTabs.js";
import { useConfig as F } from "../composables/useConfig.js";
import { useLocale as H } from "../composables/useLocale.js";
import { _ as P } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismTabs.css';const j = ["aria-orientation", "aria-label"], q = ["id", "aria-selected", "aria-disabled", "aria-controls", "tabindex", "disabled", "onClick", "onKeydown"], A = {
  key: 0,
  class: "nm-tabs__tab-icon",
  "aria-hidden": "true"
}, G = { class: "nm-tabs__tab-label" }, J = ["id", "aria-labelledby"], O = /* @__PURE__ */ E({
  __name: "NeumorphismTabs",
  props: {
    modelValue: { default: "" },
    tabs: { default: () => [] },
    position: {},
    size: {},
    navLabel: {}
  },
  emits: ["update:modelValue", "change", "tabClick"],
  setup(s, { emit: $ }) {
    const o = s, f = F(), v = n(() => {
      var a;
      return o.position ?? ((a = f.value.tabs) == null ? void 0 : a.position) ?? "top";
    }), g = n(() => {
      var a;
      return o.size ?? ((a = f.value.tabs) == null ? void 0 : a.size) ?? "medium";
    }), { t: C } = H(), L = n(() => o.navLabel || C("tabsNavLabel")), m = $, y = n({
      get: () => o.modelValue,
      set: (a) => {
        m("update:modelValue", a), m("change", a);
        const t = o.tabs.find((e) => e.key === a);
        t && m("tabClick", t);
      }
    }), {
      activate: _,
      handleKeydown: T,
      panelId: d,
      orientation: N
    } = D({
      modelValue: y,
      tabs: n(() => o.tabs),
      position: v
    }), w = n(() => o.tabs.filter((a) => !a.disabled)), k = S(/* @__PURE__ */ new Map());
    function K(a, t) {
      t instanceof HTMLElement && k.value.set(a, t);
    }
    function z(a, t) {
      T(a, t);
      const e = w.value.find((l) => l.key === y.value);
      e && R(() => {
        var l;
        return (l = k.value.get(e.key)) == null ? void 0 : l.focus();
      });
    }
    const x = n(() => [
      "nm-tabs",
      `nm-tabs--${v.value}`,
      `nm-tabs--${g.value}`
    ]);
    return (a, t) => (b(), u("div", {
      class: p(x.value)
    }, [
      r("div", {
        class: "nm-tabs__nav",
        role: "tablist",
        "aria-orientation": i(N),
        "aria-label": L.value
      }, [
        (b(!0), u(B, null, I(s.tabs, (e, l) => h(a.$slots, "tab", {
          key: e.key,
          tab: e,
          active: s.modelValue === e.key,
          index: l,
          activate: i(_)
        }, () => [
          r("button", {
            id: `${i(d)}-tab-${e.key}`,
            ref_for: !0,
            ref: (c) => K(e.key, c),
            class: p(["nm-tabs__tab", {
              "nm-tabs__tab--active": s.modelValue === e.key,
              "nm-tabs__tab--disabled": e.disabled
            }]),
            role: "tab",
            "aria-selected": s.modelValue === e.key,
            "aria-disabled": e.disabled,
            "aria-controls": i(d),
            tabindex: s.modelValue === e.key ? 0 : -1,
            disabled: e.disabled,
            onClick: (c) => i(_)(e.key),
            onKeydown: (c) => z(c, e.key)
          }, [
            e.icon ? (b(), u("span", A, V(e.icon), 1)) : M("", !0),
            r("span", G, V(e.label), 1)
          ], 42, q)
        ], !0)), 128))
      ], 8, j),
      r("div", {
        id: i(d),
        class: "nm-tabs__panel",
        role: "tabpanel",
        "aria-labelledby": `${i(d)}-tab-${s.modelValue}`
      }, [
        h(a.$slots, "default", {}, void 0, !0)
      ], 8, J)
    ], 2));
  }
}), Z = /* @__PURE__ */ P(O, [["__scopeId", "data-v-75fb0454"]]);
export {
  Z as N
};

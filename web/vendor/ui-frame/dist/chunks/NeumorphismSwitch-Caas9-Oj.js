import { defineComponent as k, computed as l, openBlock as o, createElementBlock as n, normalizeClass as C, unref as g, toDisplayString as d, createCommentVNode as m, createElementVNode as i, normalizeStyle as x, renderSlot as y } from "vue";
import { useConfig as T } from "../composables/useConfig.js";
import { useCheckable as z } from "../composables/useCheckable.js";
import { useLocale as S } from "../composables/useLocale.js";
import { _ as V } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismSwitch.css';const N = {
  key: 0,
  class: "nm-switch__label nm-switch__label--inactive"
}, B = { class: "nm-switch__wrapper" }, L = ["checked", "disabled", "aria-checked", "aria-label"], D = { class: "nm-switch__thumb" }, E = {
  key: 1,
  class: "nm-switch__label nm-switch__label--active"
}, j = /* @__PURE__ */ k({
  __name: "NeumorphismSwitch",
  props: {
    modelValue: { type: Boolean, default: !1 },
    disabled: { type: Boolean, default: !1 },
    activeText: {},
    inactiveText: {},
    activeColor: {},
    inactiveColor: {},
    size: {}
  },
  emits: ["update:modelValue", "change"],
  setup(a, { emit: h }) {
    const t = a, u = T(), { t: v } = S(), _ = l(() => {
      var e;
      return t.size ?? ((e = u.value.switch) == null ? void 0 : e.size) ?? "medium";
    }), p = l(
      () => t.activeText || t.inactiveText || v("switchToggle")
    ), r = h, s = l({
      get: () => t.modelValue,
      set: (e) => {
        r("update:modelValue", e), r("change", e);
      }
    }), b = z(() => ({
      prefix: "switch",
      isChecked: s.value,
      isDisabled: t.disabled,
      size: _.value
    })).classList, f = l(() => {
      const e = {};
      return t.activeColor && (e["--nm-switch-active-color"] = t.activeColor), t.inactiveColor && (e["--nm-switch-inactive-color"] = t.inactiveColor), Object.keys(e).length ? e : void 0;
    });
    function w(e) {
      const c = e.target;
      s.value = c.checked;
    }
    return (e, c) => (o(), n("label", {
      class: C(g(b))
    }, [
      a.inactiveText ? (o(), n("span", N, d(a.inactiveText), 1)) : m("", !0),
      i("span", B, [
        i("input", {
          type: "checkbox",
          role: "switch",
          class: "nm-switch__input",
          checked: s.value,
          disabled: a.disabled,
          "aria-checked": s.value,
          "aria-label": p.value,
          onChange: w
        }, null, 40, L),
        i("span", {
          class: "nm-switch__track",
          "aria-hidden": "true",
          style: x(f.value)
        }, [
          i("span", D, [
            y(e.$slots, "thumb", { checked: s.value }, () => [
              c[0] || (c[0] = i("span", { class: "nm-switch__thumb-dot" }, null, -1))
            ], !0)
          ])
        ], 4)
      ]),
      a.activeText ? (o(), n("span", E, d(a.activeText), 1)) : m("", !0)
    ], 2));
  }
}), F = /* @__PURE__ */ V(j, [["__scopeId", "data-v-bd26bde8"]]);
export {
  F as N
};

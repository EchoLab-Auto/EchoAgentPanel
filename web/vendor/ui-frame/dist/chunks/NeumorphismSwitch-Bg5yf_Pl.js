import { defineComponent as H, computed as c, ref as L, watch as N, openBlock as n, createElementBlock as l, normalizeStyle as _, normalizeClass as D, unref as A, Fragment as g, createElementVNode as o, toDisplayString as r, createCommentVNode as h, createStaticVNode as B, renderSlot as I } from "vue";
import { useConfig as G } from "../composables/useConfig.js";
import { useCheckable as O } from "../composables/useCheckable.js";
import { useLocale as P } from "../composables/useLocale.js";
import { _ as $ } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismSwitch.css';const F = ["checked", "disabled", "aria-checked", "aria-label"], M = {
  key: 0,
  class: "nm-switch__state nm-switch__state--off",
  "aria-hidden": "true"
}, j = {
  key: 1,
  class: "nm-switch__state nm-switch__state--on",
  "aria-hidden": "true"
}, R = {
  key: 0,
  class: "nm-switch__label nm-switch__label--inactive"
}, U = { class: "nm-switch__wrapper" }, X = ["checked", "disabled", "aria-checked", "aria-label"], Y = { class: "nm-switch__thumb" }, Z = {
  key: 1,
  class: "nm-switch__label nm-switch__label--active"
}, q = 36, J = /* @__PURE__ */ H({
  __name: "NeumorphismSwitch",
  props: {
    modelValue: { type: Boolean, default: !1 },
    disabled: { type: Boolean, default: !1 },
    activeText: {},
    inactiveText: {},
    activeColor: {},
    inactiveColor: {},
    size: {},
    variant: {}
  },
  emits: ["update:modelValue", "change"],
  setup(a, { emit: y }) {
    const t = a, b = G(), { t: T } = P(), u = c(() => {
      var e;
      return t.variant ?? ((e = b.value.switch) == null ? void 0 : e.variant) ?? "default";
    }), d = c(() => u.value === "power"), w = c(
      () => t.activeText || t.inactiveText || T("switchToggle")
    ), p = { default: 30, power: 91 }, V = { small: 24, medium: 30, large: 36 }, m = c(() => {
      var C;
      const e = t.size ?? ((C = b.value.switch) == null ? void 0 : C.size) ?? p[u.value], s = typeof e == "number" ? e : V[e] ?? p[u.value];
      return Math.max(8, s);
    }), f = y, i = c({
      get: () => t.modelValue,
      set: (e) => {
        f("update:modelValue", e), f("change", e);
      }
    }), v = L(null);
    N(
      () => t.modelValue,
      (e) => {
        v.value = e ? "on" : "off";
      }
    );
    const S = c(
      () => d.value && m.value < q
    ), E = O(() => ({
      prefix: "switch",
      isChecked: i.value,
      isDisabled: t.disabled,
      extraClasses: {
        "nm-switch--power": d.value,
        "nm-switch--compact": S.value,
        "nm-switch--flash-on": d.value && v.value === "on",
        "nm-switch--flash-off": d.value && v.value === "off"
      }
    })).classList, k = c(() => {
      const e = {};
      return t.activeColor && (e["--nm-switch-active-color"] = t.activeColor), t.inactiveColor && (e["--nm-switch-inactive-color"] = t.inactiveColor), Object.keys(e).length ? e : void 0;
    }), z = c(
      () => d.value ? { "--nm-switch-power-u": `${m.value / 91}px` } : { "--nm-switch-height": `${m.value}px` }
    );
    function x(e) {
      const s = e.target;
      i.value = s.checked;
    }
    return (e, s) => (n(), l("label", {
      class: D(A(E)),
      style: _(z.value)
    }, [
      d.value ? (n(), l(g, { key: 0 }, [
        o("input", {
          type: "checkbox",
          role: "switch",
          class: "nm-switch__input",
          checked: i.value,
          disabled: a.disabled,
          "aria-checked": i.value,
          "aria-label": w.value,
          onChange: x
        }, null, 40, F),
        a.inactiveText ? (n(), l("span", M, r(a.inactiveText), 1)) : h("", !0),
        o("span", {
          class: "nm-switch__shell",
          style: _(k.value)
        }, [...s[0] || (s[0] = [
          B('<span class="nm-switch__well" data-v-b5bc51d0><span class="nm-switch__face" aria-hidden="true" data-v-b5bc51d0></span><span class="nm-switch__dot" aria-hidden="true" data-v-b5bc51d0><span data-v-b5bc51d0></span></span><span class="nm-switch__bar" aria-hidden="true" data-v-b5bc51d0></span><span class="nm-switch__knob" aria-hidden="true" data-v-b5bc51d0><span class="nm-switch__knob-texture" data-v-b5bc51d0></span></span></span>', 1)
        ])], 4),
        a.activeText ? (n(), l("span", j, r(a.activeText), 1)) : h("", !0)
      ], 64)) : (n(), l(g, { key: 1 }, [
        a.inactiveText ? (n(), l("span", R, r(a.inactiveText), 1)) : h("", !0),
        o("span", U, [
          o("input", {
            type: "checkbox",
            role: "switch",
            class: "nm-switch__input",
            checked: i.value,
            disabled: a.disabled,
            "aria-checked": i.value,
            "aria-label": w.value,
            onChange: x
          }, null, 40, X),
          o("span", {
            class: "nm-switch__track",
            "aria-hidden": "true",
            style: _(k.value)
          }, [
            o("span", Y, [
              I(e.$slots, "thumb", { checked: i.value }, () => [
                s[1] || (s[1] = o("span", { class: "nm-switch__thumb-dot" }, null, -1))
              ], !0)
            ])
          ], 4)
        ]),
        a.activeText ? (n(), l("span", Z, r(a.activeText), 1)) : h("", !0)
      ], 64))
    ], 6));
  }
}), te = /* @__PURE__ */ $(J, [["__scopeId", "data-v-b5bc51d0"]]);
export {
  te as N
};

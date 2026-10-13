import { defineComponent as w, computed as n, toRef as N, ref as R, watch as A, nextTick as B, openBlock as l, createElementBlock as i, unref as s, normalizeClass as _, Fragment as D, renderList as I, toDisplayString as E } from "vue";
import { useLocale as F } from "../composables/useLocale.js";
import { u as K } from "./createComponent-jnXBYqCm.js";
import { useSegmented as $ } from "../composables/useSegmented.js";
import { _ as q } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismSegmented.css';const P = ["aria-label"], T = ["aria-checked", "disabled", "tabindex", "onClick"], j = /* @__PURE__ */ w({
  __name: "NeumorphismSegmented",
  props: {
    modelValue: { default: void 0 },
    options: {},
    size: { default: void 0 },
    disabled: { type: Boolean, default: void 0 },
    ariaLabel: { default: "" }
  },
  emits: ["update:modelValue", "change"],
  setup(m, { emit: h }) {
    const o = m, r = h, { t: k } = F(), { config: c, resolveProp: u } = K(), y = n(() => {
      var e;
      return u(o.size, (e = c.value.segmented) == null ? void 0 : e.size, "medium");
    }), f = n(
      () => {
        var e;
        return u(o.disabled, (e = c.value.segmented) == null ? void 0 : e.disabled, !1);
      }
    ), x = n(() => o.ariaLabel || k("segmentedLabel")), L = n({
      get: () => o.modelValue,
      set: (e) => {
        e !== void 0 && r("update:modelValue", e);
      }
    }), { isActive: p, isItemDisabled: g, select: S, focusIndex: z, tabindexFor: C, handleKeydown: b } = $({
      modelValue: L,
      options: N(o, "options"),
      disabled: f,
      onChange: (e) => r("change", e)
    }), v = R(null);
    A(z, async (e) => {
      var d;
      await B();
      const a = v.value;
      if (!a || !a.contains(document.activeElement)) return;
      (d = a.querySelectorAll(".nm-segmented__item")[e]) == null || d.focus();
    });
    const V = n(() => [
      "nm-segmented",
      `nm-segmented--${y.value}`,
      { "nm-segmented--disabled": f.value }
    ]);
    return (e, a) => (l(), i("div", {
      ref_key: "groupRef",
      ref: v,
      class: _(V.value),
      role: "radiogroup",
      "aria-label": x.value,
      onKeydown: a[0] || (a[0] = //@ts-ignore
      (...t) => s(b) && s(b)(...t))
    }, [
      (l(!0), i(D, null, I(m.options, (t, d) => (l(), i("button", {
        key: t.value,
        type: "button",
        class: _(["nm-segmented__item", {
          "nm-segmented__item--active": s(p)(t),
          "nm-segmented__item--disabled": s(g)(t)
        }]),
        role: "radio",
        "aria-checked": s(p)(t),
        disabled: s(g)(t),
        tabindex: s(C)(d),
        onClick: (G) => s(S)(t)
      }, E(t.label), 11, T))), 128))
    ], 42, P));
  }
}), U = /* @__PURE__ */ q(j, [["__scopeId", "data-v-5158a05d"]]);
export {
  U as N
};

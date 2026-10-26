import { defineComponent as D, computed as s, toRef as R, ref as B, watch as I, nextTick as F, openBlock as m, createElementBlock as r, unref as a, normalizeStyle as K, normalizeClass as y, Fragment as T, renderList as $, toDisplayString as q } from "vue";
import { useLocale as G } from "../composables/useLocale.js";
import { u as M } from "./createComponent-jnXBYqCm.js";
import { useSegmented as P } from "../composables/useSegmented.js";
import { n as j, r as H, S as z } from "./controlScales-CPj0Htdh.js";
import { _ as J } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismSegmented.css';const O = ["aria-label"], Q = ["aria-checked", "disabled", "tabindex", "onClick"], U = /* @__PURE__ */ D({
  __name: "NeumorphismSegmented",
  props: {
    modelValue: { default: void 0 },
    options: {},
    size: { default: void 0 },
    disabled: { type: Boolean, default: void 0 },
    ariaLabel: { default: "" }
  },
  emits: ["update:modelValue", "change"],
  setup(u, { emit: h }) {
    const n = u, c = h, { t: k } = G(), { config: v, resolveProp: f } = M(), l = s(
      () => {
        var e;
        return f(n.size, (e = v.value.segmented) == null ? void 0 : e.size, "medium");
      }
    ), d = s(
      () => typeof l.value == "number" ? j(l.value, z.primary.md) : void 0
    ), x = s(
      () => typeof l.value == "string" ? l.value : "medium"
    ), L = s(
      () => d.value === void 0 ? void 0 : H(z, d.value)
    ), p = s(
      () => {
        var e;
        return f(n.disabled, (e = v.value.segmented) == null ? void 0 : e.disabled, !1);
      }
    ), C = s(() => n.ariaLabel || k("segmentedLabel")), E = s({
      get: () => n.modelValue,
      set: (e) => {
        e !== void 0 && c("update:modelValue", e);
      }
    }), { isActive: g, isItemDisabled: b, select: N, focusIndex: w, tabindexFor: V, handleKeydown: _ } = P({
      modelValue: E,
      options: R(n, "options"),
      disabled: p,
      onChange: (e) => c("change", e)
    }), S = B(null);
    I(w, async (e) => {
      var i;
      await F();
      const o = S.value;
      if (!o || !o.contains(document.activeElement)) return;
      (i = o.querySelectorAll(".nm-segmented__item")[e]) == null || i.focus();
    });
    const A = s(() => [
      "nm-segmented",
      // 数字与档位类互斥：几何全由内联 `--nm-segmented-sz-*` 决定
      d.value === void 0 ? `nm-segmented--${x.value}` : "nm-segmented--sized",
      { "nm-segmented--disabled": p.value }
    ]);
    return (e, o) => (m(), r("div", {
      ref_key: "groupRef",
      ref: S,
      class: y(A.value),
      style: K(L.value),
      role: "radiogroup",
      "aria-label": C.value,
      onKeydown: o[0] || (o[0] = //@ts-ignore
      (...t) => a(_) && a(_)(...t))
    }, [
      (m(!0), r(T, null, $(u.options, (t, i) => (m(), r("button", {
        key: t.value,
        type: "button",
        class: y(["nm-segmented__item", {
          "nm-segmented__item--active": a(g)(t),
          "nm-segmented__item--disabled": a(b)(t)
        }]),
        role: "radio",
        "aria-checked": a(g)(t),
        disabled: a(b)(t),
        tabindex: a(V)(i),
        onClick: (W) => a(N)(t)
      }, q(t.label), 11, Q))), 128))
    ], 46, O));
  }
}), ae = /* @__PURE__ */ J(U, [["__scopeId", "data-v-ff07fb0a"]]);
export {
  ae as N
};

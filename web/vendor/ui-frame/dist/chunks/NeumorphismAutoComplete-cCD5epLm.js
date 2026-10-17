import { defineComponent as se, computed as t, ref as R, watch as $, nextTick as L, onBeforeUnmount as ue, openBlock as a, createElementBlock as u, normalizeClass as _, createVNode as p, unref as i, withCtx as A, createElementVNode as z, withModifiers as h, createCommentVNode as g, createBlock as de, Teleport as ce, Transition as re, normalizeStyle as me, Fragment as pe, renderList as fe, toDisplayString as ve } from "vue";
import { useAutoComplete as be } from "../composables/useAutoComplete.js";
import _e from "../composables/useFloatingPosition.js";
import { u as he } from "./createComponent-jnXBYqCm.js";
import { useZIndex as ge } from "../composables/useZIndex.js";
import { N as we } from "./NeumorphismInput-COGouhbp.js";
import { N as w } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as ye } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismAutoComplete.css';const xe = { class: "nm-autocomplete__suffix" }, ke = {
  key: 1,
  class: "nm-autocomplete__spinner",
  "aria-hidden": "true"
}, Ce = ["aria-selected", "aria-disabled", "onClick"], ze = ["innerHTML"], Ie = {
  key: 1,
  class: "nm-autocomplete__empty"
}, Ne = {
  key: 2,
  class: "nm-autocomplete__loading"
}, Ve = /* @__PURE__ */ se({
  __name: "NeumorphismAutoComplete",
  props: {
    modelValue: { default: void 0 },
    options: { default: () => [] },
    placeholder: { default: "" },
    disabled: { type: Boolean, default: !1 },
    size: { default: void 0 },
    clearable: { type: Boolean, default: void 0 },
    loading: { type: Boolean, default: !1 },
    label: {},
    debounce: { default: 300 },
    searchFn: {}
  },
  emits: ["update:modelValue", "select", "search", "focus", "blur"],
  setup(v, { emit: H }) {
    const l = v, d = H, { config: I, resolveProp: N } = he(), V = t(
      () => {
        var e;
        return N(l.size, (e = I.value.autoComplete) == null ? void 0 : e.size, "medium");
      }
    ), P = t(
      () => {
        var e;
        return N(l.clearable, (e = I.value.autoComplete) == null ? void 0 : e.clearable, !0);
      }
    ), T = t({
      get: () => l.modelValue,
      set: (e) => {
        d("update:modelValue", e);
      }
    }), y = t(() => l.loading), {
      inputValue: r,
      isOpen: s,
      filteredOptions: S,
      activeIndex: b,
      highlightMatch: K,
      selectOption: D,
      handleKeydown: U,
      handleInput: Z,
      open: q,
      close: x,
      cleanupTimers: j
    } = be({
      modelValue: T,
      options: t(() => l.options),
      searchFn: l.searchFn,
      loading: y,
      debounceMs: l.debounce
    }), k = R(), c = R(), {
      actualPlacement: B,
      rect: G,
      available: J,
      stop: Q
    } = _e({
      trigger: k,
      open: s,
      placement: t(() => "bottom"),
      offset: t(() => 4),
      floating: c,
      candidates: ["bottom", "top"]
    });
    function F(e) {
      var n, f;
      if (!s.value || l.disabled) return;
      const o = e.target;
      (n = k.value) != null && n.contains(o) || (f = c.value) != null && f.contains(o) || x();
    }
    function W() {
      typeof document < "u" && document.addEventListener("click", F, !0);
    }
    function M() {
      typeof document < "u" && document.removeEventListener("click", F, !0);
    }
    $(s, (e) => {
      e ? L(W) : M();
    }), ue(() => {
      m && clearTimeout(m), Q(), M(), j();
    }), $(b, (e) => {
      !c.value || e < 0 || L(() => {
        var n;
        const o = (n = c.value) == null ? void 0 : n.querySelector(
          ".nm-autocomplete__option--active"
        );
        o && o.scrollIntoView({ block: "nearest" });
      });
    });
    const { getZIndex: X } = ge(), Y = t(() => {
      const e = G.value, o = Math.max(J.value, 72);
      return {
        position: "fixed",
        top: B.value === "bottom" ? `${((e == null ? void 0 : e.bottom) ?? 0) + 4}px` : void 0,
        bottom: B.value === "top" ? `${typeof window < "u" ? window.innerHeight - ((e == null ? void 0 : e.top) ?? 0) + 4 : 0}px` : void 0,
        left: `${(e == null ? void 0 : e.left) ?? 0}px`,
        width: `${(e == null ? void 0 : e.width) ?? 0}px`,
        // 视口空间受限时收缩高度（默认上限 240px，与 SCSS 一致）
        maxHeight: `min(240px, ${o}px)`,
        zIndex: X("dropdown")
      };
    });
    function ee(e) {
      D(e), d("select", e);
    }
    function oe(e) {
      U(e);
    }
    function te(e) {
      d("focus", e), !s.value && r.value.length > 0 && q();
    }
    let m = null;
    function ne(e) {
      m && clearTimeout(m), m = setTimeout(() => {
        m = null, !(c.value && document.activeElement && c.value.contains(document.activeElement)) && (d("blur", e), x());
      }, 150);
    }
    function le() {
      r.value = "", T.value = void 0, b.value = -1, d("update:modelValue", void 0), d("search", ""), x();
    }
    function ae(e) {
      d("search", e), Z(e);
    }
    const ie = t(() => [
      "nm-autocomplete",
      `nm-autocomplete--${V.value}`,
      {
        "nm-autocomplete--disabled": l.disabled,
        "nm-autocomplete--open": s.value,
        "nm-autocomplete--has-value": r.value.length > 0
      }
    ]), E = t(() => S.value.length > 0), O = t(
      () => !E.value && r.value.trim().length > 0 && !y.value
    ), C = t(() => y.value);
    return (e, o) => (a(), u("div", {
      ref_key: "triggerRef",
      ref: k,
      class: _(ie.value)
    }, [
      p(we, {
        "model-value": i(r),
        label: v.label,
        placeholder: v.placeholder,
        disabled: v.disabled,
        size: V.value,
        autocomplete: "off",
        role: "combobox",
        "aria-expanded": i(s),
        "aria-haspopup": "listbox",
        "aria-autocomplete": "list",
        "onUpdate:modelValue": ae,
        onFocus: te,
        onBlur: ne,
        onKeydown: oe
      }, {
        suffix: A(() => [
          z("div", xe, [
            P.value && i(r).length > 0 && !C.value ? (a(), u("button", {
              key: 0,
              class: "nm-autocomplete__clear",
              type: "button",
              "aria-label": "Clear",
              onMousedown: o[0] || (o[0] = h(() => {
              }, ["prevent"])),
              onClick: h(le, ["stop"])
            }, [
              p(w, {
                name: "close",
                size: "sm"
              })
            ], 32)) : g("", !0),
            C.value ? (a(), u("span", ke, [
              p(w, {
                name: "spinner",
                size: "sm",
                spin: ""
              })
            ])) : g("", !0),
            p(w, {
              name: "chevron-down",
              size: "md",
              class: _(["nm-autocomplete__arrow", { "nm-autocomplete__arrow--open": i(s) }])
            }, null, 8, ["class"])
          ])
        ]),
        _: 1
      }, 8, ["model-value", "label", "placeholder", "disabled", "size", "aria-expanded"]),
      (a(), de(ce, { to: "body" }, [
        p(re, { name: "nm-autocomplete-dropdown" }, {
          default: A(() => [
            i(s) ? (a(), u("div", {
              key: 0,
              ref_key: "dropdownRef",
              ref: c,
              class: _(["nm-autocomplete__dropdown", { "nm-autocomplete__dropdown--empty": O.value }]),
              role: "listbox",
              style: me(Y.value)
            }, [
              E.value ? (a(!0), u(pe, { key: 0 }, fe(i(S), (n, f) => (a(), u("div", {
                key: n.value,
                class: _(["nm-autocomplete__option", {
                  "nm-autocomplete__option--active": f === i(b),
                  "nm-autocomplete__option--disabled": n.disabled
                }]),
                role: "option",
                "aria-selected": f === i(b),
                "aria-disabled": n.disabled,
                onMousedown: o[1] || (o[1] = h(() => {
                }, ["prevent"])),
                onClick: h((Te) => ee(n), ["stop"])
              }, [
                z("span", {
                  class: "nm-autocomplete__option-label",
                  innerHTML: i(K)(n.label)
                }, null, 8, ze)
              ], 42, Ce))), 128)) : O.value ? (a(), u("div", Ie, ve("No matching results"))) : C.value ? (a(), u("div", Ne, [
                p(w, {
                  name: "spinner",
                  size: "md",
                  spin: "",
                  class: "nm-autocomplete__loading-icon"
                }),
                o[2] || (o[2] = z("span", null, "Searching…", -1))
              ])) : g("", !0)
            ], 6)) : g("", !0)
          ]),
          _: 1
        })
      ]))
    ], 2));
  }
}), Le = /* @__PURE__ */ ye(Ve, [["__scopeId", "data-v-8591dac7"]]);
export {
  Le as N
};

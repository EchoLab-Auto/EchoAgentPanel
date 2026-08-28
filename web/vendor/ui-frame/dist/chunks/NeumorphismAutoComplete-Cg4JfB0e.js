import { defineComponent as ie, computed as o, ref as E, watch as L, nextTick as O, onBeforeUnmount as ue, openBlock as n, createElementBlock as u, normalizeClass as b, createVNode as R, unref as s, withCtx as $, createElementVNode as a, withModifiers as g, createCommentVNode as w, createBlock as se, Teleport as re, Transition as de, normalizeStyle as ce, Fragment as me, renderList as pe, toDisplayString as fe } from "vue";
import { useAutoComplete as ve } from "../composables/useAutoComplete.js";
import he from "../composables/useFloatingPosition.js";
import { u as be } from "./createComponent-jnXBYqCm.js";
import { useZIndex as ge } from "../composables/useZIndex.js";
import { N as we } from "./NeumorphismInput-BlgrjPEH.js";
import { _ as _e } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismAutoComplete.css';const ke = { class: "nm-autocomplete__suffix" }, xe = {
  key: 1,
  class: "nm-autocomplete__spinner",
  "aria-hidden": "true"
}, ye = ["aria-selected", "aria-disabled", "onClick"], Ce = ["innerHTML"], Be = {
  key: 1,
  class: "nm-autocomplete__empty"
}, Me = {
  key: 2,
  class: "nm-autocomplete__loading"
}, Ve = /* @__PURE__ */ ie({
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
  setup(v, { emit: A }) {
    const i = v, d = A, { config: C, resolveProp: B } = be(), M = o(
      () => {
        var e;
        return B(i.size, (e = C.value.autoComplete) == null ? void 0 : e.size, "medium");
      }
    ), H = o(
      () => {
        var e;
        return B(i.clearable, (e = C.value.autoComplete) == null ? void 0 : e.clearable, !0);
      }
    ), V = o({
      get: () => i.modelValue,
      set: (e) => {
        d("update:modelValue", e);
      }
    }), _ = o(() => i.loading), {
      inputValue: m,
      isOpen: r,
      filteredOptions: I,
      activeIndex: h,
      highlightMatch: P,
      selectOption: K,
      handleKeydown: D,
      handleInput: U,
      open: Z,
      close: k,
      cleanupTimers: q
    } = ve({
      modelValue: V,
      options: o(() => i.options),
      searchFn: i.searchFn,
      loading: _,
      debounceMs: i.debounce
    }), x = E(), c = E(), {
      actualPlacement: T,
      rect: j,
      available: G,
      stop: J
    } = he({
      trigger: x,
      open: r,
      placement: o(() => "bottom"),
      offset: o(() => 4),
      floating: c,
      candidates: ["bottom", "top"]
    });
    function N(e) {
      var l, f;
      if (!r.value || i.disabled) return;
      const t = e.target;
      (l = x.value) != null && l.contains(t) || (f = c.value) != null && f.contains(t) || k();
    }
    function Q() {
      typeof document < "u" && document.addEventListener("click", N, !0);
    }
    function S() {
      typeof document < "u" && document.removeEventListener("click", N, !0);
    }
    L(r, (e) => {
      e ? O(Q) : S();
    }), ue(() => {
      p && clearTimeout(p), J(), S(), q();
    }), L(h, (e) => {
      !c.value || e < 0 || O(() => {
        var l;
        const t = (l = c.value) == null ? void 0 : l.querySelector(
          ".nm-autocomplete__option--active"
        );
        t && t.scrollIntoView({ block: "nearest" });
      });
    });
    const { getZIndex: W } = ge(), X = o(() => {
      const e = j.value, t = Math.max(G.value, 72);
      return {
        position: "fixed",
        top: T.value === "bottom" ? `${((e == null ? void 0 : e.bottom) ?? 0) + 4}px` : void 0,
        bottom: T.value === "top" ? `${typeof window < "u" ? window.innerHeight - ((e == null ? void 0 : e.top) ?? 0) + 4 : 0}px` : void 0,
        left: `${(e == null ? void 0 : e.left) ?? 0}px`,
        width: `${(e == null ? void 0 : e.width) ?? 0}px`,
        // 视口空间受限时收缩高度（默认上限 240px，与 SCSS 一致）
        maxHeight: `min(240px, ${t}px)`,
        zIndex: W("dropdown")
      };
    });
    function Y(e) {
      K(e), d("select", e);
    }
    function ee(e) {
      D(e);
    }
    function te(e) {
      d("focus", e), !r.value && m.value.length > 0 && Z();
    }
    let p = null;
    function oe(e) {
      p && clearTimeout(p), p = setTimeout(() => {
        p = null, !(c.value && document.activeElement && c.value.contains(document.activeElement)) && (d("blur", e), k());
      }, 150);
    }
    function le() {
      m.value = "", V.value = void 0, h.value = -1, d("update:modelValue", void 0), d("search", ""), k();
    }
    function ne(e) {
      d("search", e), U(e);
    }
    const ae = o(() => [
      "nm-autocomplete",
      `nm-autocomplete--${M.value}`,
      {
        "nm-autocomplete--disabled": i.disabled,
        "nm-autocomplete--open": r.value,
        "nm-autocomplete--has-value": m.value.length > 0
      }
    ]), z = o(() => I.value.length > 0), F = o(
      () => !z.value && m.value.trim().length > 0 && !_.value
    ), y = o(() => _.value);
    return (e, t) => (n(), u("div", {
      ref_key: "triggerRef",
      ref: x,
      class: b(ae.value)
    }, [
      R(we, {
        "model-value": s(m),
        label: v.label,
        placeholder: v.placeholder,
        disabled: v.disabled,
        size: M.value,
        autocomplete: "off",
        role: "combobox",
        "aria-expanded": s(r),
        "aria-haspopup": "listbox",
        "aria-autocomplete": "list",
        "onUpdate:modelValue": ne,
        onFocus: te,
        onBlur: oe,
        onKeydown: ee
      }, {
        suffix: $(() => [
          a("div", ke, [
            H.value && s(m).length > 0 && !y.value ? (n(), u("button", {
              key: 0,
              class: "nm-autocomplete__clear",
              type: "button",
              "aria-label": "Clear",
              onMousedown: t[0] || (t[0] = g(() => {
              }, ["prevent"])),
              onClick: g(le, ["stop"])
            }, [...t[2] || (t[2] = [
              a("svg", {
                width: "14",
                height: "14",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                "stroke-width": "2"
              }, [
                a("path", { d: "M18 6L6 18M6 6l12 12" })
              ], -1)
            ])], 32)) : w("", !0),
            y.value ? (n(), u("span", xe, [...t[3] || (t[3] = [
              a("svg", {
                width: "14",
                height: "14",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                "stroke-width": "2"
              }, [
                a("path", { d: "M12 2a10 10 0 1 0 10 10" })
              ], -1)
            ])])) : w("", !0),
            (n(), u("svg", {
              class: b(["nm-autocomplete__arrow", { "nm-autocomplete__arrow--open": s(r) }]),
              width: "16",
              height: "16",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              "stroke-width": "2",
              "aria-hidden": "true"
            }, [...t[4] || (t[4] = [
              a("path", { d: "M6 9l6 6 6-6" }, null, -1)
            ])], 2))
          ])
        ]),
        _: 1
      }, 8, ["model-value", "label", "placeholder", "disabled", "size", "aria-expanded"]),
      (n(), se(re, { to: "body" }, [
        R(de, { name: "nm-autocomplete-dropdown" }, {
          default: $(() => [
            s(r) ? (n(), u("div", {
              key: 0,
              ref_key: "dropdownRef",
              ref: c,
              class: b(["nm-autocomplete__dropdown", { "nm-autocomplete__dropdown--empty": F.value }]),
              role: "listbox",
              style: ce(X.value)
            }, [
              z.value ? (n(!0), u(me, { key: 0 }, pe(s(I), (l, f) => (n(), u("div", {
                key: l.value,
                class: b(["nm-autocomplete__option", {
                  "nm-autocomplete__option--active": f === s(h),
                  "nm-autocomplete__option--disabled": l.disabled
                }]),
                role: "option",
                "aria-selected": f === s(h),
                "aria-disabled": l.disabled,
                onMousedown: t[1] || (t[1] = g(() => {
                }, ["prevent"])),
                onClick: g((Ie) => Y(l), ["stop"])
              }, [
                a("span", {
                  class: "nm-autocomplete__option-label",
                  innerHTML: s(P)(l.label)
                }, null, 8, Ce)
              ], 42, ye))), 128)) : F.value ? (n(), u("div", Be, fe("No matching results"))) : y.value ? (n(), u("div", Me, [...t[5] || (t[5] = [
                a("svg", {
                  width: "16",
                  height: "16",
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  "stroke-width": "2",
                  class: "nm-autocomplete__loading-icon"
                }, [
                  a("path", { d: "M12 2a10 10 0 1 0 10 10" })
                ], -1),
                a("span", null, "Searching…", -1)
              ])])) : w("", !0)
            ], 6)) : w("", !0)
          ]),
          _: 1
        })
      ]))
    ], 2));
  }
}), Oe = /* @__PURE__ */ _e(Ve, [["__scopeId", "data-v-b39857be"]]);
export {
  Oe as N
};

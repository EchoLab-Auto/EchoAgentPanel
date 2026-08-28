import { defineComponent as $, computed as c, ref as h, openBlock as a, createBlock as A, withCtx as g, renderSlot as w, createElementVNode as f, unref as P, normalizeClass as k, createElementBlock as d, Fragment as y, renderList as K, createCommentVNode as v, toDisplayString as C } from "vue";
import { u as R } from "./createComponent-jnXBYqCm.js";
import { useLocale as z } from "../composables/useLocale.js";
import { N as F } from "./NeumorphismPopover-m8EjDIRe.js";
import { _ as H } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismDropdown.css';const M = ["aria-label"], O = {
  key: 0,
  class: "nm-dropdown__divider",
  role: "separator"
}, T = ["aria-disabled", "tabindex", "onClick"], U = {
  key: 0,
  class: "nm-dropdown__item-icon"
}, j = { class: "nm-dropdown__item-label" }, q = {
  key: 0,
  class: "nm-dropdown__custom"
}, G = /* @__PURE__ */ $({
  __name: "NeumorphismDropdown",
  props: {
    items: { default: () => [] },
    position: {},
    trigger: {},
    disabled: { type: Boolean, default: !1 },
    offset: {}
  },
  emits: ["select", "visible-change"],
  setup(r, { emit: D }) {
    const { t: N } = z(), i = r, { config: u, resolveProp: p } = R(), x = c(
      () => {
        var e;
        return p(i.position, (e = u.value.dropdown) == null ? void 0 : e.position, "bottom");
      }
    ), E = c(
      () => {
        var e;
        return p(i.trigger, (e = u.value.dropdown) == null ? void 0 : e.trigger, "click");
      }
    ), B = c(() => {
      var e;
      return p(i.offset, (e = u.value.dropdown) == null ? void 0 : e.offset, 4);
    }), b = D, m = h(), t = h(-1);
    function _(e) {
      var s, o;
      e.disabled || (b("select", e), (o = (s = m.value) == null ? void 0 : s.hide) == null || o.call(s));
    }
    function I(e) {
      e || (t.value = -1), b("visible-change", e);
    }
    function L(e) {
      var o, n;
      const s = i.items.filter((l) => !l.disabled);
      if (s.length)
        switch (e.key) {
          case "ArrowDown": {
            e.preventDefault(), t.value = t.value < s.length - 1 ? t.value + 1 : 0;
            break;
          }
          case "ArrowUp": {
            e.preventDefault(), t.value = t.value > 0 ? t.value - 1 : s.length - 1;
            break;
          }
          case "Enter":
          case " ": {
            e.preventDefault(), t.value >= 0 && _(s[t.value]);
            break;
          }
          case "Home": {
            e.preventDefault(), t.value = 0;
            break;
          }
          case "End": {
            e.preventDefault(), t.value = s.length - 1;
            break;
          }
          case "Escape": {
            (n = (o = m.value) == null ? void 0 : o.hide) == null || n.call(o);
            break;
          }
        }
    }
    function S(e, s) {
      const o = i.items.filter((n) => !n.disabled)[t.value] === e;
      return [
        "nm-dropdown__item",
        {
          "nm-dropdown__item--disabled": e.disabled,
          "nm-dropdown__item--danger": e.danger,
          "nm-dropdown__item--divided": e.divided,
          "nm-dropdown__item--active": o
        }
      ];
    }
    const V = c(() => ["nm-dropdown"]);
    return (e, s) => (a(), A(F, {
      ref_key: "popoverRef",
      ref: m,
      position: x.value,
      trigger: E.value,
      disabled: r.disabled,
      offset: B.value,
      "show-arrow": !1,
      onVisibleChange: I
    }, {
      content: g(() => [
        f("div", {
          class: k(V.value),
          role: "menu",
          "aria-label": P(N)("dropdownMenuLabel"),
          onKeydown: L
        }, [
          (a(!0), d(y, null, K(r.items, (o, n) => (a(), d(y, {
            key: o.key
          }, [
            o.divided && n > 0 ? (a(), d("div", O)) : v("", !0),
            f("div", {
              class: k(S(o)),
              role: "menuitem",
              "aria-disabled": o.disabled,
              tabindex: o.disabled ? -1 : r.items.filter((l) => !l.disabled)[t.value] === o ? 0 : -1,
              onClick: (l) => _(o)
            }, [
              o.icon ? (a(), d("span", U, C(o.icon), 1)) : v("", !0),
              f("span", j, C(o.label), 1)
            ], 10, T)
          ], 64))), 128)),
          r.items.length === 0 && e.$slots.items ? (a(), d("div", q, [
            w(e.$slots, "items", {}, void 0, !0)
          ])) : v("", !0)
        ], 42, M)
      ]),
      default: g(() => [
        w(e.$slots, "default", {}, void 0, !0)
      ]),
      _: 3
    }, 8, ["position", "trigger", "disabled", "offset"]));
  }
}), Z = /* @__PURE__ */ H(G, [["__scopeId", "data-v-3b25deef"]]);
export {
  Z as N
};

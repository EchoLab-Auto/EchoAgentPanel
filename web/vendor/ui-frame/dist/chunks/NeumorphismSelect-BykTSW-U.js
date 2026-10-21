import { defineComponent as Ye, computed as o, ref as C, watch as ie, nextTick as ue, onBeforeUnmount as el, openBlock as n, createElementBlock as c, createVNode as N, unref as a, createElementVNode as _, normalizeClass as h, withModifiers as B, Fragment as M, renderList as H, createBlock as $, withCtx as Z, createTextVNode as U, toDisplayString as y, createCommentVNode as f, renderSlot as W, Teleport as ll, Transition as al, normalizeStyle as tl } from "vue";
import { useSelect as ol } from "../composables/useSelect.js";
import { useFormField as nl } from "../composables/useFormField.js";
import { useConfig as sl } from "../composables/useConfig.js";
import il from "../composables/useFloatingPosition.js";
import { useLocale as ul } from "../composables/useLocale.js";
import { useZIndex as rl } from "../composables/useZIndex.js";
import { N as dl } from "./NeumorphismFieldLabel-C3S1Ax2f.js";
import { N as cl } from "./NeumorphismFieldError-BxamHjhs.js";
import { N as re } from "./NeumorphismTag-C9hlXpsv.js";
import { N as L } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as vl } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismSelect.css';const ml = { class: "nm-select__wrapper" }, pl = ["tabindex", "role", "aria-expanded", "aria-haspopup", "aria-controls", "aria-activedescendant", "aria-labelledby", "aria-label"], fl = { class: "nm-select__face" }, bl = ["value", "placeholder", "disabled", "readonly", "aria-expanded", "aria-controls", "aria-activedescendant", "aria-labelledby", "aria-label"], _l = { class: "nm-select__actions" }, gl = ["aria-label"], hl = ["id", "aria-label", "aria-multiselectable"], yl = {
  key: 0,
  class: "nm-select__loading"
}, xl = {
  key: 0,
  class: "nm-select__group-title",
  "aria-hidden": "true"
}, kl = ["id", "aria-selected", "aria-disabled", "onClick"], wl = { class: "nm-select__option-label" }, Tl = ["id", "aria-selected", "aria-disabled", "onClick"], Cl = { class: "nm-select__option-label" }, Bl = {
  key: 3,
  class: "nm-select__option nm-select__option--empty nm-select__empty"
}, $l = 6, Ll = /* @__PURE__ */ Ye({
  __name: "NeumorphismSelect",
  props: {
    modelValue: { default: "" },
    options: { default: () => [] },
    placeholder: { default: "" },
    disabled: { type: Boolean, default: !1 },
    size: {},
    label: {},
    required: { type: Boolean },
    error: { type: [String, Boolean] },
    name: {},
    id: {},
    clearable: { type: Boolean, default: !1 },
    emptyText: { default: "" },
    clearLabel: { default: "" },
    listLabel: { default: "" },
    multiple: { type: Boolean },
    filterable: { type: Boolean },
    loading: { type: Boolean, default: !1 },
    loadingText: { default: "" },
    collapseTags: { type: Boolean },
    maxCollapseTags: { default: 1 },
    variant: {}
  },
  emits: ["update:modelValue", "change", "focus", "blur", "visible-change", "remove-tag", "search"],
  setup(r, { expose: de, emit: ce }) {
    const i = r, S = sl(), { t: x } = ul(), ve = o(() => {
      var e;
      return i.size ?? ((e = S.value.select) == null ? void 0 : e.size) ?? "medium";
    }), F = o(() => i.placeholder || x("selectPlaceholder")), me = o(() => i.emptyText || x("selectEmpty")), pe = o(() => i.clearLabel || x("selectClear")), fe = o(() => i.listLabel || x("selectListLabel")), be = o(() => i.loadingText || x("selectLoading")), u = o(() => {
      var e;
      return i.multiple ?? ((e = S.value.select) == null ? void 0 : e.multiple) ?? !1;
    }), d = o(
      () => {
        var e;
        return i.filterable ?? ((e = S.value.select) == null ? void 0 : e.filterable) ?? !1;
      }
    ), _e = o(
      () => {
        var e;
        return i.collapseTags ?? ((e = S.value.select) == null ? void 0 : e.collapseTags) ?? !1;
      }
    ), k = o(() => {
      var e;
      return i.variant ?? ((e = S.value.select) == null ? void 0 : e.variant) ?? "default";
    }), g = ce, ge = o({
      get: () => i.modelValue,
      set: (e) => {
        g("update:modelValue", e), g("change", e);
      }
    }), V = C(""), {
      isOpen: v,
      selectedOption: w,
      selectedOptions: R,
      filteredOptions: P,
      groupedOptions: D,
      activeValue: E,
      isSelected: p,
      toggleOpen: he,
      selectOption: q,
      removeValue: ye,
      clearValue: xe,
      handleKeydown: ke,
      handleBlur: we
    } = ol({
      modelValue: ge,
      options: o(() => i.options),
      disabled: o(() => i.disabled),
      multiple: u,
      filterText: V
    }), { fieldId: b, errorMessage: Te, hasError: Ce, baseClassList: Be, handleFocus: j, handleBlur: $e } = nl(
      () => ({
        id: i.id,
        size: ve.value,
        disabled: i.disabled,
        error: i.error,
        prefix: "select"
      })
    ), I = o(
      () => u.value ? R.value.length > 0 : i.modelValue !== "" && i.modelValue !== void 0 && i.modelValue !== null
    ), O = C(!1), K = C(!1), Le = o(() => [
      ...Be("nm-select").value,
      {
        "nm-select--open": O.value,
        "nm-select--has-value": I.value,
        "nm-select--multiple": u.value,
        "nm-select--filterable": d.value,
        "nm-select--outlined": k.value === "outlined",
        // 向上翻转：盒体 column-reverse + 负 margin-top 补偿 + 投影镜像
        "nm-select--drop-up": O.value && z.value === "top",
        // 发光时序独立于几何（--open）：与面板动画同生共灭 ——
        // 展开时随面板抽出淡入，收起时随面板抽回同时开始淡出，与展开严格对称
        "nm-select--glowing": v.value,
        "nm-select--settled": K.value
      }
    ]), J = o(
      () => _e.value ? R.value.slice(0, i.maxCollapseTags) : R.value
    ), Q = o(() => R.value.length - J.value.length);
    function Ve(e) {
      ye(e), g("remove-tag", e);
    }
    const A = C(), Ie = o(() => {
      var e;
      return u.value || v.value ? V.value : ((e = w.value) == null ? void 0 : e.label) ?? "";
    }), ze = o(() => {
      var e;
      return u.value ? I.value ? "" : F.value : ((e = w.value) == null ? void 0 : e.label) || F.value;
    }), Ne = o(
      () => !u.value && !v.value && d.value
    );
    function Se(e) {
      const l = e.target.value;
      V.value = l, g("search", l), v.value || (v.value = !0);
    }
    function Fe(e) {
      j(e, g), v.value || (v.value = !0);
    }
    function X(e) {
      d.value && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey || ke(e);
    }
    const m = C();
    function Pe() {
      var e;
      if (!i.disabled) {
        if (d.value) {
          (e = A.value) == null || e.focus(), v.value = !0;
          return;
        }
        he();
      }
    }
    function Oe(e) {
      e.stopPropagation(), xe();
    }
    function Me() {
      var e;
      (e = d.value ? A.value : m.value) == null || e.focus();
    }
    function Re() {
      var e;
      (e = d.value ? A.value : m.value) == null || e.blur();
    }
    de({ focus: Me, blur: Re });
    const T = C(), Y = o(() => k.value === "outlined" ? 0 : $l), ee = C(0);
    function De() {
      if (!m.value) return;
      if (k.value !== "outlined") {
        m.value.style.marginBottom = "", m.value.style.marginTop = "";
        return;
      }
      const e = Math.max(m.value.offsetHeight - ee.value, 0);
      m.value.style.marginBottom = z.value === "top" ? "0px" : `${-e}px`, m.value.style.marginTop = z.value === "top" ? `${-e}px` : "0px";
    }
    const {
      actualPlacement: z,
      rect: Ee,
      available: qe,
      refresh: Ae,
      stop: le
    } = il({
      trigger: m,
      // 追踪存续期跟随 visualOpen —— 收起动画期间（isOpen 已 false）
      // 仍需逐帧同步负 margin 与位置，直到 @after-leave 停止
      open: O,
      placement: o(() => "bottom"),
      offset: Y,
      floating: T,
      candidates: ["bottom", "top"],
      // outlined 单盒会随展开长高 —— 逐帧判向会把盒底增长误判为空间不足，
      // 展开中途翻转（下拉从下方瞬跳到上方）。锁定为打开时一次性决策；
      // default 浮层翻转廉价，保留滚动中的滞后翻转
      lockPlacement: o(() => k.value === "outlined"),
      onFrame: De
    });
    function ae() {
      var l;
      if (!T.value) return;
      const e = T.value.querySelector(".nm-select__option--active") || T.value.querySelector(".nm-select__option--selected");
      (l = e == null ? void 0 : e.scrollIntoView) == null || l.call(e, { block: "nearest" });
    }
    ie([w, E], () => {
      v.value && ue(ae);
    });
    function G(e) {
      var t, s;
      const l = e.target;
      (t = m.value) != null && t.contains(l) || (s = T.value) != null && s.contains(l) || (v.value = !1);
    }
    ie(v, (e) => {
      var l;
      g("visible-change", e), typeof document < "u" && (e ? document.addEventListener("pointerdown", G, !0) : document.removeEventListener("pointerdown", G, !0)), e ? (O.value = !0, ee.value = ((l = m.value) == null ? void 0 : l.offsetHeight) ?? 0, ue(() => {
        Ae(), ae();
      })) : (V.value = "", K.value = !1);
    });
    function He() {
      O.value = !1, le(), m.value && (m.value.style.marginBottom = "", m.value.style.marginTop = "");
    }
    el(() => {
      le(), typeof document < "u" && document.removeEventListener("pointerdown", G, !0);
    });
    const { getZIndex: Ke } = rl(), Ge = o(() => Math.max(qe.value, 72)), Ze = o(() => {
      const e = `min(var(--nm-select-dropdown-max-height), ${Ge.value}px)`;
      if (k.value === "outlined")
        return { maxHeight: e };
      const l = Ee.value, t = Y.value;
      return {
        position: "fixed",
        top: z.value === "bottom" ? `${((l == null ? void 0 : l.bottom) ?? 0) + t}px` : void 0,
        bottom: z.value === "top" ? `${typeof window < "u" ? window.innerHeight - ((l == null ? void 0 : l.top) ?? 0) + t : 0}px` : void 0,
        left: `${(l == null ? void 0 : l.left) ?? 0}px`,
        width: `${(l == null ? void 0 : l.width) ?? 0}px`,
        maxHeight: e,
        zIndex: Ke("dropdown")
      };
    }), Ue = o(
      () => D.value.length > 1 || D.value.length === 1 && D.value[0].name !== ""
    );
    function te(e) {
      return P.value.indexOf(e);
    }
    function oe(e) {
      return `${b}-opt-${te(e)}`;
    }
    const ne = o(() => {
      var t;
      const e = u.value ? E.value : (t = w.value) == null ? void 0 : t.value;
      if (e === void 0) return;
      const l = P.value.findIndex((s) => s.value === e);
      return l >= 0 ? `${b}-opt-${l}` : void 0;
    }), We = o(
      () => V.value.trim() ? x("selectNoMatch") : me.value
    ), je = o(
      () => !d.value && !(u.value && I.value)
    ), Je = o(
      () => {
        var e;
        return u.value ? F.value : ((e = w.value) == null ? void 0 : e.label) || F.value;
      }
    ), Qe = o(
      () => u.value ? !I.value : !w.value
    );
    function se(e) {
      var l;
      (l = T.value) != null && l.contains(e.relatedTarget) || (we(e.relatedTarget, e.currentTarget), $e(e, g));
    }
    return (e, l) => (n(), c("div", ml, [
      N(dl, {
        label: r.label,
        required: r.required,
        "for-id": a(b)
      }, null, 8, ["label", "required", "for-id"]),
      _("div", {
        ref_key: "triggerRef",
        ref: m,
        class: h(Le.value),
        tabindex: r.disabled || d.value ? -1 : 0,
        role: d.value ? void 0 : "combobox",
        "aria-expanded": d.value ? void 0 : a(v),
        "aria-haspopup": d.value ? void 0 : "listbox",
        "aria-controls": d.value ? void 0 : `${a(b)}-listbox`,
        "aria-activedescendant": d.value ? void 0 : ne.value,
        "aria-labelledby": !d.value && r.label ? a(b) : void 0,
        "aria-label": !d.value && !r.label ? F.value : void 0,
        onClick: Pe,
        onFocus: l[6] || (l[6] = (t) => a(j)(t, g)),
        onBlur: se,
        onKeydown: X
      }, [
        _("div", fl, [
          u.value && I.value ? (n(), c("span", {
            key: 0,
            class: "nm-select__tags",
            onMousedown: l[0] || (l[0] = B(() => {
            }, ["prevent"]))
          }, [
            (n(!0), c(M, null, H(J.value, (t) => (n(), $(re, {
              key: t.value,
              size: "small",
              closable: !r.disabled,
              onClose: (s) => Ve(t.value)
            }, {
              default: Z(() => [
                U(y(t.label), 1)
              ]),
              _: 2
            }, 1032, ["closable", "onClose"]))), 128)),
            Q.value > 0 ? (n(), $(re, {
              key: 0,
              size: "small",
              class: "nm-select__tag-collapse"
            }, {
              default: Z(() => [
                U(" +" + y(Q.value), 1)
              ]),
              _: 1
            })) : f("", !0)
          ], 32)) : f("", !0),
          d.value ? (n(), c("input", {
            key: 1,
            ref_key: "filterInputRef",
            ref: A,
            class: "nm-select__input",
            value: Ie.value,
            placeholder: ze.value,
            disabled: r.disabled,
            readonly: Ne.value,
            role: "combobox",
            "aria-expanded": a(v),
            "aria-haspopup": "listbox",
            "aria-controls": `${a(b)}-listbox`,
            "aria-activedescendant": ne.value,
            "aria-labelledby": r.label ? a(b) : void 0,
            "aria-label": r.label ? void 0 : a(x)("selectSearchLabel"),
            "aria-autocomplete": "list",
            onInput: Se,
            onFocus: Fe,
            onBlur: se,
            onKeydown: X
          }, null, 40, bl)) : je.value ? (n(), c("span", {
            key: 2,
            class: h(["nm-select__value", { "nm-select__value--placeholder": Qe.value }])
          }, [
            W(e.$slots, "value", { option: a(w) }, () => [
              U(y(Je.value), 1)
            ], !0)
          ], 2)) : f("", !0),
          _("span", _l, [
            r.clearable && I.value && !r.loading && !r.disabled ? (n(), c("button", {
              key: 0,
              class: "nm-select__clear",
              type: "button",
              "aria-label": pe.value,
              onMousedown: l[1] || (l[1] = B(() => {
              }, ["prevent"])),
              onClick: Oe
            }, [
              N(L, {
                name: "close",
                size: "sm"
              })
            ], 40, gl)) : f("", !0),
            r.loading ? (n(), $(L, {
              key: 1,
              name: "spinner",
              size: "md",
              spin: "",
              class: "nm-select__spinner",
              "aria-hidden": "true"
            })) : (n(), $(L, {
              key: 2,
              name: "chevron-down",
              size: "md",
              class: h(["nm-select__arrow", { "nm-select__arrow--open": a(v) }])
            }, null, 8, ["class"]))
          ])
        ]),
        (n(), $(ll, {
          to: "body",
          disabled: k.value === "outlined"
        }, [
          N(al, {
            name: "nm-select-dropdown",
            onAfterEnter: l[5] || (l[5] = (t) => K.value = !0),
            onAfterLeave: He
          }, {
            default: Z(() => [
              a(v) ? (n(), c("div", {
                key: 0,
                id: `${a(b)}-listbox`,
                ref_key: "dropdownRef",
                ref: T,
                class: h(["nm-select__dropdown", {
                  "nm-select__dropdown--up": a(z) === "top",
                  "nm-select__dropdown--multiple": u.value,
                  "nm-select__dropdown--outlined": k.value === "outlined",
                  "nm-select__dropdown--error": a(Ce)
                }]),
                role: "listbox",
                "aria-label": r.label || fe.value,
                "aria-multiselectable": u.value || void 0,
                style: tl(Ze.value),
                onMousedown: l[3] || (l[3] = B(() => {
                }, ["prevent"])),
                onClick: l[4] || (l[4] = B(() => {
                }, ["stop"]))
              }, [
                r.loading ? (n(), c("div", yl, [
                  N(L, {
                    name: "spinner",
                    size: "md",
                    spin: "",
                    class: "nm-select__loading-icon",
                    "aria-hidden": "true"
                  }),
                  _("span", null, y(be.value), 1)
                ])) : Ue.value && a(P).length > 0 ? (n(!0), c(M, { key: 1 }, H(a(D), (t) => (n(), c(M, {
                  key: t.name || "__ungrouped__"
                }, [
                  t.name ? (n(), c("div", xl, y(t.name), 1)) : f("", !0),
                  (n(!0), c(M, null, H(t.options, (s) => W(e.$slots, "option", {
                    key: s.value,
                    option: s,
                    selected: a(p)(s),
                    index: te(s),
                    select: a(q)
                  }, () => [
                    _("div", {
                      id: oe(s),
                      class: h(["nm-select__option", {
                        "nm-select__option--selected": a(p)(s),
                        "nm-select__option--disabled": s.disabled,
                        "nm-select__option--active": u.value && s.value === a(E)
                      }]),
                      role: "option",
                      "aria-selected": a(p)(s),
                      "aria-disabled": s.disabled,
                      onMousedown: l[2] || (l[2] = B(() => {
                      }, ["prevent"])),
                      onClick: B((Xe) => a(q)(s), ["stop"])
                    }, [
                      u.value ? (n(), c("span", {
                        key: 0,
                        class: h(["nm-select__checkbox", { "nm-select__checkbox--checked": a(p)(s) }]),
                        "aria-hidden": "true"
                      }, [
                        a(p)(s) ? (n(), $(L, {
                          key: 0,
                          name: "check",
                          size: "xs",
                          "stroke-width": 3
                        })) : f("", !0)
                      ], 2)) : f("", !0),
                      _("span", wl, y(s.label), 1)
                    ], 42, kl)
                  ], !0)), 128))
                ], 64))), 128)) : a(P).length > 0 ? (n(!0), c(M, { key: 2 }, H(a(P), (t, s) => W(e.$slots, "option", {
                  key: t.value,
                  option: t,
                  selected: a(p)(t),
                  index: s,
                  select: a(q)
                }, () => [
                  _("div", {
                    id: oe(t),
                    class: h(["nm-select__option", {
                      "nm-select__option--selected": a(p)(t),
                      "nm-select__option--disabled": t.disabled,
                      "nm-select__option--active": u.value && t.value === a(E)
                    }]),
                    role: "option",
                    "aria-selected": a(p)(t),
                    "aria-disabled": t.disabled,
                    onClick: B((Xe) => a(q)(t), ["stop"])
                  }, [
                    u.value ? (n(), c("span", {
                      key: 0,
                      class: h(["nm-select__checkbox", { "nm-select__checkbox--checked": a(p)(t) }]),
                      "aria-hidden": "true"
                    }, [
                      a(p)(t) ? (n(), $(L, {
                        key: 0,
                        name: "check",
                        size: "xs",
                        "stroke-width": 3
                      })) : f("", !0)
                    ], 2)) : f("", !0),
                    _("span", Cl, y(t.label), 1)
                  ], 10, Tl)
                ], !0)), 128)) : (n(), c("div", Bl, [
                  N(L, {
                    name: "inbox",
                    size: "2xl",
                    class: "nm-select__empty-icon"
                  }),
                  _("span", null, y(We.value), 1)
                ]))
              ], 46, hl)) : f("", !0)
            ]),
            _: 3
          })
        ], 8, ["disabled"]))
      ], 42, pl),
      N(cl, {
        id: `${a(b)}-error`,
        message: a(Te)
      }, null, 8, ["id", "message"])
    ]));
  }
}), ql = /* @__PURE__ */ vl(Ll, [["__scopeId", "data-v-39984d16"]]);
export {
  ql as N
};

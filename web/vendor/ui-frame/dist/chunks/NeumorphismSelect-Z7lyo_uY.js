import { defineComponent as al, computed as o, ref as C, watch as ue, nextTick as re, onBeforeUnmount as tl, openBlock as n, createElementBlock as c, createVNode as N, unref as a, createElementVNode as _, normalizeStyle as de, normalizeClass as y, withModifiers as L, Fragment as D, renderList as H, createBlock as z, withCtx as U, createTextVNode as W, toDisplayString as h, createCommentVNode as f, renderSlot as X, Teleport as ol, Transition as nl } from "vue";
import { useSelect as sl } from "../composables/useSelect.js";
import { useFormField as il } from "../composables/useFormField.js";
import { useConfig as ul } from "../composables/useConfig.js";
import rl from "../composables/useFloatingPosition.js";
import { useLocale as dl } from "../composables/useLocale.js";
import { useZIndex as cl } from "../composables/useZIndex.js";
import { n as vl, r as ml, F as pl } from "./controlScales-CPj0Htdh.js";
import { N as fl } from "./NeumorphismFieldLabel-C3S1Ax2f.js";
import { N as bl } from "./NeumorphismFieldError-BxamHjhs.js";
import { N as ce } from "./NeumorphismTag-C6c5RGls.js";
import { N as B } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as _l } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismSelect.css';const gl = { class: "nm-select__wrapper" }, yl = ["tabindex", "role", "aria-expanded", "aria-haspopup", "aria-controls", "aria-activedescendant", "aria-labelledby", "aria-label"], hl = { class: "nm-select__face" }, xl = ["value", "placeholder", "disabled", "readonly", "aria-expanded", "aria-controls", "aria-activedescendant", "aria-labelledby", "aria-label"], kl = { class: "nm-select__actions" }, wl = ["aria-label"], Tl = ["id", "aria-label", "aria-multiselectable"], Cl = {
  key: 0,
  class: "nm-select__loading"
}, Ll = {
  key: 0,
  class: "nm-select__group-title",
  "aria-hidden": "true"
}, zl = ["id", "aria-selected", "aria-disabled", "onClick"], Bl = { class: "nm-select__option-label" }, $l = ["id", "aria-selected", "aria-disabled", "onClick"], Sl = { class: "nm-select__option-label" }, Vl = {
  key: 3,
  class: "nm-select__option nm-select__option--empty nm-select__empty"
}, Il = 48, Nl = 6, Fl = /* @__PURE__ */ al({
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
  setup(r, { expose: ve, emit: me }) {
    const s = r, $ = ul(), { t: x } = dl(), K = o(() => {
      var l;
      const e = s.size ?? ((l = $.value.select) == null ? void 0 : l.size);
      return typeof e == "number" ? vl(e, Il) : void 0;
    }), pe = o(() => {
      var l;
      const e = s.size ?? ((l = $.value.select) == null ? void 0 : l.size);
      return typeof e == "string" ? e : "medium";
    }), fe = o(
      () => K.value === void 0 ? void 0 : ml(pl, K.value)
    ), F = o(() => s.placeholder || x("selectPlaceholder")), be = o(() => s.emptyText || x("selectEmpty")), _e = o(() => s.clearLabel || x("selectClear")), ge = o(() => s.listLabel || x("selectListLabel")), ye = o(() => s.loadingText || x("selectLoading")), u = o(() => {
      var e;
      return s.multiple ?? ((e = $.value.select) == null ? void 0 : e.multiple) ?? !1;
    }), d = o(
      () => {
        var e;
        return s.filterable ?? ((e = $.value.select) == null ? void 0 : e.filterable) ?? !1;
      }
    ), he = o(
      () => {
        var e;
        return s.collapseTags ?? ((e = $.value.select) == null ? void 0 : e.collapseTags) ?? !1;
      }
    ), k = o(() => {
      var e;
      return s.variant ?? ((e = $.value.select) == null ? void 0 : e.variant) ?? "default";
    }), g = me, xe = o({
      get: () => s.modelValue,
      set: (e) => {
        g("update:modelValue", e), g("change", e);
      }
    }), S = C(""), {
      isOpen: v,
      selectedOption: w,
      selectedOptions: O,
      filteredOptions: E,
      groupedOptions: M,
      activeValue: R,
      isSelected: p,
      toggleOpen: ke,
      selectOption: A,
      removeValue: we,
      clearValue: Te,
      handleKeydown: Ce,
      handleBlur: Le
    } = sl({
      modelValue: xe,
      options: o(() => s.options),
      disabled: o(() => s.disabled),
      multiple: u,
      filterText: S
    }), { fieldId: b, errorMessage: ze, hasError: Be, baseClassList: $e, handleFocus: j, handleBlur: Se } = il(
      () => ({
        id: s.id,
        // 数字直接交给 useFormField 判 `--sized` 档；它只决定 class，几何量在内联变量里
        size: K.value ?? pe.value,
        disabled: s.disabled,
        error: s.error,
        prefix: "select"
      })
    ), V = o(
      () => u.value ? O.value.length > 0 : s.modelValue !== "" && s.modelValue !== void 0 && s.modelValue !== null
    ), P = C(!1), G = C(!1), Ve = o(() => [
      ...$e("nm-select").value,
      {
        "nm-select--open": P.value,
        "nm-select--has-value": V.value,
        "nm-select--multiple": u.value,
        "nm-select--filterable": d.value,
        "nm-select--outlined": k.value === "outlined",
        // 向上翻转：盒体 column-reverse + 负 margin-top 补偿 + 投影镜像
        "nm-select--drop-up": P.value && I.value === "top",
        // 发光时序独立于几何（--open）：与面板动画同生共灭 ——
        // 展开时随面板抽出淡入，收起时随面板抽回同时开始淡出，与展开严格对称
        "nm-select--glowing": v.value,
        "nm-select--settled": G.value
      }
    ]), J = o(
      () => he.value ? O.value.slice(0, s.maxCollapseTags) : O.value
    ), Q = o(() => O.value.length - J.value.length);
    function Ie(e) {
      we(e), g("remove-tag", e);
    }
    const q = C(), Ne = o(() => {
      var e;
      return u.value || v.value ? S.value : ((e = w.value) == null ? void 0 : e.label) ?? "";
    }), Fe = o(() => {
      var e;
      return u.value ? V.value ? "" : F.value : ((e = w.value) == null ? void 0 : e.label) || F.value;
    }), Ee = o(
      () => !u.value && !v.value && d.value
    );
    function Pe(e) {
      const l = e.target.value;
      S.value = l, g("search", l), v.value || (v.value = !0);
    }
    function De(e) {
      j(e, g), v.value || (v.value = !0);
    }
    function Y(e) {
      d.value && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey || Ce(e);
    }
    const m = C();
    function Oe() {
      var e;
      if (!s.disabled) {
        if (d.value) {
          (e = q.value) == null || e.focus(), v.value = !0;
          return;
        }
        ke();
      }
    }
    function Me(e) {
      e.stopPropagation(), Te();
    }
    function Re() {
      var e;
      (e = d.value ? q.value : m.value) == null || e.focus();
    }
    function Ae() {
      var e;
      (e = d.value ? q.value : m.value) == null || e.blur();
    }
    ve({ focus: Re, blur: Ae });
    const T = C(), ee = o(() => k.value === "outlined" ? 0 : Nl), le = C(0);
    function qe() {
      if (!m.value) return;
      if (k.value !== "outlined") {
        m.value.style.marginBottom = "", m.value.style.marginTop = "";
        return;
      }
      const e = Math.max(m.value.offsetHeight - le.value, 0);
      m.value.style.marginBottom = I.value === "top" ? "0px" : `${-e}px`, m.value.style.marginTop = I.value === "top" ? `${-e}px` : "0px";
    }
    const {
      actualPlacement: I,
      rect: He,
      available: Ke,
      refresh: Ge,
      stop: ae
    } = rl({
      trigger: m,
      // 追踪存续期跟随 visualOpen —— 收起动画期间（isOpen 已 false）
      // 仍需逐帧同步负 margin 与位置，直到 @after-leave 停止
      open: P,
      placement: o(() => "bottom"),
      offset: ee,
      floating: T,
      candidates: ["bottom", "top"],
      // outlined 单盒会随展开长高 —— 逐帧判向会把盒底增长误判为空间不足，
      // 展开中途翻转（下拉从下方瞬跳到上方）。锁定为打开时一次性决策；
      // default 浮层翻转廉价，保留滚动中的滞后翻转
      lockPlacement: o(() => k.value === "outlined"),
      onFrame: qe
    });
    function te() {
      var l;
      if (!T.value) return;
      const e = T.value.querySelector(".nm-select__option--active") || T.value.querySelector(".nm-select__option--selected");
      (l = e == null ? void 0 : e.scrollIntoView) == null || l.call(e, { block: "nearest" });
    }
    ue([w, R], () => {
      v.value && re(te);
    });
    function Z(e) {
      var t, i;
      const l = e.target;
      (t = m.value) != null && t.contains(l) || (i = T.value) != null && i.contains(l) || (v.value = !1);
    }
    ue(v, (e) => {
      var l;
      g("visible-change", e), typeof document < "u" && (e ? document.addEventListener("pointerdown", Z, !0) : document.removeEventListener("pointerdown", Z, !0)), e ? (P.value = !0, le.value = ((l = m.value) == null ? void 0 : l.offsetHeight) ?? 0, re(() => {
        Ge(), te();
      })) : (S.value = "", G.value = !1);
    });
    function Ze() {
      P.value = !1, ae(), m.value && (m.value.style.marginBottom = "", m.value.style.marginTop = "");
    }
    tl(() => {
      ae(), typeof document < "u" && document.removeEventListener("pointerdown", Z, !0);
    });
    const { getZIndex: Ue } = cl(), We = o(() => Math.max(Ke.value, 72)), Xe = o(() => {
      const e = `min(var(--nm-select-dropdown-max-height), ${We.value}px)`;
      if (k.value === "outlined")
        return { maxHeight: e };
      const l = He.value, t = ee.value;
      return {
        position: "fixed",
        top: I.value === "bottom" ? `${((l == null ? void 0 : l.bottom) ?? 0) + t}px` : void 0,
        bottom: I.value === "top" ? `${typeof window < "u" ? window.innerHeight - ((l == null ? void 0 : l.top) ?? 0) + t : 0}px` : void 0,
        left: `${(l == null ? void 0 : l.left) ?? 0}px`,
        width: `${(l == null ? void 0 : l.width) ?? 0}px`,
        maxHeight: e,
        zIndex: Ue("dropdown")
      };
    }), je = o(
      () => M.value.length > 1 || M.value.length === 1 && M.value[0].name !== ""
    );
    function oe(e) {
      return E.value.indexOf(e);
    }
    function ne(e) {
      return `${b}-opt-${oe(e)}`;
    }
    const se = o(() => {
      var t;
      const e = u.value ? R.value : (t = w.value) == null ? void 0 : t.value;
      if (e === void 0) return;
      const l = E.value.findIndex((i) => i.value === e);
      return l >= 0 ? `${b}-opt-${l}` : void 0;
    }), Je = o(
      () => S.value.trim() ? x("selectNoMatch") : be.value
    ), Qe = o(
      () => !d.value && !(u.value && V.value)
    ), Ye = o(
      () => {
        var e;
        return u.value ? F.value : ((e = w.value) == null ? void 0 : e.label) || F.value;
      }
    ), el = o(
      () => u.value ? !V.value : !w.value
    );
    function ie(e) {
      var l;
      (l = T.value) != null && l.contains(e.relatedTarget) || (Le(e.relatedTarget, e.currentTarget), Se(e, g));
    }
    return (e, l) => (n(), c("div", gl, [
      N(fl, {
        label: r.label,
        required: r.required,
        "for-id": a(b)
      }, null, 8, ["label", "required", "for-id"]),
      _("div", {
        ref_key: "triggerRef",
        ref: m,
        class: y(Ve.value),
        style: de(fe.value),
        tabindex: r.disabled || d.value ? -1 : 0,
        role: d.value ? void 0 : "combobox",
        "aria-expanded": d.value ? void 0 : a(v),
        "aria-haspopup": d.value ? void 0 : "listbox",
        "aria-controls": d.value ? void 0 : `${a(b)}-listbox`,
        "aria-activedescendant": d.value ? void 0 : se.value,
        "aria-labelledby": !d.value && r.label ? a(b) : void 0,
        "aria-label": !d.value && !r.label ? F.value : void 0,
        onClick: Oe,
        onFocus: l[6] || (l[6] = (t) => a(j)(t, g)),
        onBlur: ie,
        onKeydown: Y
      }, [
        _("div", hl, [
          u.value && V.value ? (n(), c("span", {
            key: 0,
            class: "nm-select__tags",
            onMousedown: l[0] || (l[0] = L(() => {
            }, ["prevent"]))
          }, [
            (n(!0), c(D, null, H(J.value, (t) => (n(), z(ce, {
              key: t.value,
              size: "small",
              closable: !r.disabled,
              onClose: (i) => Ie(t.value)
            }, {
              default: U(() => [
                W(h(t.label), 1)
              ]),
              _: 2
            }, 1032, ["closable", "onClose"]))), 128)),
            Q.value > 0 ? (n(), z(ce, {
              key: 0,
              size: "small",
              class: "nm-select__tag-collapse"
            }, {
              default: U(() => [
                W(" +" + h(Q.value), 1)
              ]),
              _: 1
            })) : f("", !0)
          ], 32)) : f("", !0),
          d.value ? (n(), c("input", {
            key: 1,
            ref_key: "filterInputRef",
            ref: q,
            class: "nm-select__input",
            value: Ne.value,
            placeholder: Fe.value,
            disabled: r.disabled,
            readonly: Ee.value,
            role: "combobox",
            "aria-expanded": a(v),
            "aria-haspopup": "listbox",
            "aria-controls": `${a(b)}-listbox`,
            "aria-activedescendant": se.value,
            "aria-labelledby": r.label ? a(b) : void 0,
            "aria-label": r.label ? void 0 : a(x)("selectSearchLabel"),
            "aria-autocomplete": "list",
            onInput: Pe,
            onFocus: De,
            onBlur: ie,
            onKeydown: Y
          }, null, 40, xl)) : Qe.value ? (n(), c("span", {
            key: 2,
            class: y(["nm-select__value", { "nm-select__value--placeholder": el.value }])
          }, [
            X(e.$slots, "value", { option: a(w) }, () => [
              W(h(Ye.value), 1)
            ], !0)
          ], 2)) : f("", !0),
          _("span", kl, [
            r.clearable && V.value && !r.loading && !r.disabled ? (n(), c("button", {
              key: 0,
              class: "nm-select__clear",
              type: "button",
              "aria-label": _e.value,
              onMousedown: l[1] || (l[1] = L(() => {
              }, ["prevent"])),
              onClick: Me
            }, [
              N(B, {
                name: "close",
                size: "sm"
              })
            ], 40, wl)) : f("", !0),
            r.loading ? (n(), z(B, {
              key: 1,
              name: "spinner",
              size: "md",
              spin: "",
              class: "nm-select__spinner",
              "aria-hidden": "true"
            })) : (n(), z(B, {
              key: 2,
              name: "chevron-down",
              size: "md",
              class: y(["nm-select__arrow", { "nm-select__arrow--open": a(v) }])
            }, null, 8, ["class"]))
          ])
        ]),
        (n(), z(ol, {
          to: "body",
          disabled: k.value === "outlined"
        }, [
          N(nl, {
            name: "nm-select-dropdown",
            onAfterEnter: l[5] || (l[5] = (t) => G.value = !0),
            onAfterLeave: Ze
          }, {
            default: U(() => [
              a(v) ? (n(), c("div", {
                key: 0,
                id: `${a(b)}-listbox`,
                ref_key: "dropdownRef",
                ref: T,
                class: y(["nm-select__dropdown", {
                  "nm-select__dropdown--up": a(I) === "top",
                  "nm-select__dropdown--multiple": u.value,
                  "nm-select__dropdown--outlined": k.value === "outlined",
                  "nm-select__dropdown--error": a(Be)
                }]),
                role: "listbox",
                "aria-label": r.label || ge.value,
                "aria-multiselectable": u.value || void 0,
                style: de(Xe.value),
                onMousedown: l[3] || (l[3] = L(() => {
                }, ["prevent"])),
                onClick: l[4] || (l[4] = L(() => {
                }, ["stop"]))
              }, [
                r.loading ? (n(), c("div", Cl, [
                  N(B, {
                    name: "spinner",
                    size: "md",
                    spin: "",
                    class: "nm-select__loading-icon",
                    "aria-hidden": "true"
                  }),
                  _("span", null, h(ye.value), 1)
                ])) : je.value && a(E).length > 0 ? (n(!0), c(D, { key: 1 }, H(a(M), (t) => (n(), c(D, {
                  key: t.name || "__ungrouped__"
                }, [
                  t.name ? (n(), c("div", Ll, h(t.name), 1)) : f("", !0),
                  (n(!0), c(D, null, H(t.options, (i) => X(e.$slots, "option", {
                    key: i.value,
                    option: i,
                    selected: a(p)(i),
                    index: oe(i),
                    select: a(A)
                  }, () => [
                    _("div", {
                      id: ne(i),
                      class: y(["nm-select__option", {
                        "nm-select__option--selected": a(p)(i),
                        "nm-select__option--disabled": i.disabled,
                        "nm-select__option--active": u.value && i.value === a(R)
                      }]),
                      role: "option",
                      "aria-selected": a(p)(i),
                      "aria-disabled": i.disabled,
                      onMousedown: l[2] || (l[2] = L(() => {
                      }, ["prevent"])),
                      onClick: L((ll) => a(A)(i), ["stop"])
                    }, [
                      u.value ? (n(), c("span", {
                        key: 0,
                        class: y(["nm-select__checkbox", { "nm-select__checkbox--checked": a(p)(i) }]),
                        "aria-hidden": "true"
                      }, [
                        a(p)(i) ? (n(), z(B, {
                          key: 0,
                          name: "check",
                          size: "xs",
                          "stroke-width": 3
                        })) : f("", !0)
                      ], 2)) : f("", !0),
                      _("span", Bl, h(i.label), 1)
                    ], 42, zl)
                  ], !0)), 128))
                ], 64))), 128)) : a(E).length > 0 ? (n(!0), c(D, { key: 2 }, H(a(E), (t, i) => X(e.$slots, "option", {
                  key: t.value,
                  option: t,
                  selected: a(p)(t),
                  index: i,
                  select: a(A)
                }, () => [
                  _("div", {
                    id: ne(t),
                    class: y(["nm-select__option", {
                      "nm-select__option--selected": a(p)(t),
                      "nm-select__option--disabled": t.disabled,
                      "nm-select__option--active": u.value && t.value === a(R)
                    }]),
                    role: "option",
                    "aria-selected": a(p)(t),
                    "aria-disabled": t.disabled,
                    onClick: L((ll) => a(A)(t), ["stop"])
                  }, [
                    u.value ? (n(), c("span", {
                      key: 0,
                      class: y(["nm-select__checkbox", { "nm-select__checkbox--checked": a(p)(t) }]),
                      "aria-hidden": "true"
                    }, [
                      a(p)(t) ? (n(), z(B, {
                        key: 0,
                        name: "check",
                        size: "xs",
                        "stroke-width": 3
                      })) : f("", !0)
                    ], 2)) : f("", !0),
                    _("span", Sl, h(t.label), 1)
                  ], 10, $l)
                ], !0)), 128)) : (n(), c("div", Vl, [
                  N(B, {
                    name: "inbox",
                    size: "2xl",
                    class: "nm-select__empty-icon"
                  }),
                  _("span", null, h(Je.value), 1)
                ]))
              ], 46, Tl)) : f("", !0)
            ]),
            _: 3
          })
        ], 8, ["disabled"]))
      ], 46, yl),
      N(bl, {
        id: `${a(b)}-error`,
        message: a(ze)
      }, null, 8, ["id", "message"])
    ]));
  }
}), Wl = /* @__PURE__ */ _l(Fl, [["__scopeId", "data-v-aa3d19bb"]]);
export {
  Wl as N
};

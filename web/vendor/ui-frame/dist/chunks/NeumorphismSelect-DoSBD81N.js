import { defineComponent as Xe, computed as o, ref as B, watch as se, nextTick as ie, onBeforeUnmount as Ye, openBlock as n, createElementBlock as r, createVNode as q, unref as t, createElementVNode as u, normalizeClass as _, withModifiers as T, Fragment as F, renderList as E, createBlock as K, withCtx as G, createTextVNode as Z, toDisplayString as y, createCommentVNode as b, renderSlot as U, Teleport as el, Transition as ll, normalizeStyle as tl } from "vue";
import { useSelect as al } from "../composables/useSelect.js";
import { useFormField as ol } from "../composables/useFormField.js";
import { useConfig as nl } from "../composables/useConfig.js";
import sl from "../composables/useFloatingPosition.js";
import { useLocale as il } from "../composables/useLocale.js";
import { useZIndex as rl } from "../composables/useZIndex.js";
import { N as ul } from "./NeumorphismFieldLabel-CBF1nZs1.js";
import { N as dl } from "./NeumorphismFieldError-BxamHjhs.js";
import { N as re } from "./NeumorphismTag-DrOOT-gC.js";
import { _ as cl } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismSelect.css';const vl = { class: "nm-select__wrapper" }, ml = ["tabindex", "role", "aria-expanded", "aria-haspopup", "aria-controls", "aria-activedescendant", "aria-labelledby", "aria-label"], pl = { class: "nm-select__face" }, fl = ["value", "placeholder", "disabled", "readonly", "aria-expanded", "aria-controls", "aria-activedescendant", "aria-labelledby", "aria-label"], bl = { class: "nm-select__actions" }, hl = ["aria-label"], gl = {
  key: 1,
  class: "nm-select__spinner",
  width: "16",
  height: "16",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2",
  "aria-hidden": "true"
}, _l = ["id", "aria-label", "aria-multiselectable"], yl = {
  key: 0,
  class: "nm-select__loading"
}, xl = {
  key: 0,
  class: "nm-select__group-title",
  "aria-hidden": "true"
}, wl = ["id", "aria-selected", "aria-disabled", "onClick"], kl = {
  key: 0,
  width: "10",
  height: "10",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "3.5"
}, Cl = { class: "nm-select__option-label" }, Bl = ["id", "aria-selected", "aria-disabled", "onClick"], Tl = {
  key: 0,
  width: "10",
  height: "10",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "3.5"
}, Ll = { class: "nm-select__option-label" }, $l = {
  key: 3,
  class: "nm-select__option nm-select__option--empty nm-select__empty"
}, Vl = 6, Ml = /* @__PURE__ */ Xe({
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
  setup(c, { expose: ue, emit: de }) {
    const i = c, M = nl(), { t: x } = il(), ce = o(() => {
      var e;
      return i.size ?? ((e = M.value.select) == null ? void 0 : e.size) ?? "medium";
    }), I = o(() => i.placeholder || x("selectPlaceholder")), ve = o(() => i.emptyText || x("selectEmpty")), me = o(() => i.clearLabel || x("selectClear")), pe = o(() => i.listLabel || x("selectListLabel")), fe = o(() => i.loadingText || x("selectLoading")), d = o(() => {
      var e;
      return i.multiple ?? ((e = M.value.select) == null ? void 0 : e.multiple) ?? !1;
    }), v = o(
      () => {
        var e;
        return i.filterable ?? ((e = M.value.select) == null ? void 0 : e.filterable) ?? !1;
      }
    ), be = o(
      () => {
        var e;
        return i.collapseTags ?? ((e = M.value.select) == null ? void 0 : e.collapseTags) ?? !1;
      }
    ), w = o(() => {
      var e;
      return i.variant ?? ((e = M.value.select) == null ? void 0 : e.variant) ?? "default";
    }), g = de, he = o({
      get: () => i.modelValue,
      set: (e) => {
        g("update:modelValue", e), g("change", e);
      }
    }), L = B(""), {
      isOpen: m,
      selectedOption: k,
      selectedOptions: P,
      filteredOptions: N,
      groupedOptions: O,
      activeValue: z,
      isSelected: f,
      toggleOpen: ge,
      selectOption: R,
      removeValue: _e,
      clearValue: ye,
      handleKeydown: xe,
      handleBlur: we
    } = al({
      modelValue: he,
      options: o(() => i.options),
      disabled: o(() => i.disabled),
      multiple: d,
      filterText: L
    }), { fieldId: h, errorMessage: ke, hasError: Ce, baseClassList: Be, handleFocus: W, handleBlur: Te } = ol(
      () => ({
        id: i.id,
        size: ce.value,
        disabled: i.disabled,
        error: i.error,
        prefix: "select"
      })
    ), $ = o(
      () => d.value ? P.value.length > 0 : i.modelValue !== "" && i.modelValue !== void 0 && i.modelValue !== null
    ), S = B(!1), A = B(!1), Le = o(() => [
      ...Be("nm-select").value,
      {
        "nm-select--open": S.value,
        "nm-select--has-value": $.value,
        "nm-select--multiple": d.value,
        "nm-select--filterable": v.value,
        "nm-select--outlined": w.value === "outlined",
        // 向上翻转：盒体 column-reverse + 负 margin-top 补偿 + 投影镜像
        "nm-select--drop-up": S.value && V.value === "top",
        // 发光时序独立于几何（--open）：与面板动画同生共灭 ——
        // 展开时随面板抽出淡入，收起时随面板抽回同时开始淡出，与展开严格对称
        "nm-select--glowing": m.value,
        "nm-select--settled": A.value
      }
    ]), j = o(
      () => be.value ? P.value.slice(0, i.maxCollapseTags) : P.value
    ), J = o(() => P.value.length - j.value.length);
    function $e(e) {
      _e(e), g("remove-tag", e);
    }
    const D = B(), Ve = o(() => {
      var e;
      return d.value || m.value ? L.value : ((e = k.value) == null ? void 0 : e.label) ?? "";
    }), Me = o(() => {
      var e;
      return d.value ? $.value ? "" : I.value : ((e = k.value) == null ? void 0 : e.label) || I.value;
    }), Ie = o(
      () => !d.value && !m.value && v.value
    );
    function Ne(e) {
      const l = e.target.value;
      L.value = l, g("search", l), m.value || (m.value = !0);
    }
    function Se(e) {
      W(e, g), m.value || (m.value = !0);
    }
    function Q(e) {
      v.value && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey || xe(e);
    }
    const p = B();
    function Fe() {
      var e;
      if (!i.disabled) {
        if (v.value) {
          (e = D.value) == null || e.focus(), m.value = !0;
          return;
        }
        ge();
      }
    }
    function Pe(e) {
      e.stopPropagation(), ye();
    }
    function Oe() {
      var e;
      (e = v.value ? D.value : p.value) == null || e.focus();
    }
    function ze() {
      var e;
      (e = v.value ? D.value : p.value) == null || e.blur();
    }
    ue({ focus: Oe, blur: ze });
    const C = B(), X = o(() => w.value === "outlined" ? 0 : Vl), Y = B(0);
    function Re() {
      if (!p.value) return;
      if (w.value !== "outlined") {
        p.value.style.marginBottom = "", p.value.style.marginTop = "";
        return;
      }
      const e = Math.max(p.value.offsetHeight - Y.value, 0);
      p.value.style.marginBottom = V.value === "top" ? "0px" : `${-e}px`, p.value.style.marginTop = V.value === "top" ? `${-e}px` : "0px";
    }
    const {
      actualPlacement: V,
      rect: De,
      available: Ee,
      refresh: Ae,
      stop: ee
    } = sl({
      trigger: p,
      // 追踪存续期跟随 visualOpen —— 收起动画期间（isOpen 已 false）
      // 仍需逐帧同步负 margin 与位置，直到 @after-leave 停止
      open: S,
      placement: o(() => "bottom"),
      offset: X,
      floating: C,
      candidates: ["bottom", "top"],
      // outlined 单盒会随展开长高 —— 逐帧判向会把盒底增长误判为空间不足，
      // 展开中途翻转（下拉从下方瞬跳到上方）。锁定为打开时一次性决策；
      // default 浮层翻转廉价，保留滚动中的滞后翻转
      lockPlacement: o(() => w.value === "outlined"),
      onFrame: Re
    });
    function le() {
      var l;
      if (!C.value) return;
      const e = C.value.querySelector(".nm-select__option--active") || C.value.querySelector(".nm-select__option--selected");
      (l = e == null ? void 0 : e.scrollIntoView) == null || l.call(e, { block: "nearest" });
    }
    se([k, z], () => {
      m.value && ie(le);
    });
    function H(e) {
      var a, s;
      const l = e.target;
      (a = p.value) != null && a.contains(l) || (s = C.value) != null && s.contains(l) || (m.value = !1);
    }
    se(m, (e) => {
      var l;
      g("visible-change", e), typeof document < "u" && (e ? document.addEventListener("pointerdown", H, !0) : document.removeEventListener("pointerdown", H, !0)), e ? (S.value = !0, Y.value = ((l = p.value) == null ? void 0 : l.offsetHeight) ?? 0, ie(() => {
        Ae(), le();
      })) : (L.value = "", A.value = !1);
    });
    function He() {
      S.value = !1, ee(), p.value && (p.value.style.marginBottom = "", p.value.style.marginTop = "");
    }
    Ye(() => {
      ee(), typeof document < "u" && document.removeEventListener("pointerdown", H, !0);
    });
    const { getZIndex: qe } = rl(), Ke = o(() => Math.max(Ee.value, 72)), Ge = o(() => {
      const e = `min(var(--nm-select-dropdown-max-height), ${Ke.value}px)`;
      if (w.value === "outlined")
        return { maxHeight: e };
      const l = De.value, a = X.value;
      return {
        position: "fixed",
        top: V.value === "bottom" ? `${((l == null ? void 0 : l.bottom) ?? 0) + a}px` : void 0,
        bottom: V.value === "top" ? `${typeof window < "u" ? window.innerHeight - ((l == null ? void 0 : l.top) ?? 0) + a : 0}px` : void 0,
        left: `${(l == null ? void 0 : l.left) ?? 0}px`,
        width: `${(l == null ? void 0 : l.width) ?? 0}px`,
        maxHeight: e,
        zIndex: qe("dropdown")
      };
    }), Ze = o(
      () => O.value.length > 1 || O.value.length === 1 && O.value[0].name !== ""
    );
    function te(e) {
      return N.value.indexOf(e);
    }
    function ae(e) {
      return `${h}-opt-${te(e)}`;
    }
    const oe = o(() => {
      var a;
      const e = d.value ? z.value : (a = k.value) == null ? void 0 : a.value;
      if (e === void 0) return;
      const l = N.value.findIndex((s) => s.value === e);
      return l >= 0 ? `${h}-opt-${l}` : void 0;
    }), Ue = o(
      () => L.value.trim() ? x("selectNoMatch") : ve.value
    ), We = o(
      () => !v.value && !(d.value && $.value)
    ), je = o(
      () => {
        var e;
        return d.value ? I.value : ((e = k.value) == null ? void 0 : e.label) || I.value;
      }
    ), Je = o(
      () => d.value ? !$.value : !k.value
    );
    function ne(e) {
      var l;
      (l = C.value) != null && l.contains(e.relatedTarget) || (we(e.relatedTarget, e.currentTarget), Te(e, g));
    }
    return (e, l) => (n(), r("div", vl, [
      q(ul, {
        label: c.label,
        required: c.required,
        "for-id": t(h)
      }, null, 8, ["label", "required", "for-id"]),
      u("div", {
        ref_key: "triggerRef",
        ref: p,
        class: _(Le.value),
        tabindex: c.disabled || v.value ? -1 : 0,
        role: v.value ? void 0 : "combobox",
        "aria-expanded": v.value ? void 0 : t(m),
        "aria-haspopup": v.value ? void 0 : "listbox",
        "aria-controls": v.value ? void 0 : `${t(h)}-listbox`,
        "aria-activedescendant": v.value ? void 0 : oe.value,
        "aria-labelledby": !v.value && c.label ? t(h) : void 0,
        "aria-label": !v.value && !c.label ? I.value : void 0,
        onClick: Fe,
        onFocus: l[6] || (l[6] = (a) => t(W)(a, g)),
        onBlur: ne,
        onKeydown: Q
      }, [
        u("div", pl, [
          d.value && $.value ? (n(), r("span", {
            key: 0,
            class: "nm-select__tags",
            onMousedown: l[0] || (l[0] = T(() => {
            }, ["prevent"]))
          }, [
            (n(!0), r(F, null, E(j.value, (a) => (n(), K(re, {
              key: a.value,
              size: "small",
              closable: !c.disabled,
              onClose: (s) => $e(a.value)
            }, {
              default: G(() => [
                Z(y(a.label), 1)
              ]),
              _: 2
            }, 1032, ["closable", "onClose"]))), 128)),
            J.value > 0 ? (n(), K(re, {
              key: 0,
              size: "small",
              class: "nm-select__tag-collapse"
            }, {
              default: G(() => [
                Z(" +" + y(J.value), 1)
              ]),
              _: 1
            })) : b("", !0)
          ], 32)) : b("", !0),
          v.value ? (n(), r("input", {
            key: 1,
            ref_key: "filterInputRef",
            ref: D,
            class: "nm-select__input",
            value: Ve.value,
            placeholder: Me.value,
            disabled: c.disabled,
            readonly: Ie.value,
            role: "combobox",
            "aria-expanded": t(m),
            "aria-haspopup": "listbox",
            "aria-controls": `${t(h)}-listbox`,
            "aria-activedescendant": oe.value,
            "aria-labelledby": c.label ? t(h) : void 0,
            "aria-label": c.label ? void 0 : t(x)("selectSearchLabel"),
            "aria-autocomplete": "list",
            onInput: Ne,
            onFocus: Se,
            onBlur: ne,
            onKeydown: Q
          }, null, 40, fl)) : We.value ? (n(), r("span", {
            key: 2,
            class: _(["nm-select__value", { "nm-select__value--placeholder": Je.value }])
          }, [
            U(e.$slots, "value", { option: t(k) }, () => [
              Z(y(je.value), 1)
            ], !0)
          ], 2)) : b("", !0),
          u("span", bl, [
            c.clearable && $.value && !c.loading && !c.disabled ? (n(), r("button", {
              key: 0,
              class: "nm-select__clear",
              type: "button",
              "aria-label": me.value,
              onMousedown: l[1] || (l[1] = T(() => {
              }, ["prevent"])),
              onClick: Pe
            }, [...l[7] || (l[7] = [
              u("svg", {
                width: "14",
                height: "14",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                "stroke-width": "2"
              }, [
                u("path", { d: "M18 6L6 18M6 6l12 12" })
              ], -1)
            ])], 40, hl)) : b("", !0),
            c.loading ? (n(), r("svg", gl, [...l[8] || (l[8] = [
              u("path", { d: "M12 2a10 10 0 1 0 10 10" }, null, -1)
            ])])) : (n(), r("svg", {
              key: 2,
              class: _(["nm-select__arrow", { "nm-select__arrow--open": t(m) }]),
              width: "16",
              height: "16",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              "stroke-width": "2"
            }, [...l[9] || (l[9] = [
              u("path", { d: "M6 9l6 6 6-6" }, null, -1)
            ])], 2))
          ])
        ]),
        (n(), K(el, {
          to: "body",
          disabled: w.value === "outlined"
        }, [
          q(ll, {
            name: "nm-select-dropdown",
            onAfterEnter: l[5] || (l[5] = (a) => A.value = !0),
            onAfterLeave: He
          }, {
            default: G(() => [
              t(m) ? (n(), r("div", {
                key: 0,
                id: `${t(h)}-listbox`,
                ref_key: "dropdownRef",
                ref: C,
                class: _(["nm-select__dropdown", {
                  "nm-select__dropdown--up": t(V) === "top",
                  "nm-select__dropdown--multiple": d.value,
                  "nm-select__dropdown--outlined": w.value === "outlined",
                  "nm-select__dropdown--error": t(Ce)
                }]),
                role: "listbox",
                "aria-label": c.label || pe.value,
                "aria-multiselectable": d.value || void 0,
                style: tl(Ge.value),
                onMousedown: l[3] || (l[3] = T(() => {
                }, ["prevent"])),
                onClick: l[4] || (l[4] = T(() => {
                }, ["stop"]))
              }, [
                c.loading ? (n(), r("div", yl, [
                  l[10] || (l[10] = u("svg", {
                    class: "nm-select__loading-icon",
                    width: "16",
                    height: "16",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    "stroke-width": "2",
                    "aria-hidden": "true"
                  }, [
                    u("path", { d: "M12 2a10 10 0 1 0 10 10" })
                  ], -1)),
                  u("span", null, y(fe.value), 1)
                ])) : Ze.value && t(N).length > 0 ? (n(!0), r(F, { key: 1 }, E(t(O), (a) => (n(), r(F, {
                  key: a.name || "__ungrouped__"
                }, [
                  a.name ? (n(), r("div", xl, y(a.name), 1)) : b("", !0),
                  (n(!0), r(F, null, E(a.options, (s) => U(e.$slots, "option", {
                    key: s.value,
                    option: s,
                    selected: t(f)(s),
                    index: te(s),
                    select: t(R)
                  }, () => [
                    u("div", {
                      id: ae(s),
                      class: _(["nm-select__option", {
                        "nm-select__option--selected": t(f)(s),
                        "nm-select__option--disabled": s.disabled,
                        "nm-select__option--active": d.value && s.value === t(z)
                      }]),
                      role: "option",
                      "aria-selected": t(f)(s),
                      "aria-disabled": s.disabled,
                      onMousedown: l[2] || (l[2] = T(() => {
                      }, ["prevent"])),
                      onClick: T((Qe) => t(R)(s), ["stop"])
                    }, [
                      d.value ? (n(), r("span", {
                        key: 0,
                        class: _(["nm-select__checkbox", { "nm-select__checkbox--checked": t(f)(s) }]),
                        "aria-hidden": "true"
                      }, [
                        t(f)(s) ? (n(), r("svg", kl, [...l[11] || (l[11] = [
                          u("path", { d: "M20 6L9 17l-5-5" }, null, -1)
                        ])])) : b("", !0)
                      ], 2)) : b("", !0),
                      u("span", Cl, y(s.label), 1)
                    ], 42, wl)
                  ], !0)), 128))
                ], 64))), 128)) : t(N).length > 0 ? (n(!0), r(F, { key: 2 }, E(t(N), (a, s) => U(e.$slots, "option", {
                  key: a.value,
                  option: a,
                  selected: t(f)(a),
                  index: s,
                  select: t(R)
                }, () => [
                  u("div", {
                    id: ae(a),
                    class: _(["nm-select__option", {
                      "nm-select__option--selected": t(f)(a),
                      "nm-select__option--disabled": a.disabled,
                      "nm-select__option--active": d.value && a.value === t(z)
                    }]),
                    role: "option",
                    "aria-selected": t(f)(a),
                    "aria-disabled": a.disabled,
                    onClick: T((Qe) => t(R)(a), ["stop"])
                  }, [
                    d.value ? (n(), r("span", {
                      key: 0,
                      class: _(["nm-select__checkbox", { "nm-select__checkbox--checked": t(f)(a) }]),
                      "aria-hidden": "true"
                    }, [
                      t(f)(a) ? (n(), r("svg", Tl, [...l[12] || (l[12] = [
                        u("path", { d: "M20 6L9 17l-5-5" }, null, -1)
                      ])])) : b("", !0)
                    ], 2)) : b("", !0),
                    u("span", Ll, y(a.label), 1)
                  ], 10, Bl)
                ], !0)), 128)) : (n(), r("div", $l, [
                  l[13] || (l[13] = u("svg", {
                    class: "nm-select__empty-icon",
                    width: "24",
                    height: "24",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    "stroke-width": "1.5",
                    "aria-hidden": "true"
                  }, [
                    u("path", { d: "M22 12h-6l-2 3h-4l-2-3H2" }),
                    u("path", { d: "M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" })
                  ], -1)),
                  u("span", null, y(Ue.value), 1)
                ]))
              ], 46, _l)) : b("", !0)
            ]),
            _: 3
          })
        ], 8, ["disabled"]))
      ], 42, ml),
      q(dl, {
        id: `${t(h)}-error`,
        message: t(ke)
      }, null, 8, ["id", "message"])
    ]));
  }
}), Hl = /* @__PURE__ */ cl(Ml, [["__scopeId", "data-v-3d71b7f9"]]);
export {
  Hl as N
};

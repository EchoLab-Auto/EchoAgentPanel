import { defineComponent as _e, computed as o, ref as x, watch as ge, openBlock as v, createElementBlock as p, createVNode as u, unref as n, createCommentVNode as K, withCtx as W, createElementVNode as s, normalizeStyle as De, normalizeClass as S, toDisplayString as g, Fragment as J, renderList as H, nextTick as Pe } from "vue";
import { useDatePicker as Me } from "../composables/useDatePicker.js";
import { useFormField as we } from "../composables/useFormField.js";
import { u as xe } from "./createComponent-jnXBYqCm.js";
import { useLocale as Ce } from "../composables/useLocale.js";
import { n as Ne, r as ze, F as Fe } from "./controlScales-CPj0Htdh.js";
import { N as Se } from "./NeumorphismFieldLabel-C3S1Ax2f.js";
import { N as Le } from "./NeumorphismFieldError-BxamHjhs.js";
import { N as Ee } from "./NeumorphismPopover-m8EjDIRe.js";
import { N as D } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as Te } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismDatePicker.css';const Ae = { class: "nm-datepicker__wrapper" }, Ve = ["name", "value"], Ie = ["tabindex", "aria-label", "aria-expanded", "aria-controls"], Be = { class: "nm-datepicker__actions" }, Ye = ["aria-label"], $e = ["aria-label"], Re = { class: "nm-datepicker__header" }, qe = ["aria-label"], Oe = ["aria-label"], Ke = { class: "nm-datepicker__header-label" }, We = ["aria-label"], Je = ["aria-label"], He = { class: "nm-datepicker__weekdays" }, Ue = ["id"], Xe = ["disabled", "tabindex", "aria-label", "aria-selected", "aria-current", "onClick", "onFocus"], Ze = { class: "nm-datepicker__footer" }, je = 48, Ge = /* @__PURE__ */ _e({
  __name: "NeumorphismDatePicker",
  props: {
    modelValue: { default: null },
    placeholder: { default: "" },
    format: {},
    disabled: { type: Boolean, default: !1 },
    clearable: { type: Boolean, default: void 0 },
    size: {},
    minDate: {},
    maxDate: {},
    firstDayOfWeek: {},
    label: {},
    required: { type: Boolean },
    error: { type: [String, Boolean] },
    name: {},
    id: {}
  },
  emits: ["update:modelValue", "change", "focus", "blur"],
  setup(c, { emit: U }) {
    const d = c, f = U, { config: b, resolveProp: L } = xe(), { t: r } = Ce(), C = o(() => {
      var t;
      const e = d.size ?? ((t = b.value.datePicker) == null ? void 0 : t.size);
      return typeof e == "number" ? Ne(e, je) : void 0;
    }), X = o(() => {
      var t;
      const e = d.size ?? ((t = b.value.datePicker) == null ? void 0 : t.size);
      return typeof e == "string" ? e : "medium";
    }), Z = o(
      () => C.value === void 0 ? void 0 : ze(Fe, C.value)
    ), j = o(
      () => {
        var e;
        return L(d.format, (e = b.value.datePicker) == null ? void 0 : e.format, "yyyy-MM-dd");
      }
    ), E = o(
      () => {
        var e;
        return d.placeholder || ((e = b.value.datePicker) == null ? void 0 : e.placeholder) || r("datePickerPlaceholder");
      }
    ), G = o(
      () => {
        var e;
        return L(d.clearable, (e = b.value.datePicker) == null ? void 0 : e.clearable, !0);
      }
    ), Q = o(() => r("datePickerClear")), ee = o(() => r("datePickerToday")), ae = o(() => r("datePickerPrevMonth")), te = o(() => r("datePickerNextMonth")), re = o(() => r("datePickerPrevYear")), oe = o(() => r("datePickerNextYear")), ne = o({
      get: () => d.modelValue ?? null,
      set: (e) => {
        f("update:modelValue", e), f("change", e);
      }
    }), {
      currentYear: T,
      currentMonth: A,
      calendarDays: k,
      weekdays: ie,
      selectedDate: h,
      selectDate: N,
      prevMonth: V,
      nextMonth: I,
      prevYear: B,
      nextYear: Y,
      formatDate: le,
      goToToday: se
    } = Me({
      modelValue: ne,
      minDate: o(() => d.minDate),
      maxDate: o(() => d.maxDate),
      format: j,
      firstDayOfWeek: o(() => {
        var e;
        return d.firstDayOfWeek ?? ((e = b.value.datePicker) == null ? void 0 : e.firstDayOfWeek);
      })
    }), { fieldId: P, errorMessage: de, baseClassList: ce, handleFocus: ue, handleBlur: me } = we(() => ({
      id: d.id,
      // 数字直接交给 useFormField 判 `--sized` 档；它只决定 class，几何量在内联变量里
      size: C.value ?? X.value,
      disabled: d.disabled,
      error: d.error,
      prefix: "datepicker"
    })), y = x(), M = x(!1);
    function ve(e) {
      M.value = e;
    }
    function pe(e) {
      var t;
      e.isDisabled || (N(e.date), (t = y.value) == null || t.hide(), F());
    }
    function fe() {
      var t;
      const e = /* @__PURE__ */ new Date();
      e.setHours(0, 0, 0, 0), N(e), se(), (t = y.value) == null || t.hide();
    }
    function be(e) {
      e.stopPropagation(), f("update:modelValue", null), f("change", null);
    }
    ge(h, (e) => {
      e && (T.value = e.getFullYear(), A.value = e.getMonth() + 1);
    });
    const $ = o(() => h.value ? le(h.value) : ""), ke = o(() => [
      ...ce("nm-datepicker").value,
      {
        "nm-datepicker--open": M.value,
        "nm-datepicker--has-value": h.value !== null
      }
    ]), z = o(() => {
      const e = T.value, t = A.value, a = [
        r("datePickerMonth1") || "January",
        r("datePickerMonth2") || "February",
        r("datePickerMonth3") || "March",
        r("datePickerMonth4") || "April",
        r("datePickerMonth5") || "May",
        r("datePickerMonth6") || "June",
        r("datePickerMonth7") || "July",
        r("datePickerMonth8") || "August",
        r("datePickerMonth9") || "September",
        r("datePickerMonth10") || "October",
        r("datePickerMonth11") || "November",
        r("datePickerMonth12") || "December"
      ];
      return { year: e, monthName: a[t - 1] };
    }), i = x(-1), R = x();
    function F() {
      var e;
      (e = R.value) == null || e.focus();
    }
    function q(e = 5) {
      var a;
      const t = (a = document.getElementById(`${P}-grid`)) == null ? void 0 : a.querySelector('.nm-datepicker__day[tabindex="0"]');
      if (t) {
        t.focus();
        return;
      }
      e > 0 && M.value && typeof window < "u" && window.requestAnimationFrame(() => q(e - 1));
    }
    function he(e) {
      var t, a;
      d.disabled || (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") && (e.preventDefault(), i.value === -1 && (i.value = k.value.findIndex((l) => l.isCurrentMonth && !l.isDisabled)), (a = (t = y.value) == null ? void 0 : t.show) == null || a.call(t), Pe(() => q()));
    }
    function ye(e) {
      var l, m, w, O;
      const t = k.value.length;
      if (t === 0) return;
      i.value === -1 && (i.value = k.value.findIndex((_) => _.isCurrentMonth && !_.isDisabled));
      let a = i.value;
      switch (e.key) {
        case "ArrowRight":
          a = Math.min(t - 1, i.value + 1);
          break;
        case "ArrowLeft":
          a = Math.max(0, i.value - 1);
          break;
        case "ArrowDown":
          a = Math.min(t - 1, i.value + 7);
          break;
        case "ArrowUp":
          a = Math.max(0, i.value - 7);
          break;
        case "Home":
          a = i.value - i.value % 7;
          break;
        case "End":
          a = i.value + (6 - i.value % 7);
          break;
        case "Enter":
        case " ": {
          const _ = k.value[i.value];
          _ && !_.isDisabled && (N(_.date), (m = (l = y.value) == null ? void 0 : l.hide) == null || m.call(l), F()), e.preventDefault();
          return;
        }
        case "Escape":
          (O = (w = y.value) == null ? void 0 : w.hide) == null || O.call(w), F(), e.preventDefault();
          return;
        default:
          return;
      }
      e.preventDefault(), a >= 0 && a < t && !k.value[a].isDisabled && (i.value = a);
    }
    return (e, t) => (v(), p("div", Ae, [
      u(Se, {
        label: c.label,
        required: c.required,
        "for-id": n(P)
      }, null, 8, ["label", "required", "for-id"]),
      c.name ? (v(), p("input", {
        key: 0,
        type: "hidden",
        name: c.name,
        value: $.value
      }, null, 8, Ve)) : K("", !0),
      u(Ee, {
        ref_key: "popoverRef",
        ref: y,
        disabled: c.disabled,
        width: "trigger",
        "show-arrow": !1,
        trigger: "click",
        onVisibleChange: ve
      }, {
        content: W(() => [
          s("div", {
            class: "nm-datepicker__calendar",
            role: "dialog",
            "aria-label": c.label || "Date picker"
          }, [
            s("div", Re, [
              s("button", {
                class: "nm-datepicker__nav-btn",
                type: "button",
                "aria-label": re.value,
                onClick: t[2] || (t[2] = //@ts-ignore
                (...a) => n(B) && n(B)(...a))
              }, [
                u(D, {
                  name: "chevrons-left",
                  size: "sm"
                })
              ], 8, qe),
              s("button", {
                class: "nm-datepicker__nav-btn",
                type: "button",
                "aria-label": ae.value,
                onClick: t[3] || (t[3] = //@ts-ignore
                (...a) => n(V) && n(V)(...a))
              }, [
                u(D, {
                  name: "chevron-left",
                  size: "sm"
                })
              ], 8, Oe),
              s("span", Ke, g(z.value.monthName) + " " + g(z.value.year), 1),
              s("button", {
                class: "nm-datepicker__nav-btn",
                type: "button",
                "aria-label": te.value,
                onClick: t[4] || (t[4] = //@ts-ignore
                (...a) => n(I) && n(I)(...a))
              }, [
                u(D, {
                  name: "chevron-right",
                  size: "sm"
                })
              ], 8, We),
              s("button", {
                class: "nm-datepicker__nav-btn",
                type: "button",
                "aria-label": oe.value,
                onClick: t[5] || (t[5] = //@ts-ignore
                (...a) => n(Y) && n(Y)(...a))
              }, [
                u(D, {
                  name: "chevrons-right",
                  size: "sm"
                })
              ], 8, Je)
            ]),
            s("div", He, [
              (v(!0), p(J, null, H(n(ie), (a, l) => (v(), p("span", {
                key: l,
                class: "nm-datepicker__weekday"
              }, g(a), 1))), 128))
            ]),
            s("div", {
              id: `${n(P)}-grid`,
              class: "nm-datepicker__days",
              role: "grid",
              onKeydown: ye
            }, [
              (v(!0), p(J, null, H(n(k), (a, l) => (v(), p("button", {
                key: l,
                ref_for: !0,
                ref: (m) => {
                  l === i.value && m && m.focus();
                },
                class: S(["nm-datepicker__day", {
                  "nm-datepicker__day--other-month": !a.isCurrentMonth,
                  "nm-datepicker__day--today": a.isToday,
                  "nm-datepicker__day--selected": a.isSelected,
                  "nm-datepicker__day--disabled": a.isDisabled,
                  "nm-datepicker__day--in-range": a.isInRange
                }]),
                type: "button",
                disabled: a.isDisabled,
                tabindex: l === i.value ? 0 : -1,
                role: "gridcell",
                "aria-label": `${z.value.monthName} ${a.day}, ${a.date.getFullYear()}`,
                "aria-selected": a.isSelected,
                "aria-current": a.isToday ? "date" : void 0,
                onClick: (m) => pe(a),
                onFocus: (m) => i.value = l
              }, g(a.day), 43, Xe))), 128))
            ], 40, Ue),
            s("div", Ze, [
              s("button", {
                class: "nm-datepicker__today-btn",
                type: "button",
                onClick: fe
              }, g(ee.value), 1)
            ])
          ], 8, $e)
        ]),
        default: W(() => [
          s("div", {
            ref_key: "triggerRef",
            ref: R,
            class: S(ke.value),
            style: De(Z.value),
            tabindex: c.disabled ? -1 : 0,
            "aria-label": c.label || E.value,
            role: "combobox",
            "aria-expanded": M.value,
            "aria-haspopup": "dialog",
            "aria-controls": `${n(P)}-grid`,
            onFocus: t[0] || (t[0] = (a) => n(ue)(a, f)),
            onBlur: t[1] || (t[1] = (a) => n(me)(a, f)),
            onKeydown: he
          }, [
            s("span", {
              class: S(["nm-datepicker__value", { "nm-datepicker__value--placeholder": !n(h) }])
            }, g($.value || E.value), 3),
            s("span", Be, [
              G.value && n(h) ? (v(), p("button", {
                key: 0,
                class: "nm-datepicker__clear",
                type: "button",
                "aria-label": Q.value,
                onClick: be
              }, [
                u(D, {
                  name: "close",
                  size: "sm"
                })
              ], 8, Ye)) : K("", !0),
              u(D, {
                name: "calendar",
                size: "md",
                class: "nm-datepicker__icon"
              })
            ])
          ], 46, Ie)
        ]),
        _: 1
      }, 8, ["disabled"]),
      u(Le, {
        id: `${n(P)}-error`,
        message: n(de)
      }, null, 8, ["id", "message"])
    ]));
  }
}), ca = /* @__PURE__ */ Te(Ge, [["__scopeId", "data-v-b66c7839"]]);
export {
  ca as N
};

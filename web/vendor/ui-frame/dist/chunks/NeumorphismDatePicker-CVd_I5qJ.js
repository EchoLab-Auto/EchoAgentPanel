import { defineComponent as he, computed as l, ref as x, watch as ye, openBlock as v, createElementBlock as p, createVNode as u, unref as o, createCommentVNode as O, withCtx as K, createElementVNode as s, normalizeClass as L, toDisplayString as _, Fragment as W, renderList as J, nextTick as _e } from "vue";
import { useDatePicker as ge } from "../composables/useDatePicker.js";
import { useFormField as De } from "../composables/useFormField.js";
import { u as Pe } from "./createComponent-jnXBYqCm.js";
import { useLocale as Me } from "../composables/useLocale.js";
import { N as we } from "./NeumorphismFieldLabel-C3S1Ax2f.js";
import { N as xe } from "./NeumorphismFieldError-BxamHjhs.js";
import { N as Ce } from "./NeumorphismPopover-m8EjDIRe.js";
import { N as g } from "./NeumorphismIcon-CFyBR-Sk.js";
import { _ as Ne } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismDatePicker.css';const Fe = { class: "nm-datepicker__wrapper" }, ze = ["name", "value"], Le = ["tabindex", "aria-label", "aria-expanded", "aria-controls"], Te = { class: "nm-datepicker__actions" }, Ve = ["aria-label"], Ae = ["aria-label"], Be = { class: "nm-datepicker__header" }, Ye = ["aria-label"], $e = ["aria-label"], Ee = { class: "nm-datepicker__header-label" }, Ie = ["aria-label"], Se = ["aria-label"], Re = { class: "nm-datepicker__weekdays" }, qe = ["id"], Oe = ["disabled", "tabindex", "aria-label", "aria-selected", "aria-current", "onClick", "onFocus"], Ke = { class: "nm-datepicker__footer" }, We = /* @__PURE__ */ he({
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
  setup(c, { emit: H }) {
    const d = c, b = H, { config: D, resolveProp: C } = Pe(), { t: r } = Me(), U = l(
      () => {
        var e;
        return C(d.size, (e = D.value.datePicker) == null ? void 0 : e.size, "medium");
      }
    ), j = l(
      () => {
        var e;
        return C(d.format, (e = D.value.datePicker) == null ? void 0 : e.format, "yyyy-MM-dd");
      }
    ), T = l(
      () => {
        var e;
        return d.placeholder || ((e = D.value.datePicker) == null ? void 0 : e.placeholder) || r("datePickerPlaceholder");
      }
    ), G = l(
      () => {
        var e;
        return C(d.clearable, (e = D.value.datePicker) == null ? void 0 : e.clearable, !0);
      }
    ), Q = l(() => r("datePickerClear")), X = l(() => r("datePickerToday")), Z = l(() => r("datePickerPrevMonth")), ee = l(() => r("datePickerNextMonth")), ae = l(() => r("datePickerPrevYear")), te = l(() => r("datePickerNextYear")), re = l({
      get: () => d.modelValue ?? null,
      set: (e) => {
        b("update:modelValue", e), b("change", e);
      }
    }), {
      currentYear: V,
      currentMonth: A,
      calendarDays: k,
      weekdays: oe,
      selectedDate: f,
      selectDate: N,
      prevMonth: B,
      nextMonth: Y,
      prevYear: $,
      nextYear: E,
      formatDate: ne,
      goToToday: le
    } = ge({
      modelValue: re,
      minDate: l(() => d.minDate),
      maxDate: l(() => d.maxDate),
      format: j,
      firstDayOfWeek: l(() => {
        var e;
        return d.firstDayOfWeek ?? ((e = D.value.datePicker) == null ? void 0 : e.firstDayOfWeek);
      })
    }), { fieldId: P, errorMessage: ie, baseClassList: se, handleFocus: de, handleBlur: ce } = De(() => ({
      id: d.id,
      size: U.value,
      disabled: d.disabled,
      error: d.error,
      prefix: "datepicker"
    })), h = x(), M = x(!1);
    function ue(e) {
      M.value = e;
    }
    function me(e) {
      var t;
      e.isDisabled || (N(e.date), (t = h.value) == null || t.hide(), z());
    }
    function ve() {
      var t;
      const e = /* @__PURE__ */ new Date();
      e.setHours(0, 0, 0, 0), N(e), le(), (t = h.value) == null || t.hide();
    }
    function pe(e) {
      e.stopPropagation(), b("update:modelValue", null), b("change", null);
    }
    ye(f, (e) => {
      e && (V.value = e.getFullYear(), A.value = e.getMonth() + 1);
    });
    const I = l(() => f.value ? ne(f.value) : ""), be = l(() => [
      ...se("nm-datepicker").value,
      {
        "nm-datepicker--open": M.value,
        "nm-datepicker--has-value": f.value !== null
      }
    ]), F = l(() => {
      const e = V.value, t = A.value, a = [
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
    }), n = x(-1), S = x();
    function z() {
      var e;
      (e = S.value) == null || e.focus();
    }
    function R(e = 5) {
      var a;
      const t = (a = document.getElementById(`${P}-grid`)) == null ? void 0 : a.querySelector('.nm-datepicker__day[tabindex="0"]');
      if (t) {
        t.focus();
        return;
      }
      e > 0 && M.value && typeof window < "u" && window.requestAnimationFrame(() => R(e - 1));
    }
    function ke(e) {
      var t, a;
      d.disabled || (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") && (e.preventDefault(), n.value === -1 && (n.value = k.value.findIndex((i) => i.isCurrentMonth && !i.isDisabled)), (a = (t = h.value) == null ? void 0 : t.show) == null || a.call(t), _e(() => R()));
    }
    function fe(e) {
      var i, m, w, q;
      const t = k.value.length;
      if (t === 0) return;
      n.value === -1 && (n.value = k.value.findIndex((y) => y.isCurrentMonth && !y.isDisabled));
      let a = n.value;
      switch (e.key) {
        case "ArrowRight":
          a = Math.min(t - 1, n.value + 1);
          break;
        case "ArrowLeft":
          a = Math.max(0, n.value - 1);
          break;
        case "ArrowDown":
          a = Math.min(t - 1, n.value + 7);
          break;
        case "ArrowUp":
          a = Math.max(0, n.value - 7);
          break;
        case "Home":
          a = n.value - n.value % 7;
          break;
        case "End":
          a = n.value + (6 - n.value % 7);
          break;
        case "Enter":
        case " ": {
          const y = k.value[n.value];
          y && !y.isDisabled && (N(y.date), (m = (i = h.value) == null ? void 0 : i.hide) == null || m.call(i), z()), e.preventDefault();
          return;
        }
        case "Escape":
          (q = (w = h.value) == null ? void 0 : w.hide) == null || q.call(w), z(), e.preventDefault();
          return;
        default:
          return;
      }
      e.preventDefault(), a >= 0 && a < t && !k.value[a].isDisabled && (n.value = a);
    }
    return (e, t) => (v(), p("div", Fe, [
      u(we, {
        label: c.label,
        required: c.required,
        "for-id": o(P)
      }, null, 8, ["label", "required", "for-id"]),
      c.name ? (v(), p("input", {
        key: 0,
        type: "hidden",
        name: c.name,
        value: I.value
      }, null, 8, ze)) : O("", !0),
      u(Ce, {
        ref_key: "popoverRef",
        ref: h,
        disabled: c.disabled,
        width: "trigger",
        "show-arrow": !1,
        trigger: "click",
        onVisibleChange: ue
      }, {
        content: K(() => [
          s("div", {
            class: "nm-datepicker__calendar",
            role: "dialog",
            "aria-label": c.label || "Date picker"
          }, [
            s("div", Be, [
              s("button", {
                class: "nm-datepicker__nav-btn",
                type: "button",
                "aria-label": ae.value,
                onClick: t[2] || (t[2] = //@ts-ignore
                (...a) => o($) && o($)(...a))
              }, [
                u(g, {
                  name: "chevrons-left",
                  size: "sm"
                })
              ], 8, Ye),
              s("button", {
                class: "nm-datepicker__nav-btn",
                type: "button",
                "aria-label": Z.value,
                onClick: t[3] || (t[3] = //@ts-ignore
                (...a) => o(B) && o(B)(...a))
              }, [
                u(g, {
                  name: "chevron-left",
                  size: "sm"
                })
              ], 8, $e),
              s("span", Ee, _(F.value.monthName) + " " + _(F.value.year), 1),
              s("button", {
                class: "nm-datepicker__nav-btn",
                type: "button",
                "aria-label": ee.value,
                onClick: t[4] || (t[4] = //@ts-ignore
                (...a) => o(Y) && o(Y)(...a))
              }, [
                u(g, {
                  name: "chevron-right",
                  size: "sm"
                })
              ], 8, Ie),
              s("button", {
                class: "nm-datepicker__nav-btn",
                type: "button",
                "aria-label": te.value,
                onClick: t[5] || (t[5] = //@ts-ignore
                (...a) => o(E) && o(E)(...a))
              }, [
                u(g, {
                  name: "chevrons-right",
                  size: "sm"
                })
              ], 8, Se)
            ]),
            s("div", Re, [
              (v(!0), p(W, null, J(o(oe), (a, i) => (v(), p("span", {
                key: i,
                class: "nm-datepicker__weekday"
              }, _(a), 1))), 128))
            ]),
            s("div", {
              id: `${o(P)}-grid`,
              class: "nm-datepicker__days",
              role: "grid",
              onKeydown: fe
            }, [
              (v(!0), p(W, null, J(o(k), (a, i) => (v(), p("button", {
                key: i,
                ref_for: !0,
                ref: (m) => {
                  i === n.value && m && m.focus();
                },
                class: L(["nm-datepicker__day", {
                  "nm-datepicker__day--other-month": !a.isCurrentMonth,
                  "nm-datepicker__day--today": a.isToday,
                  "nm-datepicker__day--selected": a.isSelected,
                  "nm-datepicker__day--disabled": a.isDisabled,
                  "nm-datepicker__day--in-range": a.isInRange
                }]),
                type: "button",
                disabled: a.isDisabled,
                tabindex: i === n.value ? 0 : -1,
                role: "gridcell",
                "aria-label": `${F.value.monthName} ${a.day}, ${a.date.getFullYear()}`,
                "aria-selected": a.isSelected,
                "aria-current": a.isToday ? "date" : void 0,
                onClick: (m) => me(a),
                onFocus: (m) => n.value = i
              }, _(a.day), 43, Oe))), 128))
            ], 40, qe),
            s("div", Ke, [
              s("button", {
                class: "nm-datepicker__today-btn",
                type: "button",
                onClick: ve
              }, _(X.value), 1)
            ])
          ], 8, Ae)
        ]),
        default: K(() => [
          s("div", {
            ref_key: "triggerRef",
            ref: S,
            class: L(be.value),
            tabindex: c.disabled ? -1 : 0,
            "aria-label": c.label || T.value,
            role: "combobox",
            "aria-expanded": M.value,
            "aria-haspopup": "dialog",
            "aria-controls": `${o(P)}-grid`,
            onFocus: t[0] || (t[0] = (a) => o(de)(a, b)),
            onBlur: t[1] || (t[1] = (a) => o(ce)(a, b)),
            onKeydown: ke
          }, [
            s("span", {
              class: L(["nm-datepicker__value", { "nm-datepicker__value--placeholder": !o(f) }])
            }, _(I.value || T.value), 3),
            s("span", Te, [
              G.value && o(f) ? (v(), p("button", {
                key: 0,
                class: "nm-datepicker__clear",
                type: "button",
                "aria-label": Q.value,
                onClick: pe
              }, [
                u(g, {
                  name: "close",
                  size: "sm"
                })
              ], 8, Ve)) : O("", !0),
              u(g, {
                name: "calendar",
                size: "md",
                class: "nm-datepicker__icon"
              })
            ])
          ], 42, Le)
        ]),
        _: 1
      }, 8, ["disabled"]),
      u(xe, {
        id: `${o(P)}-error`,
        message: o(ie)
      }, null, 8, ["id", "message"])
    ]));
  }
}), ta = /* @__PURE__ */ Ne(We, [["__scopeId", "data-v-cd16bd0d"]]);
export {
  ta as N
};

import { defineComponent as he, computed as l, ref as D, watch as be, openBlock as m, createElementBlock as v, createVNode as B, unref as n, createCommentVNode as z, withCtx as O, createElementVNode as r, normalizeClass as F, toDisplayString as y, Fragment as K, renderList as W, nextTick as ye } from "vue";
import { useDatePicker as _e } from "../composables/useDatePicker.js";
import { useFormField as ge } from "../composables/useFormField.js";
import { u as we } from "./createComponent-jnXBYqCm.js";
import { useLocale as xe } from "../composables/useLocale.js";
import { N as De } from "./NeumorphismFieldLabel-C3S1Ax2f.js";
import { N as Pe } from "./NeumorphismFieldError-BxamHjhs.js";
import { N as Me } from "./NeumorphismPopover-m8EjDIRe.js";
import { _ as Ce } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismDatePicker.css';const Ne = { class: "nm-datepicker__wrapper" }, Be = ["name", "value"], Fe = ["tabindex", "aria-label", "aria-expanded", "aria-controls"], Le = { class: "nm-datepicker__actions" }, Te = ["aria-label"], Ve = ["aria-label"], Ae = { class: "nm-datepicker__header" }, Ye = ["aria-label"], $e = ["aria-label"], Ee = { class: "nm-datepicker__header-label" }, Se = ["aria-label"], Ie = ["aria-label"], Re = { class: "nm-datepicker__weekdays" }, qe = ["id"], ze = ["disabled", "tabindex", "aria-label", "aria-selected", "aria-current", "onClick", "onFocus"], Oe = { class: "nm-datepicker__footer" }, Ke = /* @__PURE__ */ he({
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
  setup(u, { emit: J }) {
    const d = u, p = J, { config: _, resolveProp: P } = we(), { t: o } = xe(), H = l(
      () => {
        var e;
        return P(d.size, (e = _.value.datePicker) == null ? void 0 : e.size, "medium");
      }
    ), U = l(
      () => {
        var e;
        return P(d.format, (e = _.value.datePicker) == null ? void 0 : e.format, "yyyy-MM-dd");
      }
    ), L = l(
      () => {
        var e;
        return d.placeholder || ((e = _.value.datePicker) == null ? void 0 : e.placeholder) || o("datePickerPlaceholder");
      }
    ), j = l(
      () => {
        var e;
        return P(d.clearable, (e = _.value.datePicker) == null ? void 0 : e.clearable, !0);
      }
    ), G = l(() => o("datePickerClear")), Q = l(() => o("datePickerToday")), X = l(() => o("datePickerPrevMonth")), Z = l(() => o("datePickerNextMonth")), ee = l(() => o("datePickerPrevYear")), ae = l(() => o("datePickerNextYear")), te = l({
      get: () => d.modelValue ?? null,
      set: (e) => {
        p("update:modelValue", e), p("change", e);
      }
    }), {
      currentYear: T,
      currentMonth: V,
      calendarDays: k,
      weekdays: re,
      selectedDate: f,
      selectDate: M,
      prevMonth: A,
      nextMonth: Y,
      prevYear: $,
      nextYear: E,
      formatDate: oe,
      goToToday: ne
    } = _e({
      modelValue: te,
      minDate: l(() => d.minDate),
      maxDate: l(() => d.maxDate),
      format: U,
      firstDayOfWeek: l(() => {
        var e;
        return d.firstDayOfWeek ?? ((e = _.value.datePicker) == null ? void 0 : e.firstDayOfWeek);
      })
    }), { fieldId: g, errorMessage: ie, baseClassList: le, handleFocus: se, handleBlur: de } = ge(() => ({
      id: d.id,
      size: H.value,
      disabled: d.disabled,
      error: d.error,
      prefix: "datepicker"
    })), h = D(), w = D(!1);
    function ue(e) {
      w.value = e;
    }
    function ce(e) {
      var a;
      e.isDisabled || (M(e.date), (a = h.value) == null || a.hide(), N());
    }
    function me() {
      var a;
      const e = /* @__PURE__ */ new Date();
      e.setHours(0, 0, 0, 0), M(e), ne(), (a = h.value) == null || a.hide();
    }
    function ve(e) {
      e.stopPropagation(), p("update:modelValue", null), p("change", null);
    }
    be(f, (e) => {
      e && (T.value = e.getFullYear(), V.value = e.getMonth() + 1);
    });
    const S = l(() => f.value ? oe(f.value) : ""), pe = l(() => [
      ...le("nm-datepicker").value,
      {
        "nm-datepicker--open": w.value,
        "nm-datepicker--has-value": f.value !== null
      }
    ]), C = l(() => {
      const e = T.value, a = V.value, t = [
        o("datePickerMonth1") || "January",
        o("datePickerMonth2") || "February",
        o("datePickerMonth3") || "March",
        o("datePickerMonth4") || "April",
        o("datePickerMonth5") || "May",
        o("datePickerMonth6") || "June",
        o("datePickerMonth7") || "July",
        o("datePickerMonth8") || "August",
        o("datePickerMonth9") || "September",
        o("datePickerMonth10") || "October",
        o("datePickerMonth11") || "November",
        o("datePickerMonth12") || "December"
      ];
      return { year: e, monthName: t[a - 1] };
    }), i = D(-1), I = D();
    function N() {
      var e;
      (e = I.value) == null || e.focus();
    }
    function R(e = 5) {
      var t;
      const a = (t = document.getElementById(`${g}-grid`)) == null ? void 0 : t.querySelector('.nm-datepicker__day[tabindex="0"]');
      if (a) {
        a.focus();
        return;
      }
      e > 0 && w.value && typeof window < "u" && window.requestAnimationFrame(() => R(e - 1));
    }
    function ke(e) {
      var a, t;
      d.disabled || (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") && (e.preventDefault(), i.value === -1 && (i.value = k.value.findIndex((s) => s.isCurrentMonth && !s.isDisabled)), (t = (a = h.value) == null ? void 0 : a.show) == null || t.call(a), ye(() => R()));
    }
    function fe(e) {
      var s, c, x, q;
      const a = k.value.length;
      if (a === 0) return;
      i.value === -1 && (i.value = k.value.findIndex((b) => b.isCurrentMonth && !b.isDisabled));
      let t = i.value;
      switch (e.key) {
        case "ArrowRight":
          t = Math.min(a - 1, i.value + 1);
          break;
        case "ArrowLeft":
          t = Math.max(0, i.value - 1);
          break;
        case "ArrowDown":
          t = Math.min(a - 1, i.value + 7);
          break;
        case "ArrowUp":
          t = Math.max(0, i.value - 7);
          break;
        case "Home":
          t = i.value - i.value % 7;
          break;
        case "End":
          t = i.value + (6 - i.value % 7);
          break;
        case "Enter":
        case " ": {
          const b = k.value[i.value];
          b && !b.isDisabled && (M(b.date), (c = (s = h.value) == null ? void 0 : s.hide) == null || c.call(s), N()), e.preventDefault();
          return;
        }
        case "Escape":
          (q = (x = h.value) == null ? void 0 : x.hide) == null || q.call(x), N(), e.preventDefault();
          return;
        default:
          return;
      }
      e.preventDefault(), t >= 0 && t < a && !k.value[t].isDisabled && (i.value = t);
    }
    return (e, a) => (m(), v("div", Ne, [
      B(De, {
        label: u.label,
        required: u.required,
        "for-id": n(g)
      }, null, 8, ["label", "required", "for-id"]),
      u.name ? (m(), v("input", {
        key: 0,
        type: "hidden",
        name: u.name,
        value: S.value
      }, null, 8, Be)) : z("", !0),
      B(Me, {
        ref_key: "popoverRef",
        ref: h,
        disabled: u.disabled,
        width: "trigger",
        "show-arrow": !1,
        trigger: "click",
        onVisibleChange: ue
      }, {
        content: O(() => [
          r("div", {
            class: "nm-datepicker__calendar",
            role: "dialog",
            "aria-label": u.label || "Date picker"
          }, [
            r("div", Ae, [
              r("button", {
                class: "nm-datepicker__nav-btn",
                type: "button",
                "aria-label": ee.value,
                onClick: a[2] || (a[2] = //@ts-ignore
                (...t) => n($) && n($)(...t))
              }, [...a[8] || (a[8] = [
                r("svg", {
                  width: "14",
                  height: "14",
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  "stroke-width": "2"
                }, [
                  r("polyline", { points: "11 17 6 12 11 7" }),
                  r("polyline", { points: "18 17 13 12 18 7" })
                ], -1)
              ])], 8, Ye),
              r("button", {
                class: "nm-datepicker__nav-btn",
                type: "button",
                "aria-label": X.value,
                onClick: a[3] || (a[3] = //@ts-ignore
                (...t) => n(A) && n(A)(...t))
              }, [...a[9] || (a[9] = [
                r("svg", {
                  width: "14",
                  height: "14",
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  "stroke-width": "2"
                }, [
                  r("polyline", { points: "15 18 9 12 15 6" })
                ], -1)
              ])], 8, $e),
              r("span", Ee, y(C.value.monthName) + " " + y(C.value.year), 1),
              r("button", {
                class: "nm-datepicker__nav-btn",
                type: "button",
                "aria-label": Z.value,
                onClick: a[4] || (a[4] = //@ts-ignore
                (...t) => n(Y) && n(Y)(...t))
              }, [...a[10] || (a[10] = [
                r("svg", {
                  width: "14",
                  height: "14",
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  "stroke-width": "2"
                }, [
                  r("polyline", { points: "9 18 15 12 9 6" })
                ], -1)
              ])], 8, Se),
              r("button", {
                class: "nm-datepicker__nav-btn",
                type: "button",
                "aria-label": ae.value,
                onClick: a[5] || (a[5] = //@ts-ignore
                (...t) => n(E) && n(E)(...t))
              }, [...a[11] || (a[11] = [
                r("svg", {
                  width: "14",
                  height: "14",
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  "stroke-width": "2"
                }, [
                  r("polyline", { points: "13 17 18 12 13 7" }),
                  r("polyline", { points: "6 17 11 12 6 7" })
                ], -1)
              ])], 8, Ie)
            ]),
            r("div", Re, [
              (m(!0), v(K, null, W(n(re), (t, s) => (m(), v("span", {
                key: s,
                class: "nm-datepicker__weekday"
              }, y(t), 1))), 128))
            ]),
            r("div", {
              id: `${n(g)}-grid`,
              class: "nm-datepicker__days",
              role: "grid",
              onKeydown: fe
            }, [
              (m(!0), v(K, null, W(n(k), (t, s) => (m(), v("button", {
                key: s,
                ref_for: !0,
                ref: (c) => {
                  s === i.value && c && c.focus();
                },
                class: F(["nm-datepicker__day", {
                  "nm-datepicker__day--other-month": !t.isCurrentMonth,
                  "nm-datepicker__day--today": t.isToday,
                  "nm-datepicker__day--selected": t.isSelected,
                  "nm-datepicker__day--disabled": t.isDisabled,
                  "nm-datepicker__day--in-range": t.isInRange
                }]),
                type: "button",
                disabled: t.isDisabled,
                tabindex: s === i.value ? 0 : -1,
                role: "gridcell",
                "aria-label": `${C.value.monthName} ${t.day}, ${t.date.getFullYear()}`,
                "aria-selected": t.isSelected,
                "aria-current": t.isToday ? "date" : void 0,
                onClick: (c) => ce(t),
                onFocus: (c) => i.value = s
              }, y(t.day), 43, ze))), 128))
            ], 40, qe),
            r("div", Oe, [
              r("button", {
                class: "nm-datepicker__today-btn",
                type: "button",
                onClick: me
              }, y(Q.value), 1)
            ])
          ], 8, Ve)
        ]),
        default: O(() => [
          r("div", {
            ref_key: "triggerRef",
            ref: I,
            class: F(pe.value),
            tabindex: u.disabled ? -1 : 0,
            "aria-label": u.label || L.value,
            role: "combobox",
            "aria-expanded": w.value,
            "aria-haspopup": "dialog",
            "aria-controls": `${n(g)}-grid`,
            onFocus: a[0] || (a[0] = (t) => n(se)(t, p)),
            onBlur: a[1] || (a[1] = (t) => n(de)(t, p)),
            onKeydown: ke
          }, [
            r("span", {
              class: F(["nm-datepicker__value", { "nm-datepicker__value--placeholder": !n(f) }])
            }, y(S.value || L.value), 3),
            r("span", Le, [
              j.value && n(f) ? (m(), v("button", {
                key: 0,
                class: "nm-datepicker__clear",
                type: "button",
                "aria-label": G.value,
                onClick: ve
              }, [...a[6] || (a[6] = [
                r("svg", {
                  width: "14",
                  height: "14",
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  "stroke-width": "2"
                }, [
                  r("path", { d: "M18 6L6 18M6 6l12 12" })
                ], -1)
              ])], 8, Te)) : z("", !0),
              a[7] || (a[7] = r("svg", {
                class: "nm-datepicker__icon",
                width: "16",
                height: "16",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                "stroke-width": "2"
              }, [
                r("rect", {
                  x: "3",
                  y: "4",
                  width: "18",
                  height: "18",
                  rx: "2",
                  ry: "2"
                }),
                r("line", {
                  x1: "16",
                  y1: "2",
                  x2: "16",
                  y2: "6"
                }),
                r("line", {
                  x1: "8",
                  y1: "2",
                  x2: "8",
                  y2: "6"
                }),
                r("line", {
                  x1: "3",
                  y1: "10",
                  x2: "21",
                  y2: "10"
                })
              ], -1))
            ])
          ], 42, Fe)
        ]),
        _: 1
      }, 8, ["disabled"]),
      B(Pe, {
        id: `${n(g)}-error`,
        message: n(ie)
      }, null, 8, ["id", "message"])
    ]));
  }
}), ea = /* @__PURE__ */ Ce(Ke, [["__scopeId", "data-v-607a6d19"]]);
export {
  ea as N
};

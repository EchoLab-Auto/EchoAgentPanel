import { defineComponent as fe, computed as l, ref as D, watch as be, openBlock as b, createElementBlock as h, createVNode as B, unref as i, withCtx as q, createElementVNode as r, normalizeClass as F, toDisplayString as y, createCommentVNode as he, Fragment as z, renderList as O, nextTick as ye } from "vue";
import { useDatePicker as _e } from "../composables/useDatePicker.js";
import { useFormField as ge } from "../composables/useFormField.js";
import { u as we } from "./createComponent-jnXBYqCm.js";
import { useLocale as xe } from "../composables/useLocale.js";
import { N as De } from "./NeumorphismFieldLabel-CBF1nZs1.js";
import { N as Pe } from "./NeumorphismFieldError-BxamHjhs.js";
import { N as Me } from "./NeumorphismPopover-m8EjDIRe.js";
import { _ as Ce } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismDatePicker.css';const Ne = { class: "nm-datepicker__wrapper" }, Be = ["tabindex", "aria-label", "aria-expanded", "aria-controls"], Fe = { class: "nm-datepicker__actions" }, Le = ["aria-label"], Te = ["aria-label"], Ve = { class: "nm-datepicker__header" }, Ae = ["aria-label"], Ye = ["aria-label"], $e = { class: "nm-datepicker__header-label" }, Ee = ["aria-label"], Se = ["aria-label"], Ie = { class: "nm-datepicker__weekdays" }, Re = ["id"], qe = ["disabled", "tabindex", "aria-label", "aria-selected", "aria-current", "onClick", "onFocus"], ze = { class: "nm-datepicker__footer" }, Oe = /* @__PURE__ */ fe({
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
  setup(u, { emit: K }) {
    const d = u, m = K, { config: _, resolveProp: P } = we(), { t: o } = xe(), W = l(
      () => {
        var e;
        return P(d.size, (e = _.value.datePicker) == null ? void 0 : e.size, "medium");
      }
    ), J = l(
      () => {
        var e;
        return P(d.format, (e = _.value.datePicker) == null ? void 0 : e.format, "yyyy-MM-dd");
      }
    ), L = l(
      () => {
        var e;
        return d.placeholder || ((e = _.value.datePicker) == null ? void 0 : e.placeholder) || o("datePickerPlaceholder");
      }
    ), H = l(
      () => {
        var e;
        return P(d.clearable, (e = _.value.datePicker) == null ? void 0 : e.clearable, !0);
      }
    ), U = l(() => o("datePickerClear")), j = l(() => o("datePickerToday")), G = l(() => o("datePickerPrevMonth")), Q = l(() => o("datePickerNextMonth")), X = l(() => o("datePickerPrevYear")), Z = l(() => o("datePickerNextYear")), ee = l({
      get: () => d.modelValue ?? null,
      set: (e) => {
        m("update:modelValue", e), m("change", e);
      }
    }), {
      currentYear: T,
      currentMonth: V,
      calendarDays: v,
      weekdays: ae,
      selectedDate: p,
      selectDate: M,
      prevMonth: A,
      nextMonth: Y,
      prevYear: $,
      nextYear: E,
      formatDate: te,
      goToToday: re
    } = _e({
      modelValue: ee,
      minDate: l(() => d.minDate),
      maxDate: l(() => d.maxDate),
      format: J,
      firstDayOfWeek: l(() => {
        var e;
        return d.firstDayOfWeek ?? ((e = _.value.datePicker) == null ? void 0 : e.firstDayOfWeek);
      })
    }), { fieldId: g, errorMessage: oe, baseClassList: ie, handleFocus: ne, handleBlur: le } = ge(() => ({
      id: d.id,
      size: W.value,
      disabled: d.disabled,
      error: d.error,
      prefix: "datepicker"
    })), k = D(), w = D(!1);
    function se(e) {
      w.value = e;
    }
    function de(e) {
      var a;
      e.isDisabled || (M(e.date), (a = k.value) == null || a.hide(), N());
    }
    function ue() {
      var a;
      const e = /* @__PURE__ */ new Date();
      e.setHours(0, 0, 0, 0), M(e), re(), (a = k.value) == null || a.hide();
    }
    function ce(e) {
      e.stopPropagation(), m("update:modelValue", null), m("change", null);
    }
    be(p, (e) => {
      e && (T.value = e.getFullYear(), V.value = e.getMonth() + 1);
    });
    const me = l(() => p.value ? te(p.value) : ""), ve = l(() => [
      ...ie("nm-datepicker").value,
      {
        "nm-datepicker--open": w.value,
        "nm-datepicker--has-value": p.value !== null
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
    }), n = D(-1), S = D();
    function N() {
      var e;
      (e = S.value) == null || e.focus();
    }
    function I(e = 5) {
      var t;
      const a = (t = document.getElementById(`${g}-grid`)) == null ? void 0 : t.querySelector('.nm-datepicker__day[tabindex="0"]');
      if (a) {
        a.focus();
        return;
      }
      e > 0 && w.value && typeof window < "u" && window.requestAnimationFrame(() => I(e - 1));
    }
    function pe(e) {
      var a, t;
      d.disabled || (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") && (e.preventDefault(), n.value === -1 && (n.value = v.value.findIndex((s) => s.isCurrentMonth && !s.isDisabled)), (t = (a = k.value) == null ? void 0 : a.show) == null || t.call(a), ye(() => I()));
    }
    function ke(e) {
      var s, c, x, R;
      const a = v.value.length;
      if (a === 0) return;
      n.value === -1 && (n.value = v.value.findIndex((f) => f.isCurrentMonth && !f.isDisabled));
      let t = n.value;
      switch (e.key) {
        case "ArrowRight":
          t = Math.min(a - 1, n.value + 1);
          break;
        case "ArrowLeft":
          t = Math.max(0, n.value - 1);
          break;
        case "ArrowDown":
          t = Math.min(a - 1, n.value + 7);
          break;
        case "ArrowUp":
          t = Math.max(0, n.value - 7);
          break;
        case "Home":
          t = n.value - n.value % 7;
          break;
        case "End":
          t = n.value + (6 - n.value % 7);
          break;
        case "Enter":
        case " ": {
          const f = v.value[n.value];
          f && !f.isDisabled && (M(f.date), (c = (s = k.value) == null ? void 0 : s.hide) == null || c.call(s), N()), e.preventDefault();
          return;
        }
        case "Escape":
          (R = (x = k.value) == null ? void 0 : x.hide) == null || R.call(x), N(), e.preventDefault();
          return;
        default:
          return;
      }
      e.preventDefault(), t >= 0 && t < a && !v.value[t].isDisabled && (n.value = t);
    }
    return (e, a) => (b(), h("div", Ne, [
      B(De, {
        label: u.label,
        required: u.required,
        "for-id": i(g)
      }, null, 8, ["label", "required", "for-id"]),
      B(Me, {
        ref_key: "popoverRef",
        ref: k,
        disabled: u.disabled,
        width: "trigger",
        "show-arrow": !1,
        trigger: "click",
        onVisibleChange: se
      }, {
        content: q(() => [
          r("div", {
            class: "nm-datepicker__calendar",
            role: "dialog",
            "aria-label": u.label || "Date picker"
          }, [
            r("div", Ve, [
              r("button", {
                class: "nm-datepicker__nav-btn",
                type: "button",
                "aria-label": X.value,
                onClick: a[2] || (a[2] = //@ts-ignore
                (...t) => i($) && i($)(...t))
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
              ])], 8, Ae),
              r("button", {
                class: "nm-datepicker__nav-btn",
                type: "button",
                "aria-label": G.value,
                onClick: a[3] || (a[3] = //@ts-ignore
                (...t) => i(A) && i(A)(...t))
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
              ])], 8, Ye),
              r("span", $e, y(C.value.monthName) + " " + y(C.value.year), 1),
              r("button", {
                class: "nm-datepicker__nav-btn",
                type: "button",
                "aria-label": Q.value,
                onClick: a[4] || (a[4] = //@ts-ignore
                (...t) => i(Y) && i(Y)(...t))
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
              ])], 8, Ee),
              r("button", {
                class: "nm-datepicker__nav-btn",
                type: "button",
                "aria-label": Z.value,
                onClick: a[5] || (a[5] = //@ts-ignore
                (...t) => i(E) && i(E)(...t))
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
              ])], 8, Se)
            ]),
            r("div", Ie, [
              (b(!0), h(z, null, O(i(ae), (t, s) => (b(), h("span", {
                key: s,
                class: "nm-datepicker__weekday"
              }, y(t), 1))), 128))
            ]),
            r("div", {
              id: `${i(g)}-grid`,
              class: "nm-datepicker__days",
              role: "grid",
              onKeydown: ke
            }, [
              (b(!0), h(z, null, O(i(v), (t, s) => (b(), h("button", {
                key: s,
                ref_for: !0,
                ref: (c) => {
                  s === n.value && c && c.focus();
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
                tabindex: s === n.value ? 0 : -1,
                role: "gridcell",
                "aria-label": `${C.value.monthName} ${t.day}, ${t.date.getFullYear()}`,
                "aria-selected": t.isSelected,
                "aria-current": t.isToday ? "date" : void 0,
                onClick: (c) => de(t),
                onFocus: (c) => n.value = s
              }, y(t.day), 43, qe))), 128))
            ], 40, Re),
            r("div", ze, [
              r("button", {
                class: "nm-datepicker__today-btn",
                type: "button",
                onClick: ue
              }, y(j.value), 1)
            ])
          ], 8, Te)
        ]),
        default: q(() => [
          r("div", {
            ref_key: "triggerRef",
            ref: S,
            class: F(ve.value),
            tabindex: u.disabled ? -1 : 0,
            "aria-label": u.label || L.value,
            role: "combobox",
            "aria-expanded": w.value,
            "aria-haspopup": "dialog",
            "aria-controls": `${i(g)}-grid`,
            onFocus: a[0] || (a[0] = (t) => i(ne)(t, m)),
            onBlur: a[1] || (a[1] = (t) => i(le)(t, m)),
            onKeydown: pe
          }, [
            r("span", {
              class: F(["nm-datepicker__value", { "nm-datepicker__value--placeholder": !i(p) }])
            }, y(me.value || L.value), 3),
            r("span", Fe, [
              H.value && i(p) ? (b(), h("button", {
                key: 0,
                class: "nm-datepicker__clear",
                type: "button",
                "aria-label": U.value,
                onClick: ce
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
              ])], 8, Le)) : he("", !0),
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
          ], 42, Be)
        ]),
        _: 1
      }, 8, ["disabled"]),
      B(Pe, {
        id: `${i(g)}-error`,
        message: i(oe)
      }, null, 8, ["id", "message"])
    ]));
  }
}), Ze = /* @__PURE__ */ Ce(Oe, [["__scopeId", "data-v-7fc01103"]]);
export {
  Ze as N
};

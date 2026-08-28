import { defineComponent as Z, ref as N, computed as r, openBlock as o, createElementBlock as n, normalizeStyle as b, normalizeClass as z, toDisplayString as h, createCommentVNode as d, renderSlot as Y, createElementVNode as _, unref as l, Fragment as m, renderList as f, withDirectives as ee, vShow as te, createVNode as le, Transition as oe, withCtx as ne } from "vue";
import { usePieChart as ae } from "../composables/usePieChart.js";
import { useLocale as ie } from "../composables/useLocale.js";
import { useConfig as re } from "../composables/useConfig.js";
import { _ as se } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismChartPie.css';const de = {
  key: 0,
  class: "nm-chart__header"
}, ce = {
  key: 0,
  class: "nm-chart__title"
}, ue = ["aria-label"], he = ["viewBox"], me = ["transform"], ve = { key: 0 }, _e = ["d", "fill", "aria-label", "onClick", "onMouseenter"], fe = ["x1", "y1", "x2", "y2"], pe = ["x", "y", "text-anchor"], ge = ["x", "y"], ye = ["x", "y"], xe = ["x", "y", "width", "height"], be = {
  class: "nm-chart__center-slot",
  xmlns: "http://www.w3.org/1999/xhtml"
}, we = ["aria-label"], ke = { class: "nm-chart__legend-label" }, $e = /* @__PURE__ */ Z({
  __name: "NeumorphismChartPie",
  props: {
    data: { default: () => [] },
    width: { default: "100%" },
    height: { default: "300px" },
    innerRadius: { default: void 0 },
    padAngle: { default: 0.02 },
    startAngle: { default: -90 },
    labelPosition: { default: void 0 },
    roundedCorners: { type: Boolean, default: void 0 },
    showTooltip: { type: Boolean, default: void 0 },
    showLegend: { type: Boolean, default: void 0 },
    animate: { type: Boolean, default: void 0 },
    title: {},
    colorPalette: { default: () => [] }
  },
  emits: ["arc-click"],
  setup(c, { emit: X }) {
    const a = c, D = X, { t: P } = ie(), p = N(null), w = N(null), {
      arcs: g,
      total: k,
      resolvedInnerRadius: v,
      resolvedLabelPosition: L,
      plotSize: y,
      resolvedMargin: u,
      tooltip: x,
      reducedMotion: I,
      showTooltip: E,
      hideTooltip: F,
      handleChartKeydown: M,
      effectivePalette: B
    } = ae({
      containerRef: p,
      data: r(() => a.data),
      innerRadius: a.innerRadius,
      padAngle: a.padAngle,
      startAngle: a.startAngle,
      labelPosition: a.labelPosition,
      roundedCorners: a.roundedCorners,
      colorPalette: a.colorPalette
    }), V = r(
      () => y.value.width + u.value.left + u.value.right
    ), K = r(
      () => y.value.height + u.value.top + u.value.bottom
    ), $ = r(() => y.value.width / 2), C = r(() => y.value.height / 2), O = r(() => ({
      width: typeof a.width == "number" ? `${a.width}px` : a.width,
      height: typeof a.height == "number" ? `${a.height}px` : a.height
    })), j = r(() => {
      const t = a.data.length;
      if (t === 0) return "Pie chart: empty";
      const s = a.data.reduce((e, i) => e + i.value, 0);
      return `Pie chart with ${t} ${t === 1 ? "segment" : "segments"}, total ${s}`;
    }), A = re(), H = r(
      () => {
        var t;
        return a.showTooltip ?? ((t = A.value.chart) == null ? void 0 : t.showTooltip) ?? !0;
      }
    ), W = r(
      () => {
        var t;
        return a.showLegend ?? ((t = A.value.chart) == null ? void 0 : t.showLegend) ?? !0;
      }
    ), q = r(() => {
      var t;
      return a.animate ?? ((t = A.value.chart) == null ? void 0 : t.animate) ?? !0;
    }), S = r(() => q.value && !I.value), G = r(() => {
      if (!p.value) return { display: "none" };
      const t = p.value.getBoundingClientRect();
      return {
        left: `${x.value.x - t.left + 12}px`,
        top: `${x.value.y - t.top - 8}px`
      };
    });
    function J(t) {
      D("arc-click", {
        index: t.index,
        value: t.value,
        label: t.label
      });
    }
    function Q(t, s) {
      w.value = t.index, E(t.index, 0, s.clientX, s.clientY);
    }
    function R() {
      w.value = null, F();
    }
    function U(t, s) {
      return s ?? B.value[t % B.value.length] ?? "var(--nm-chart-color-1)";
    }
    return (t, s) => (o(), n("div", {
      class: z(["nm-chart", "nm-chart--pie"]),
      style: b(O.value)
    }, [
      c.title || t.$slots.title ? (o(), n("div", de, [
        c.title ? (o(), n("span", ce, h(c.title), 1)) : d("", !0),
        Y(t.$slots, "title", {}, void 0, !0)
      ])) : d("", !0),
      _("div", {
        ref_key: "containerRef",
        ref: p,
        class: "nm-chart__body",
        role: "img",
        "aria-label": j.value,
        tabindex: "0",
        onKeydown: s[0] || (s[0] = //@ts-ignore
        (...e) => l(M) && l(M)(...e)),
        onMouseleave: R
      }, [
        (o(), n("svg", {
          viewBox: `0 0 ${V.value} ${K.value}`,
          class: "nm-chart__svg",
          "aria-hidden": "true",
          preserveAspectRatio: "xMidYMid meet"
        }, [
          _("g", {
            transform: `translate(${l(u).left}, ${l(u).top})`
          }, [
            l(k) > 0 ? (o(), n("g", ve, [
              (o(!0), n(m, null, f(l(g), (e, i) => (o(), n("path", {
                key: i,
                d: e.path,
                fill: e.color,
                stroke: "var(--nm-surface-color)",
                "stroke-width": "2",
                class: z([
                  "nm-chart__arc",
                  {
                    "nm-chart__arc--hovered": w.value === e.index,
                    "nm-chart__arc--focused": e.isFocused,
                    "nm-chart__arc--animate": S.value
                  }
                ]),
                style: b(
                  S.value ? { transformOrigin: `${$.value}px ${C.value}px`, animationDelay: `${i * 100}ms` } : {}
                ),
                role: "img",
                "aria-label": `${e.label}: ${e.percentage}%`,
                onClick: (T) => J(e),
                onMouseenter: (T) => Q(e, T),
                onMouseleave: R
              }, null, 46, _e))), 128)),
              l(L) === "outside" ? (o(), n(m, { key: 0 }, [
                (o(!0), n(m, null, f(l(g), (e, i) => (o(), n("line", {
                  key: "line" + i,
                  x1: e.centroidX,
                  y1: e.centroidY,
                  x2: e.labelX,
                  y2: e.labelY,
                  stroke: "var(--nm-chart-axis-color)",
                  "stroke-width": "0.5"
                }, null, 8, fe))), 128)),
                (o(!0), n(m, null, f(l(g), (e, i) => (o(), n("text", {
                  key: "lbl" + i,
                  x: (e.labelX ?? 0) + (e.labelAnchor === "start" ? 4 : -4),
                  y: e.labelY,
                  "text-anchor": e.labelAnchor,
                  "dominant-baseline": "middle",
                  fill: "var(--nm-chart-label-color)",
                  "font-size": "11",
                  class: "nm-chart__tick-label"
                }, h(e.label || `${e.percentage}%`), 9, pe))), 128))
              ], 64)) : d("", !0),
              (o(!0), n(m, null, f(l(g), (e, i) => ee((o(), n("text", {
                key: "ilbl" + i,
                x: e.centroidX,
                y: e.centroidY,
                "text-anchor": "middle",
                "dominant-baseline": "middle",
                fill: "var(--nm-text-on-primary)",
                "font-size": "11",
                "font-weight": "600",
                class: "nm-chart__tick-label"
              }, h(e.percentage) + "% ", 9, ge)), [
                [te, l(L) === "inside"]
              ])), 128))
            ])) : d("", !0),
            l(k) === 0 ? (o(), n("text", {
              key: 1,
              x: $.value,
              y: C.value,
              "text-anchor": "middle",
              "dominant-baseline": "middle",
              fill: "var(--nm-text-placeholder)",
              "font-size": "13"
            }, h(l(P)("chartNoData")), 9, ye)) : d("", !0),
            l(v) > 0 ? (o(), n("foreignObject", {
              key: 2,
              x: $.value - l(v),
              y: C.value - l(v),
              width: l(v) * 2,
              height: l(v) * 2
            }, [
              _("div", be, [
                Y(t.$slots, "center", { total: l(k) }, void 0, !0)
              ])
            ], 8, xe)) : d("", !0)
          ], 8, me)
        ], 8, he)),
        le(oe, { name: "nm-chart-tooltip" }, {
          default: ne(() => [
            l(x).visible && H.value ? (o(), n("div", {
              key: 0,
              class: "nm-chart__tooltip",
              style: b(G.value)
            }, h(l(x).content), 5)) : d("", !0)
          ]),
          _: 1
        })
      ], 40, ue),
      W.value && c.data.length > 0 ? (o(), n("div", {
        key: 1,
        class: "nm-chart__legend",
        role: "list",
        "aria-label": l(P)("chartLegend")
      }, [
        (o(!0), n(m, null, f(c.data, (e, i) => (o(), n("div", {
          key: i,
          class: "nm-chart__legend-item",
          role: "listitem"
        }, [
          _("span", {
            class: "nm-chart__legend-marker",
            style: b({ backgroundColor: U(i, e.color) })
          }, null, 4),
          _("span", ke, h(e.label ?? `Item ${i + 1}`), 1)
        ]))), 128))
      ], 8, we)) : d("", !0)
    ], 4));
  }
}), Be = /* @__PURE__ */ se($e, [["__scopeId", "data-v-798b6b4f"]]);
export {
  Be as N
};

import { defineComponent as ce, ref as de, computed as d, openBlock as l, createElementBlock as n, normalizeStyle as g, normalizeClass as $, toDisplayString as f, createCommentVNode as p, renderSlot as he, createElementVNode as c, unref as e, Fragment as m, renderList as v, withDirectives as V, vShow as O, createVNode as ue, Transition as me, withCtx as ve, createTextVNode as ye } from "vue";
import { useLineChart as _e } from "../composables/useLineChart.js";
import pe from "../composables/useChartInteraction.js";
import { useLocale as fe } from "../composables/useLocale.js";
import { useConfig as xe } from "../composables/useConfig.js";
import { generateId as ge } from "../utils/index.js";
import { _ as ke } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismChartLine.css';const we = {
  key: 0,
  class: "nm-chart__header"
}, be = {
  key: 0,
  class: "nm-chart__title"
}, $e = ["aria-label"], Le = ["viewBox"], Ie = ["id"], Se = ["x", "y", "width", "height"], Me = ["id"], Ce = ["stop-color"], Be = ["stop-color"], Ae = ["clip-path"], Pe = ["x1", "y1", "x2", "y2"], ze = { key: 1 }, Te = ["x1", "y1", "x2", "y2"], Ne = ["x", "y"], We = { key: 2 }, De = ["x1", "y1", "x2", "y2"], Ge = ["x", "y"], Ve = ["transform"], Oe = ["d", "fill"], Re = ["d", "stroke", "stroke-width"], je = ["x1", "y1", "x2", "y2"], Ee = ["cx", "cy", "fill"], Fe = ["cx", "cy", "r", "fill", "stroke", "stroke-width", "opacity", "aria-label", "onClick"], He = { class: "nm-chart__tooltip-header" }, Ke = ["aria-label"], Xe = { class: "nm-chart__legend-label" }, Ye = /* @__PURE__ */ ce({
  __name: "NeumorphismChartLine",
  props: {
    series: { default: () => [] },
    width: { default: "100%" },
    height: { default: "300px" },
    curve: { default: void 0 },
    area: { type: Boolean, default: void 0 },
    areaOpacity: { default: 0.1 },
    showPoints: { type: Boolean, default: void 0 },
    pointSize: { default: 6 },
    lineWidth: { default: void 0 },
    showTooltip: { type: Boolean, default: void 0 },
    showLegend: { type: Boolean, default: void 0 },
    showGrid: { type: Boolean, default: void 0 },
    showAxis: { type: Boolean, default: void 0 },
    animate: { type: Boolean, default: void 0 },
    yMin: {},
    yMax: {},
    title: {}
  },
  emits: ["point-click"],
  setup(x, { emit: R }) {
    const i = x, j = R, { t: E } = fe(), S = de(null), L = ge("nm-line"), {
      lines: M,
      points: C,
      xAxisLabels: I,
      yAxisLabels: F,
      yAxisTicks: u,
      gridLines: H,
      plotSize: s,
      resolvedMargin: o,
      palette: k,
      tooltip: P,
      reducedMotion: K,
      hideTooltip: X,
      handleChartKeydown: z,
      resolvedShowPoints: Y,
      resolvedLineWidth: q,
      resolvedArea: J,
      resolvedPointSize: T
    } = _e({
      containerRef: S,
      series: d(() => i.series),
      curve: i.curve,
      area: i.area,
      areaOpacity: i.areaOpacity,
      showPoints: i.showPoints,
      pointSize: i.pointSize,
      lineWidth: i.lineWidth,
      yMin: i.yMin,
      yMax: i.yMax
    }), Q = d(
      () => s.value.width + o.value.left + o.value.right
    ), U = d(
      () => s.value.height + o.value.top + o.value.bottom
    ), Z = d(() => ({
      width: typeof i.width == "number" ? `${i.width}px` : i.width,
      height: typeof i.height == "number" ? `${i.height}px` : i.height
    })), ee = d(() => `Line chart: ${i.series.map((h) => h.name).join(", ")}`), w = xe(), N = d(
      () => {
        var a;
        return i.showTooltip ?? ((a = w.value.chart) == null ? void 0 : a.showTooltip) ?? !0;
      }
    ), te = d(
      () => {
        var a;
        return i.showLegend ?? ((a = w.value.chart) == null ? void 0 : a.showLegend) ?? !0;
      }
    ), oe = d(() => {
      var a;
      return i.showGrid ?? ((a = w.value.chart) == null ? void 0 : a.showGrid) ?? !0;
    }), W = d(() => {
      var a;
      return i.showAxis ?? ((a = w.value.chart) == null ? void 0 : a.showAxis) ?? !0;
    }), le = d(() => {
      var a;
      return i.animate ?? ((a = w.value.chart) == null ? void 0 : a.animate) ?? !0;
    }), b = d(() => le.value && !K.value), ne = d(() => {
      const a = [];
      for (const h of C.value)
        h.seriesIndex === 0 && a.push(h.cx);
      return a;
    }), {
      crosshairX: y,
      nearestIndex: _,
      isHovering: ae,
      tooltipData: B,
      tooltipStyle: re,
      onBodyMouseMove: D,
      onBodyMouseLeave: G
    } = pe({
      containerRef: S,
      enabled: N,
      marginLeft: d(() => o.value.left),
      plotWidth: d(() => s.value.width),
      dataPointXs: ne,
      xAxisLabels: I,
      series: d(() => i.series),
      palette: k,
      tooltip: P,
      hideTooltip: X
    }), ie = d(() => _.value < 0 ? [] : i.series.map((a, h) => {
      var r;
      const t = C.value.find((A) => A.dataIndex === _.value && A.seriesIndex === h);
      return {
        cx: (t == null ? void 0 : t.cx) ?? 0,
        cy: (t == null ? void 0 : t.cy) ?? 0,
        color: a.color ?? k.value[h % k.value.length],
        name: a.name,
        value: ((r = a.data[_.value]) == null ? void 0 : r.value) ?? 0
      };
    }));
    function se(a) {
      j("point-click", {
        index: a.dataIndex,
        seriesIndex: a.seriesIndex,
        value: a.value
      });
    }
    return (a, h) => (l(), n("div", {
      class: $(["nm-chart", "nm-chart--line"]),
      style: g(Z.value)
    }, [
      x.title || a.$slots.title ? (l(), n("div", we, [
        x.title ? (l(), n("span", be, f(x.title), 1)) : p("", !0),
        he(a.$slots, "title", {}, void 0, !0)
      ])) : p("", !0),
      c("div", {
        ref_key: "containerRef",
        ref: S,
        class: $(["nm-chart__body", { "nm-chart__body--hovering": e(ae) }]),
        role: "img",
        "aria-label": ee.value,
        tabindex: "0",
        onKeydown: h[0] || (h[0] = //@ts-ignore
        (...t) => e(z) && e(z)(...t)),
        onMousemove: h[1] || (h[1] = //@ts-ignore
        (...t) => e(D) && e(D)(...t)),
        onMouseleave: h[2] || (h[2] = //@ts-ignore
        (...t) => e(G) && e(G)(...t))
      }, [
        (l(), n("svg", {
          viewBox: `0 0 ${Q.value} ${U.value}`,
          class: "nm-chart__svg",
          "aria-hidden": "true",
          preserveAspectRatio: "xMidYMid meet"
        }, [
          c("defs", null, [
            c("clipPath", {
              id: `nm-plot-clip-line-${e(L)}`
            }, [
              c("rect", {
                x: e(o).left - 20,
                y: e(o).top - 20,
                width: e(s).width + 40,
                height: e(s).height + 40
              }, null, 8, Se)
            ], 8, Ie),
            (l(!0), n(m, null, v(e(M), (t, r) => (l(), n("linearGradient", {
              id: `nm-area-grad-${e(L)}-${r}`,
              key: "grad" + r,
              x1: "0",
              y1: "0",
              x2: "0",
              y2: "1"
            }, [
              c("stop", {
                offset: "0%",
                "stop-color": t.color,
                "stop-opacity": "0.18"
              }, null, 8, Ce),
              c("stop", {
                offset: "100%",
                "stop-color": t.color,
                "stop-opacity": "0.01"
              }, null, 8, Be)
            ], 8, Me))), 128))
          ]),
          oe.value ? (l(), n("g", {
            key: 0,
            "clip-path": `url(#nm-plot-clip-line-${e(L)})`
          }, [
            (l(!0), n(m, null, v(e(H), (t, r) => (l(), n("line", {
              key: "g" + r,
              x1: e(o).left,
              y1: e(o).top + e(s).height - (t - e(u)[0]) / (e(u)[e(u).length - 1] - e(u)[0] || 1) * e(s).height,
              x2: e(o).left + e(s).width,
              y2: e(o).top + e(s).height - (t - e(u)[0]) / (e(u)[e(u).length - 1] - e(u)[0] || 1) * e(s).height,
              stroke: "var(--nm-chart-grid-color)",
              "stroke-width": "0.5",
              "vector-effect": "non-scaling-stroke"
            }, null, 8, Pe))), 128))
          ], 8, Ae)) : p("", !0),
          W.value ? (l(), n("g", ze, [
            c("line", {
              x1: e(o).left,
              y1: e(o).top,
              x2: e(o).left,
              y2: e(o).top + e(s).height,
              stroke: "var(--nm-chart-axis-color)",
              "stroke-width": "1",
              "vector-effect": "non-scaling-stroke"
            }, null, 8, Te),
            (l(!0), n(m, null, v(e(F), (t, r) => (l(), n("text", {
              key: "y" + r,
              x: e(o).left - 8,
              y: e(o).top + e(s).height - (e(u)[r] - e(u)[0]) / (e(u)[e(u).length - 1] - e(u)[0] || 1) * e(s).height,
              "text-anchor": "end",
              "dominant-baseline": "middle",
              fill: "var(--nm-chart-label-color)",
              "font-size": "11",
              class: "nm-chart__tick-label"
            }, f(t), 9, Ne))), 128))
          ])) : p("", !0),
          W.value ? (l(), n("g", We, [
            c("line", {
              x1: e(o).left,
              y1: e(o).top + e(s).height,
              x2: e(o).left + e(s).width,
              y2: e(o).top + e(s).height,
              stroke: "var(--nm-chart-axis-color)",
              "stroke-width": "1",
              "vector-effect": "non-scaling-stroke"
            }, null, 8, De),
            (l(!0), n(m, null, v(e(I), (t, r) => (l(), n("text", {
              key: "x" + r,
              x: e(o).left + (e(I).length > 1 ? r * (e(s).width / (e(I).length - 1)) : e(s).width / 2),
              y: e(o).top + e(s).height + 20,
              "text-anchor": "middle",
              fill: "var(--nm-chart-label-color)",
              "font-size": "11",
              class: "nm-chart__tick-label"
            }, f(t), 9, Ge))), 128))
          ])) : p("", !0),
          c("g", {
            transform: `translate(${e(o).left}, ${e(o).top})`
          }, [
            (l(!0), n(m, null, v(e(M), (t, r) => V((l(), n("path", {
              key: "area" + r,
              d: t.areaPath,
              fill: `url(#nm-area-grad-${e(L)}-${r})`,
              class: $({ "nm-chart__area--animate": b.value })
            }, null, 10, Oe)), [
              [O, e(J) && t.areaPath]
            ])), 128)),
            (l(!0), n(m, null, v(e(M), (t, r) => (l(), n("path", {
              key: "line" + r,
              d: t.path,
              fill: "none",
              stroke: t.color,
              "stroke-width": e(q),
              "stroke-linecap": "round",
              "stroke-linejoin": "round",
              class: $(["nm-chart__line", { "nm-chart__line--animate": b.value }]),
              style: g(b.value ? { animationDelay: `${r * 200}ms` } : {})
            }, null, 14, Re))), 128))
          ], 8, Ve),
          e(y) !== null ? (l(), n(m, { key: 3 }, [
            c("line", {
              x1: e(o).left + e(y),
              y1: e(o).top,
              x2: e(o).left + e(y),
              y2: e(o).top + e(s).height,
              stroke: "var(--nm-text-placeholder)",
              "stroke-width": "1",
              "stroke-dasharray": "4,3",
              opacity: "0.5",
              class: "nm-chart__crosshair"
            }, null, 8, je),
            (l(!0), n(m, null, v(ie.value, (t, r) => (l(), n("circle", {
              key: "cd" + r,
              cx: e(o).left + t.cx,
              cy: e(o).top + t.cy,
              r: "4.5",
              fill: t.color,
              stroke: "var(--nm-surface-color)",
              "stroke-width": "2",
              class: "nm-chart__crosshair-dot"
            }, null, 8, Ee))), 128))
          ], 64)) : p("", !0),
          c("g", null, [
            (l(!0), n(m, null, v(e(C), (t, r) => V((l(), n("circle", {
              key: "pt" + r,
              cx: e(o).left + t.cx,
              cy: e(o).top + t.cy,
              r: e(y) !== null && t.dataIndex === e(_) ? e(T) + 1.5 : e(T),
              fill: t.color,
              stroke: (e(y) !== null && t.dataIndex === e(_), "var(--nm-surface-color)"),
              "stroke-width": e(y) !== null && t.dataIndex === e(_) ? 2.5 : 1.5,
              opacity: e(y) !== null && t.dataIndex !== e(_) ? 0.3 : 1,
              class: $([
                "nm-chart__point",
                {
                  "nm-chart__point--nearest": e(y) !== null && t.dataIndex === e(_),
                  "nm-chart__point--focused": t.isFocused,
                  "nm-chart__point--animate": b.value
                }
              ]),
              style: g(b.value ? { animationDelay: `${r * 60}ms` } : {}),
              role: "img",
              "aria-label": `${t.value}`,
              onClick: (A) => se(t)
            }, null, 14, Fe)), [
              [O, e(Y)]
            ])), 128))
          ])
        ], 8, Le)),
        ue(me, { name: "nm-chart-tooltip" }, {
          default: ve(() => [
            e(P).visible && N.value && e(B) ? (l(), n("div", {
              key: 0,
              class: "nm-chart__tooltip",
              style: g(e(re))
            }, [
              c("div", He, f(e(B).header), 1),
              (l(!0), n(m, null, v(e(B).rows, (t, r) => (l(), n("div", {
                key: r,
                class: "nm-chart__tooltip-row"
              }, [
                c("span", {
                  class: "nm-chart__tooltip-dot",
                  style: g({ background: t.color })
                }, null, 4),
                c("span", null, [
                  ye(f(t.name) + ": ", 1),
                  c("strong", null, f(t.value), 1)
                ])
              ]))), 128))
            ], 4)) : p("", !0)
          ]),
          _: 1
        })
      ], 42, $e),
      te.value && x.series.length > 0 ? (l(), n("div", {
        key: 1,
        class: "nm-chart__legend",
        role: "list",
        "aria-label": e(E)("chartLegend")
      }, [
        (l(!0), n(m, null, v(x.series, (t, r) => (l(), n("div", {
          key: r,
          class: "nm-chart__legend-item",
          role: "listitem"
        }, [
          c("span", {
            class: "nm-chart__legend-marker",
            style: g({ backgroundColor: t.color ?? e(k)[r % e(k).length] })
          }, null, 4),
          c("span", Xe, f(t.name), 1)
        ]))), 128))
      ], 8, Ke)) : p("", !0)
    ], 4));
  }
}), ot = /* @__PURE__ */ ke(Ye, [["__scopeId", "data-v-c6ab9c62"]]);
export {
  ot as N
};

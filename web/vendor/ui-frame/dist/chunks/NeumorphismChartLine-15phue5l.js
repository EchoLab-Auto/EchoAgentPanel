import { defineComponent as de, ref as he, computed as d, openBlock as a, createElementBlock as n, normalizeStyle as k, normalizeClass as $, toDisplayString as f, createCommentVNode as p, renderSlot as ue, createElementVNode as c, unref as e, Fragment as m, renderList as v, withDirectives as P, vShow as T, createVNode as me, Transition as ve, withCtx as ye, createTextVNode as _e } from "vue";
import { useLineChart as pe } from "../composables/useLineChart.js";
import fe from "../composables/useChartInteraction.js";
import { useLocale as xe } from "../composables/useLocale.js";
import { useConfig as ge } from "../composables/useConfig.js";
import { generateId as ke } from "../utils/index.js";
import { _ as we } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismChartLine.css';const be = {
  key: 0,
  class: "nm-chart__header"
}, Le = {
  key: 0,
  class: "nm-chart__title"
}, $e = ["aria-label"], Se = ["viewBox"], Ie = ["id"], Me = ["x", "y", "width", "height"], Ce = ["id"], Be = ["stop-color"], Ae = ["stop-color"], Pe = ["clip-path"], Te = ["x1", "y1", "x2", "y2"], ze = { key: 1 }, Ne = ["x1", "y1", "x2", "y2"], We = ["x", "y"], De = { key: 2 }, Fe = ["x1", "y1", "x2", "y2"], Ge = ["x", "y", "text-anchor"], Ve = ["transform"], Oe = ["d", "fill"], Re = ["d", "stroke", "stroke-width"], je = ["x1", "y1", "x2", "y2"], Ee = ["cx", "cy", "fill"], He = ["cx", "cy", "r", "fill", "stroke", "stroke-width", "opacity", "aria-label", "onClick"], Ke = { class: "nm-chart__tooltip-header" }, Xe = ["aria-label"], Ye = { class: "nm-chart__legend-label" }, qe = /* @__PURE__ */ de({
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
    title: {},
    valueFormatter: {}
  },
  emits: ["point-click"],
  setup(x, { emit: O }) {
    const i = x, R = O, { t: j } = xe(), I = he(null), S = ke("nm-line"), {
      lines: M,
      points: C,
      xAxisLabels: g,
      xLabelStride: E,
      yAxisLabels: H,
      yAxisTicks: u,
      gridLines: K,
      plotSize: s,
      resolvedMargin: o,
      palette: w,
      tooltip: z,
      reducedMotion: X,
      hideTooltip: Y,
      handleChartKeydown: N,
      resolvedShowPoints: q,
      resolvedLineWidth: J,
      resolvedArea: Q,
      resolvedPointSize: W
    } = pe({
      containerRef: I,
      series: d(() => i.series),
      curve: i.curve,
      area: i.area,
      areaOpacity: i.areaOpacity,
      showPoints: i.showPoints,
      pointSize: i.pointSize,
      lineWidth: i.lineWidth,
      yMin: i.yMin,
      yMax: i.yMax
    }), U = d(
      () => s.value.width + o.value.left + o.value.right
    ), Z = d(
      () => s.value.height + o.value.top + o.value.bottom
    ), ee = d(() => ({
      width: typeof i.width == "number" ? `${i.width}px` : i.width,
      height: typeof i.height == "number" ? `${i.height}px` : i.height
    })), te = d(() => `Line chart: ${i.series.map((h) => h.name).join(", ")}`), b = ge(), D = d(
      () => {
        var r;
        return i.showTooltip ?? ((r = b.value.chart) == null ? void 0 : r.showTooltip) ?? !0;
      }
    ), oe = d(
      () => {
        var r;
        return i.showLegend ?? ((r = b.value.chart) == null ? void 0 : r.showLegend) ?? !0;
      }
    ), le = d(() => {
      var r;
      return i.showGrid ?? ((r = b.value.chart) == null ? void 0 : r.showGrid) ?? !0;
    }), F = d(() => {
      var r;
      return i.showAxis ?? ((r = b.value.chart) == null ? void 0 : r.showAxis) ?? !0;
    }), ae = d(() => {
      var r;
      return i.animate ?? ((r = b.value.chart) == null ? void 0 : r.animate) ?? !0;
    }), L = d(() => ae.value && !X.value), ne = d(() => {
      const r = [];
      for (const h of C.value)
        h.seriesIndex === 0 && r.push(h.cx);
      return r;
    }), {
      crosshairX: y,
      nearestIndex: _,
      isHovering: re,
      tooltipData: B,
      tooltipStyle: ie,
      onBodyMouseMove: G,
      onBodyMouseLeave: V
    } = fe({
      containerRef: I,
      enabled: D,
      marginLeft: d(() => o.value.left),
      plotWidth: d(() => s.value.width),
      dataPointXs: ne,
      xAxisLabels: g,
      series: d(() => i.series),
      palette: w,
      tooltip: z,
      hideTooltip: Y,
      valueFormatter: i.valueFormatter
    }), se = d(() => _.value < 0 ? [] : i.series.map((r, h) => {
      var l;
      const t = C.value.find((A) => A.dataIndex === _.value && A.seriesIndex === h);
      return {
        cx: (t == null ? void 0 : t.cx) ?? 0,
        cy: (t == null ? void 0 : t.cy) ?? 0,
        color: r.color ?? w.value[h % w.value.length],
        name: r.name,
        value: ((l = r.data[_.value]) == null ? void 0 : l.value) ?? 0
      };
    }));
    function ce(r) {
      R("point-click", {
        index: r.dataIndex,
        seriesIndex: r.seriesIndex,
        value: r.value
      });
    }
    return (r, h) => (a(), n("div", {
      class: $(["nm-chart", "nm-chart--line"]),
      style: k(ee.value)
    }, [
      x.title || r.$slots.title ? (a(), n("div", be, [
        x.title ? (a(), n("span", Le, f(x.title), 1)) : p("", !0),
        ue(r.$slots, "title", {}, void 0, !0)
      ])) : p("", !0),
      c("div", {
        ref_key: "containerRef",
        ref: I,
        class: $(["nm-chart__body", { "nm-chart__body--hovering": e(re) }]),
        role: "img",
        "aria-label": te.value,
        tabindex: "0",
        onKeydown: h[0] || (h[0] = //@ts-ignore
        (...t) => e(N) && e(N)(...t)),
        onMousemove: h[1] || (h[1] = //@ts-ignore
        (...t) => e(G) && e(G)(...t)),
        onMouseleave: h[2] || (h[2] = //@ts-ignore
        (...t) => e(V) && e(V)(...t))
      }, [
        (a(), n("svg", {
          viewBox: `0 0 ${U.value} ${Z.value}`,
          class: "nm-chart__svg",
          "aria-hidden": "true",
          preserveAspectRatio: "xMidYMid meet"
        }, [
          c("defs", null, [
            c("clipPath", {
              id: `nm-plot-clip-line-${e(S)}`
            }, [
              c("rect", {
                x: e(o).left - 20,
                y: e(o).top - 20,
                width: e(s).width + 40,
                height: e(s).height + 40
              }, null, 8, Me)
            ], 8, Ie),
            (a(!0), n(m, null, v(e(M), (t, l) => (a(), n("linearGradient", {
              id: `nm-area-grad-${e(S)}-${l}`,
              key: "grad" + l,
              x1: "0",
              y1: "0",
              x2: "0",
              y2: "1"
            }, [
              c("stop", {
                offset: "0%",
                "stop-color": t.color,
                "stop-opacity": "0.18"
              }, null, 8, Be),
              c("stop", {
                offset: "100%",
                "stop-color": t.color,
                "stop-opacity": "0.01"
              }, null, 8, Ae)
            ], 8, Ce))), 128))
          ]),
          le.value ? (a(), n("g", {
            key: 0,
            "clip-path": `url(#nm-plot-clip-line-${e(S)})`
          }, [
            (a(!0), n(m, null, v(e(K), (t, l) => (a(), n("line", {
              key: "g" + l,
              x1: e(o).left,
              y1: e(o).top + e(s).height - (t - e(u)[0]) / (e(u)[e(u).length - 1] - e(u)[0] || 1) * e(s).height,
              x2: e(o).left + e(s).width,
              y2: e(o).top + e(s).height - (t - e(u)[0]) / (e(u)[e(u).length - 1] - e(u)[0] || 1) * e(s).height,
              stroke: "var(--nm-chart-grid-color)",
              "stroke-width": "0.5",
              "vector-effect": "non-scaling-stroke"
            }, null, 8, Te))), 128))
          ], 8, Pe)) : p("", !0),
          F.value ? (a(), n("g", ze, [
            c("line", {
              x1: e(o).left,
              y1: e(o).top,
              x2: e(o).left,
              y2: e(o).top + e(s).height,
              stroke: "var(--nm-chart-axis-color)",
              "stroke-width": "1",
              "vector-effect": "non-scaling-stroke"
            }, null, 8, Ne),
            (a(!0), n(m, null, v(e(H), (t, l) => (a(), n("text", {
              key: "y" + l,
              x: e(o).left - 8,
              y: e(o).top + e(s).height - (e(u)[l] - e(u)[0]) / (e(u)[e(u).length - 1] - e(u)[0] || 1) * e(s).height,
              "text-anchor": "end",
              "dominant-baseline": "middle",
              fill: "var(--nm-chart-label-color)",
              class: "nm-chart__tick-label"
            }, f(t), 9, We))), 128))
          ])) : p("", !0),
          F.value ? (a(), n("g", De, [
            c("line", {
              x1: e(o).left,
              y1: e(o).top + e(s).height,
              x2: e(o).left + e(s).width,
              y2: e(o).top + e(s).height,
              stroke: "var(--nm-chart-axis-color)",
              "stroke-width": "1",
              "vector-effect": "non-scaling-stroke"
            }, null, 8, Fe),
            (a(!0), n(m, null, v(e(g), (t, l) => P((a(), n("text", {
              key: "x" + l,
              x: e(o).left + (e(g).length > 1 ? l * (e(s).width / (e(g).length - 1)) : e(s).width / 2),
              y: e(o).top + e(s).height + 20,
              "text-anchor": l === 0 ? "start" : l === e(g).length - 1 ? "end" : "middle",
              fill: "var(--nm-chart-label-color)",
              class: "nm-chart__tick-label"
            }, f(t), 9, Ge)), [
              [T, l % e(E) === 0 || l === e(g).length - 1]
            ])), 128))
          ])) : p("", !0),
          c("g", {
            transform: `translate(${e(o).left}, ${e(o).top})`
          }, [
            (a(!0), n(m, null, v(e(M), (t, l) => P((a(), n("path", {
              key: "area" + l,
              d: t.areaPath,
              fill: `url(#nm-area-grad-${e(S)}-${l})`,
              class: $({ "nm-chart__area--animate": L.value })
            }, null, 10, Oe)), [
              [T, e(Q) && t.areaPath]
            ])), 128)),
            (a(!0), n(m, null, v(e(M), (t, l) => (a(), n("path", {
              key: "line" + l,
              d: t.path,
              fill: "none",
              stroke: t.color,
              "stroke-width": e(J),
              "stroke-linecap": "round",
              "stroke-linejoin": "round",
              class: $(["nm-chart__line", { "nm-chart__line--animate": L.value }]),
              style: k(L.value ? { animationDelay: `${l * 200}ms` } : {})
            }, null, 14, Re))), 128))
          ], 8, Ve),
          e(y) !== null ? (a(), n(m, { key: 3 }, [
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
            (a(!0), n(m, null, v(se.value, (t, l) => (a(), n("circle", {
              key: "cd" + l,
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
            (a(!0), n(m, null, v(e(C), (t, l) => P((a(), n("circle", {
              key: "pt" + l,
              cx: e(o).left + t.cx,
              cy: e(o).top + t.cy,
              r: e(y) !== null && t.dataIndex === e(_) ? e(W) + 1.5 : e(W),
              fill: t.color,
              stroke: (e(y) !== null && t.dataIndex === e(_), "var(--nm-surface-color)"),
              "stroke-width": e(y) !== null && t.dataIndex === e(_) ? 2.5 : 1.5,
              opacity: e(y) !== null && t.dataIndex !== e(_) ? 0.3 : 1,
              class: $([
                "nm-chart__point",
                {
                  "nm-chart__point--nearest": e(y) !== null && t.dataIndex === e(_),
                  "nm-chart__point--focused": t.isFocused,
                  "nm-chart__point--animate": L.value
                }
              ]),
              style: k(L.value ? { animationDelay: `${l * 60}ms` } : {}),
              role: "img",
              "aria-label": `${t.value}`,
              onClick: (A) => ce(t)
            }, null, 14, He)), [
              [T, e(q)]
            ])), 128))
          ])
        ], 8, Se)),
        me(ve, { name: "nm-chart-tooltip" }, {
          default: ye(() => [
            e(z).visible && D.value && e(B) ? (a(), n("div", {
              key: 0,
              class: "nm-chart__tooltip",
              style: k(e(ie))
            }, [
              c("div", Ke, f(e(B).header), 1),
              (a(!0), n(m, null, v(e(B).rows, (t, l) => (a(), n("div", {
                key: l,
                class: "nm-chart__tooltip-row"
              }, [
                c("span", {
                  class: "nm-chart__tooltip-dot",
                  style: k({ background: t.color })
                }, null, 4),
                c("span", null, [
                  _e(f(t.name) + ": ", 1),
                  c("strong", null, f(t.display), 1)
                ])
              ]))), 128))
            ], 4)) : p("", !0)
          ]),
          _: 1
        })
      ], 42, $e),
      oe.value && x.series.length > 0 ? (a(), n("div", {
        key: 1,
        class: "nm-chart__legend",
        role: "list",
        "aria-label": e(j)("chartLegend")
      }, [
        (a(!0), n(m, null, v(x.series, (t, l) => (a(), n("div", {
          key: l,
          class: "nm-chart__legend-item",
          role: "listitem"
        }, [
          c("span", {
            class: "nm-chart__legend-marker",
            style: k({ backgroundColor: t.color ?? e(w)[l % e(w).length] })
          }, null, 4),
          c("span", Ye, f(t.name), 1)
        ]))), 128))
      ], 8, Xe)) : p("", !0)
    ], 4));
  }
}), lt = /* @__PURE__ */ we(qe, [["__scopeId", "data-v-2d919e9a"]]);
export {
  lt as N
};

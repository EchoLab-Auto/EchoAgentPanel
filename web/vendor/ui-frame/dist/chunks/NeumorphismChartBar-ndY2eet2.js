import { defineComponent as te, computed as c, ref as G, openBlock as i, createElementBlock as a, normalizeStyle as w, normalizeClass as z, toDisplayString as g, createCommentVNode as m, renderSlot as oe, createElementVNode as d, unref as e, Fragment as y, renderList as f, createVNode as le, Transition as ne, withCtx as ie } from "vue";
import { useBarChart as ae } from "../composables/useBarChart.js";
import { useLocale as re } from "../composables/useLocale.js";
import { generateId as se } from "../utils/index.js";
import { useConfig as he } from "../composables/useConfig.js";
import { _ as ce } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismChartBar.css';const de = {
  key: 0,
  class: "nm-chart__header"
}, ue = {
  key: 0,
  class: "nm-chart__title"
}, me = ["aria-label"], ve = ["viewBox"], pe = ["id"], ge = ["x", "y", "width", "height"], ye = ["clip-path"], fe = ["x1", "y1", "x2", "y2"], _e = ["x1", "y1", "x2", "y2"], xe = { key: 1 }, we = ["x1", "y1", "x2", "y2"], ke = ["x", "y"], be = { key: 2 }, Be = ["x1", "y1", "x2", "y2"], Me = ["x", "y"], $e = ["clip-path"], Ce = ["x", "y", "width", "height", "fill", "rx", "aria-label", "onClick", "onMouseenter"], Le = ["aria-label"], Ae = { class: "nm-chart__legend-label" }, Ie = /* @__PURE__ */ te({
  __name: "NeumorphismChartBar",
  props: {
    series: { default: () => [] },
    width: { default: "100%" },
    height: { default: "300px" },
    orientation: { default: void 0 },
    stacked: { type: Boolean, default: void 0 },
    barGap: { default: void 0 },
    showTooltip: { type: Boolean, default: void 0 },
    showLegend: { type: Boolean, default: void 0 },
    showGrid: { type: Boolean, default: void 0 },
    showAxis: { type: Boolean, default: void 0 },
    animate: { type: Boolean, default: void 0 },
    yMin: {},
    yMax: {},
    title: {}
  },
  emits: ["bar-click"],
  setup(v, { emit: N }) {
    const r = v, R = N, { t: K } = re(), p = he(), V = c(
      () => {
        var t;
        return r.showTooltip ?? ((t = p.value.chart) == null ? void 0 : t.showTooltip) ?? !0;
      }
    ), E = c(
      () => {
        var t;
        return r.showLegend ?? ((t = p.value.chart) == null ? void 0 : t.showLegend) ?? !0;
      }
    ), F = c(() => {
      var t;
      return r.showGrid ?? ((t = p.value.chart) == null ? void 0 : t.showGrid) ?? !0;
    }), B = c(() => {
      var t;
      return r.showAxis ?? ((t = p.value.chart) == null ? void 0 : t.showAxis) ?? !0;
    }), Y = c(() => {
      var t;
      return r.animate ?? ((t = p.value.chart) == null ? void 0 : t.animate) ?? !0;
    }), _ = G(null), k = G(null), b = se("nm-bar"), {
      bars: D,
      xAxisLabels: M,
      yAxisLabels: j,
      yAxisTicks: s,
      gridLines: H,
      plotSize: n,
      resolvedMargin: o,
      palette: $,
      tooltip: x,
      reducedMotion: O,
      showTooltip: P,
      hideTooltip: W,
      handleChartKeydown: C
    } = ae({
      containerRef: _,
      series: c(() => r.series),
      orientation: r.orientation,
      stacked: r.stacked,
      barGap: r.barGap,
      yMin: r.yMin,
      yMax: r.yMax
    }), X = c(
      () => n.value.width + o.value.left + o.value.right
    ), q = c(
      () => n.value.height + o.value.top + o.value.bottom
    ), J = c(() => ({
      width: typeof r.width == "number" ? `${r.width}px` : r.width,
      height: typeof r.height == "number" ? `${r.height}px` : r.height
    })), Q = c(() => `Bar chart: ${r.series.map((u) => u.name).join(", ")}`), L = c(() => Y.value && !O.value), U = c(() => {
      if (!_.value) return { display: "none" };
      const t = _.value.getBoundingClientRect();
      return {
        left: `${x.value.x - t.left + 12}px`,
        top: `${x.value.y - t.top - 8}px`
      };
    });
    function A(t) {
      return `${t.dataIndex}-${t.seriesIndex}`;
    }
    function Z(t) {
      R("bar-click", {
        index: t.dataIndex,
        seriesIndex: t.seriesIndex,
        value: t.value
      });
    }
    function ee(t, u) {
      k.value = A(t), P(t.dataIndex, t.seriesIndex, u.clientX, u.clientY);
    }
    function I() {
      k.value = null, W();
    }
    const S = c(() => {
      const t = s.value;
      if (t.length < 2) return n.value.height;
      const u = t[t.length - 1] - t[0] || 1, l = t[0] ?? 0;
      return n.value.height - (0 - l) / u * n.value.height;
    });
    return (t, u) => (i(), a("div", {
      class: z(["nm-chart", "nm-chart--bar"]),
      style: w(J.value)
    }, [
      v.title || t.$slots.title ? (i(), a("div", de, [
        v.title ? (i(), a("span", ue, g(v.title), 1)) : m("", !0),
        oe(t.$slots, "title", {}, void 0, !0)
      ])) : m("", !0),
      d("div", {
        ref_key: "containerRef",
        ref: _,
        class: "nm-chart__body",
        role: "img",
        "aria-label": Q.value,
        tabindex: "0",
        onKeydown: u[0] || (u[0] = //@ts-ignore
        (...l) => e(C) && e(C)(...l)),
        onMouseleave: I
      }, [
        (i(), a("svg", {
          viewBox: `0 0 ${X.value} ${q.value}`,
          class: "nm-chart__svg",
          "aria-hidden": "true",
          preserveAspectRatio: "xMidYMid meet"
        }, [
          d("defs", null, [
            d("clipPath", {
              id: `nm-plot-clip-bar-${e(b)}`
            }, [
              d("rect", {
                x: e(o).left,
                y: e(o).top,
                width: e(n).width,
                height: e(n).height + 1
              }, null, 8, ge)
            ], 8, pe)
          ]),
          F.value ? (i(), a("g", {
            key: 0,
            "clip-path": `url(#nm-plot-clip-bar-${e(b)})`
          }, [
            (i(!0), a(y, null, f(e(H), (l, h) => (i(), a("line", {
              key: "g" + h,
              x1: e(o).left,
              y1: e(o).top + e(n).height - (l - e(s)[0]) / (e(s)[e(s).length - 1] - e(s)[0] || 1) * e(n).height,
              x2: e(o).left + e(n).width,
              y2: e(o).top + e(n).height - (l - e(s)[0]) / (e(s)[e(s).length - 1] - e(s)[0] || 1) * e(n).height,
              stroke: "var(--nm-chart-grid-color)",
              "stroke-width": "0.5",
              "vector-effect": "non-scaling-stroke"
            }, null, 8, fe))), 128)),
            d("line", {
              x1: e(o).left,
              y1: e(o).top + S.value,
              x2: e(o).left + e(n).width,
              y2: e(o).top + S.value,
              stroke: "var(--nm-chart-axis-color)",
              "stroke-width": "1",
              "vector-effect": "non-scaling-stroke"
            }, null, 8, _e)
          ], 8, ye)) : m("", !0),
          B.value ? (i(), a("g", xe, [
            d("line", {
              x1: e(o).left,
              y1: e(o).top,
              x2: e(o).left,
              y2: e(o).top + e(n).height,
              stroke: "var(--nm-chart-axis-color)",
              "stroke-width": "1",
              "vector-effect": "non-scaling-stroke"
            }, null, 8, we),
            (i(!0), a(y, null, f(e(j), (l, h) => (i(), a("text", {
              key: "y" + h,
              x: e(o).left - 8,
              y: e(o).top + e(n).height - (e(s)[h] - e(s)[0]) / (e(s)[e(s).length - 1] - e(s)[0] || 1) * e(n).height,
              "text-anchor": "end",
              "dominant-baseline": "middle",
              fill: "var(--nm-chart-label-color)",
              "font-size": "11",
              class: "nm-chart__tick-label"
            }, g(l), 9, ke))), 128))
          ])) : m("", !0),
          B.value ? (i(), a("g", be, [
            d("line", {
              x1: e(o).left,
              y1: e(o).top + e(n).height,
              x2: e(o).left + e(n).width,
              y2: e(o).top + e(n).height,
              stroke: "var(--nm-chart-axis-color)",
              "stroke-width": "1",
              "vector-effect": "non-scaling-stroke"
            }, null, 8, Be),
            (i(!0), a(y, null, f(e(M), (l, h) => (i(), a("text", {
              key: "x" + h,
              x: e(o).left + (h + 0.5) * (e(n).width / e(M).length),
              y: e(o).top + e(n).height + 20,
              "text-anchor": "middle",
              fill: "var(--nm-chart-label-color)",
              "font-size": "11",
              class: "nm-chart__tick-label"
            }, g(l), 9, Me))), 128))
          ])) : m("", !0),
          d("g", {
            "clip-path": `url(#nm-plot-clip-bar-${e(b)})`
          }, [
            (i(!0), a(y, null, f(e(D), (l, h) => (i(), a("rect", {
              key: h,
              x: e(o).left + l.x,
              y: e(o).top + l.y,
              width: l.width,
              height: l.height,
              fill: l.color,
              rx: l.width <= 6 || l.height <= 6 ? 1 : 4,
              class: z([
                "nm-chart__bar",
                {
                  "nm-chart__bar--hovered": k.value === A(l),
                  "nm-chart__bar--focused": l.isFocused,
                  "nm-chart__bar--animate": L.value
                }
              ]),
              style: w(
                L.value ? { transformOrigin: "bottom", animationDelay: `${h * 40}ms` } : {}
              ),
              role: "img",
              "aria-label": `${l.value}`,
              onClick: (T) => Z(l),
              onMouseenter: (T) => ee(l, T),
              onMouseleave: I
            }, null, 46, Ce))), 128))
          ], 8, $e)
        ], 8, ve)),
        le(ne, { name: "nm-chart-tooltip" }, {
          default: ie(() => [
            e(x).visible && V.value ? (i(), a("div", {
              key: 0,
              class: "nm-chart__tooltip",
              style: w(U.value)
            }, g(e(x).content), 5)) : m("", !0)
          ]),
          _: 1
        })
      ], 40, me),
      E.value && v.series.length > 0 ? (i(), a("div", {
        key: 1,
        class: "nm-chart__legend",
        role: "list",
        "aria-label": e(K)("chartLegend")
      }, [
        (i(!0), a(y, null, f(v.series, (l, h) => (i(), a("div", {
          key: h,
          class: "nm-chart__legend-item",
          role: "listitem"
        }, [
          d("span", {
            class: "nm-chart__legend-marker",
            style: w({ backgroundColor: l.color ?? e($)[h % e($).length] })
          }, null, 4),
          d("span", Ae, g(l.name), 1)
        ]))), 128))
      ], 8, Le)) : m("", !0)
    ], 4));
  }
}), Ke = /* @__PURE__ */ ce(Ie, [["__scopeId", "data-v-9e202d32"]]);
export {
  Ke as N
};

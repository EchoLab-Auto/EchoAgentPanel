import { defineComponent as rt, ref as H, computed as m, openBlock as i, createElementBlock as n, normalizeStyle as w, normalizeClass as M, toDisplayString as k, createCommentVNode as u, renderSlot as st, createElementVNode as c, unref as t, Fragment as p, renderList as _, createVNode as at, Transition as ht, withCtx as ct } from "vue";
import { useCandlestickChart as dt } from "../composables/useCandlestickChart.js";
import { useLocale as ut } from "../composables/useLocale.js";
import { useConfig as mt } from "../composables/useConfig.js";
import { generateId as pt } from "../utils/index.js";
import { _ as _t } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismChartCandlestick.css';const vt = {
  key: 0,
  class: "nm-chart__header"
}, yt = {
  key: 0,
  class: "nm-chart__title"
}, xt = ["aria-label"], ft = ["viewBox"], gt = ["id"], wt = ["x", "y", "width", "height"], kt = ["id"], $t = ["x", "y", "width", "height"], Ct = ["clip-path"], bt = ["x1", "y1", "x2", "y2"], At = ["clip-path"], Mt = ["x1", "y1", "x2", "y2"], Bt = ["clip-path"], St = ["x", "y", "width", "height", "fill"], Tt = ["transform"], Lt = ["d", "stroke"], Vt = ["clip-path"], Ot = ["x1", "y1", "x2", "y2"], Gt = ["x", "y", "width", "height", "fill", "rx", "onClick", "onMouseenter"], Nt = ["x1", "y1", "x2", "y2"], Yt = { key: 5 }, Pt = ["x1", "y1", "x2", "y2"], Dt = ["x", "y"], Ht = { key: 6 }, It = ["x", "y"], Rt = { key: 7 }, zt = ["x1", "y1", "x2", "y2"], Et = ["x", "y"], Ft = {
  key: 1,
  class: "nm-chart__legend",
  role: "list"
}, Xt = { class: "nm-chart__legend-label" }, jt = /* @__PURE__ */ rt({
  __name: "NeumorphismChartCandlestick",
  props: {
    data: { default: () => [] },
    width: { default: "100%" },
    height: { default: "400px" },
    showVolume: { type: Boolean, default: void 0 },
    showMA: { type: Boolean, default: void 0 },
    maPeriods: { default: void 0 },
    upColor: {},
    downColor: {},
    showTooltip: { type: Boolean, default: void 0 },
    showGrid: { type: Boolean, default: void 0 },
    showAxis: { type: Boolean, default: void 0 },
    animate: { type: Boolean, default: void 0 },
    title: {}
  },
  emits: ["candle-click"],
  setup($, { emit: I }) {
    const s = $, R = I, { t: C } = ut(), B = H(null), V = H(null), x = pt("nm-cs"), {
      candles: z,
      volumeBars: E,
      maLines: S,
      xAxisLabels: F,
      yAxisLabels: X,
      yAxisTicks: h,
      volumeYAxisLabels: j,
      volumeYAxisTicks: a,
      gridLines: K,
      plotSize: d,
      resolvedMargin: e,
      priceAreaHeight: v,
      volumeAreaHeight: y,
      volumeAreaTop: f,
      resolvedShowVolume: T,
      resolvedShowMA: O,
      tooltip: b,
      reducedMotion: U,
      showTooltip: W,
      hideTooltip: q,
      handleChartKeydown: G
    } = dt({
      containerRef: B,
      data: m(() => s.data),
      showVolume: s.showVolume,
      showMA: s.showMA,
      maPeriods: s.maPeriods,
      upColor: s.upColor,
      downColor: s.downColor,
      showGrid: s.showGrid,
      showAxis: s.showAxis
    }), J = m(
      () => d.value.width + e.value.left + e.value.right
    ), Q = m(
      () => d.value.height + e.value.top + e.value.bottom
    ), Z = m(() => ({
      width: typeof s.width == "number" ? `${s.width}px` : s.width,
      height: typeof s.height == "number" ? `${s.height}px` : s.height
    })), tt = m(() => `Candlestick chart with ${s.data.length} data points`), L = mt(), et = m(
      () => {
        var l;
        return s.showTooltip ?? ((l = L.value.chart) == null ? void 0 : l.showTooltip) ?? !0;
      }
    ), N = m(() => {
      var l;
      return s.showGrid ?? ((l = L.value.chart) == null ? void 0 : l.showGrid) ?? !0;
    }), Y = m(() => {
      var l;
      return s.showAxis ?? ((l = L.value.chart) == null ? void 0 : l.showAxis) ?? !0;
    }), ot = m(() => {
      var l;
      return s.animate ?? ((l = L.value.chart) == null ? void 0 : l.animate) ?? !0;
    }), g = m(() => ot.value && !U.value), lt = m(() => {
      if (!B.value) return { display: "none" };
      const l = B.value.getBoundingClientRect();
      return {
        left: `${b.value.x - l.left + 12}px`,
        top: `${b.value.y - l.top - 8}px`
      };
    });
    function it(l) {
      R("candle-click", {
        index: l.index,
        open: l.open,
        high: l.high,
        low: l.low,
        close: l.close,
        volume: l.volume
      });
    }
    function nt(l, A) {
      V.value = l.index;
      const o = [
        `${C("chartOhlcOpen")}: ${l.open}`,
        `${C("chartOhlcHigh")}: ${l.high}`,
        `${C("chartOhlcLow")}: ${l.low}`,
        `${C("chartOhlcClose")}: ${l.close}`,
        l.volume ? `${C("chartVolume")}: ${l.volume}` : ""
      ].filter(Boolean).join(" | ");
      W(l.index, 0, A.clientX, A.clientY), b.value.content = o;
    }
    function P() {
      V.value = null, q();
    }
    return (l, A) => (i(), n("div", {
      class: M(["nm-chart", "nm-chart--candlestick"]),
      style: w(Z.value)
    }, [
      $.title || l.$slots.title ? (i(), n("div", vt, [
        $.title ? (i(), n("span", yt, k($.title), 1)) : u("", !0),
        st(l.$slots, "title", {}, void 0, !0)
      ])) : u("", !0),
      c("div", {
        ref_key: "containerRef",
        ref: B,
        class: "nm-chart__body",
        role: "img",
        "aria-label": tt.value,
        tabindex: "0",
        onKeydown: A[0] || (A[0] = //@ts-ignore
        (...o) => t(G) && t(G)(...o)),
        onMouseleave: P
      }, [
        (i(), n("svg", {
          viewBox: `0 0 ${J.value} ${Q.value}`,
          class: "nm-chart__svg",
          "aria-hidden": "true",
          preserveAspectRatio: "xMidYMid meet"
        }, [
          c("defs", null, [
            c("clipPath", {
              id: `nm-price-clip-${t(x)}`
            }, [
              c("rect", {
                x: t(e).left - 1,
                y: t(e).top - 1,
                width: t(d).width + 2,
                height: t(v) + 2
              }, null, 8, wt)
            ], 8, gt),
            c("clipPath", {
              id: `nm-volume-clip-${t(x)}`
            }, [
              c("rect", {
                x: t(e).left - 1,
                y: t(e).top + t(f) - 1,
                width: t(d).width + 2,
                height: t(y) + 2
              }, null, 8, $t)
            ], 8, kt)
          ]),
          N.value ? (i(), n("g", {
            key: 0,
            "clip-path": `url(#nm-price-clip-${t(x)})`
          }, [
            (i(!0), n(p, null, _(t(K), (o, r) => (i(), n("line", {
              key: "g" + r,
              x1: t(e).left,
              y1: t(e).top + t(v) - (o - t(h)[0]) / (t(h)[t(h).length - 1] - t(h)[0] || 1) * t(v),
              x2: t(e).left + t(d).width,
              y2: t(e).top + t(v) - (o - t(h)[0]) / (t(h)[t(h).length - 1] - t(h)[0] || 1) * t(v),
              stroke: "var(--nm-chart-grid-color)",
              "stroke-width": "0.5",
              "vector-effect": "non-scaling-stroke"
            }, null, 8, bt))), 128))
          ], 8, Ct)) : u("", !0),
          N.value && t(T) ? (i(), n("g", {
            key: 1,
            "clip-path": `url(#nm-volume-clip-${t(x)})`
          }, [
            (i(!0), n(p, null, _(t(a), (o, r) => (i(), n("line", {
              key: "vg" + r,
              x1: t(e).left,
              y1: t(e).top + t(f) + t(y) - (o - t(a)[0]) / (t(a)[t(a).length - 1] - t(a)[0] || 1) * t(y),
              x2: t(e).left + t(d).width,
              y2: t(e).top + t(f) + t(y) - (o - t(a)[0]) / (t(a)[t(a).length - 1] - t(a)[0] || 1) * t(y),
              stroke: "var(--nm-chart-grid-color)",
              "stroke-width": "0.5",
              "stroke-dasharray": "3,3",
              "vector-effect": "non-scaling-stroke"
            }, null, 8, Mt))), 128))
          ], 8, At)) : u("", !0),
          t(T) ? (i(), n("g", {
            key: 2,
            "clip-path": `url(#nm-volume-clip-${t(x)})`
          }, [
            (i(!0), n(p, null, _(t(E), (o, r) => (i(), n("rect", {
              key: "v" + r,
              x: t(e).left + o.x,
              y: t(e).top + o.y,
              width: o.width,
              height: Math.max(0.5, o.height),
              fill: o.color,
              opacity: 0.35,
              rx: "1",
              class: M(["nm-chart__volume-bar", { "nm-chart__volume-bar--animate": g.value }]),
              style: w(
                g.value ? { transformOrigin: "bottom", animationDelay: `${r * 20}ms` } : {}
              )
            }, null, 14, St))), 128))
          ], 8, Bt)) : u("", !0),
          t(O) && t(S).length > 0 ? (i(), n("g", {
            key: 3,
            transform: `translate(${t(e).left}, ${t(e).top})`
          }, [
            (i(!0), n(p, null, _(t(S), (o, r) => (i(), n("path", {
              key: "ma" + r,
              d: o.path,
              fill: "none",
              stroke: o.color,
              "stroke-width": 1.5,
              "stroke-linecap": "round",
              "stroke-linejoin": "round",
              class: M(["nm-chart__ma-line", { "nm-chart__ma-line--animate": g.value }]),
              style: w(g.value ? { animationDelay: `${r * 200}ms` } : {})
            }, null, 14, Lt))), 128))
          ], 8, Tt)) : u("", !0),
          c("g", {
            "clip-path": `url(#nm-price-clip-${t(x)})`
          }, [
            (i(!0), n(p, null, _(t(z), (o, r) => (i(), n("g", {
              key: "c" + r,
              class: M({ "nm-chart__candle-group--hovered": V.value === r })
            }, [
              c("line", {
                x1: t(e).left + o.wickX,
                y1: t(e).top + o.wickY1,
                x2: t(e).left + o.wickX,
                y2: t(e).top + o.wickY2,
                stroke: "var(--nm-chart-wick-color)",
                "stroke-width": "1",
                "vector-effect": "non-scaling-stroke"
              }, null, 8, Ot),
              c("rect", {
                x: t(e).left + o.x,
                y: t(e).top + o.y,
                width: o.width,
                height: Math.max(1, o.height),
                fill: o.color,
                rx: o.width <= 3 ? 1 : 2,
                class: M([
                  "nm-chart__candle-body",
                  {
                    "nm-chart__candle-body--up": o.isUp,
                    "nm-chart__candle-body--down": !o.isUp,
                    "nm-chart__candle-body--focused": o.isFocused,
                    "nm-chart__candle-body--animate": g.value
                  }
                ]),
                style: w(
                  g.value ? { transformOrigin: "bottom", animationDelay: `${r * 15}ms` } : {}
                ),
                onClick: (D) => it(o),
                onMouseenter: (D) => nt(o, D),
                onMouseleave: P
              }, null, 46, Gt)
            ], 2))), 128))
          ], 8, Vt),
          t(T) ? (i(), n("line", {
            key: 4,
            x1: t(e).left,
            y1: t(e).top + t(f),
            x2: t(e).left + t(d).width,
            y2: t(e).top + t(f),
            stroke: "var(--nm-chart-axis-color)",
            "stroke-width": "0.5",
            "stroke-dasharray": "4,4",
            "vector-effect": "non-scaling-stroke"
          }, null, 8, Nt)) : u("", !0),
          Y.value ? (i(), n("g", Yt, [
            c("line", {
              x1: t(e).left,
              y1: t(e).top,
              x2: t(e).left,
              y2: t(e).top + t(v),
              stroke: "var(--nm-chart-axis-color)",
              "stroke-width": "1",
              "vector-effect": "non-scaling-stroke"
            }, null, 8, Pt),
            (i(!0), n(p, null, _(t(X), (o, r) => (i(), n("text", {
              key: "py" + r,
              x: t(e).left - 8,
              y: t(e).top + t(v) - (t(h)[r] - t(h)[0]) / (t(h)[t(h).length - 1] - t(h)[0] || 1) * t(v),
              "text-anchor": "end",
              "dominant-baseline": "middle",
              fill: "var(--nm-chart-label-color)",
              class: "nm-chart__tick-label"
            }, k(o), 9, Dt))), 128))
          ])) : u("", !0),
          $.showAxis && t(T) ? (i(), n("g", Ht, [
            (i(!0), n(p, null, _(t(j), (o, r) => (i(), n("text", {
              key: "vy" + r,
              x: t(e).left + t(d).width + 8,
              y: t(e).top + t(f) + t(y) - (t(a)[r] - t(a)[0]) / (t(a)[t(a).length - 1] - t(a)[0] || 1) * t(y),
              "text-anchor": "start",
              "dominant-baseline": "middle",
              fill: "var(--nm-chart-label-color)",
              class: "nm-chart__tick-label"
            }, k(o), 9, It))), 128))
          ])) : u("", !0),
          Y.value ? (i(), n("g", Rt, [
            c("line", {
              x1: t(e).left,
              y1: t(e).top + t(d).height,
              x2: t(e).left + t(d).width,
              y2: t(e).top + t(d).height,
              stroke: "var(--nm-chart-axis-color)",
              "stroke-width": "1",
              "vector-effect": "non-scaling-stroke"
            }, null, 8, zt),
            (i(!0), n(p, null, _(t(F), (o, r) => (i(), n("text", {
              key: "xl" + r,
              x: t(e).left + o.x,
              y: t(e).top + t(d).height + 16,
              "text-anchor": "middle",
              fill: "var(--nm-chart-label-color)",
              class: "nm-chart__tick-label"
            }, k(o.label), 9, Et))), 128))
          ])) : u("", !0)
        ], 8, ft)),
        at(ht, { name: "nm-chart-tooltip" }, {
          default: ct(() => [
            t(b).visible && et.value ? (i(), n("div", {
              key: 0,
              class: "nm-chart__tooltip",
              style: w(lt.value)
            }, k(t(b).content), 5)) : u("", !0)
          ]),
          _: 1
        })
      ], 40, xt),
      t(O) && t(S).length > 0 ? (i(), n("div", Ft, [
        (i(!0), n(p, null, _(t(S), (o, r) => (i(), n("div", {
          key: r,
          class: "nm-chart__legend-item",
          role: "listitem"
        }, [
          c("span", {
            class: "nm-chart__legend-marker",
            style: w({ backgroundColor: o.color })
          }, null, 4),
          c("span", Xt, k(o.name), 1)
        ]))), 128))
      ])) : u("", !0)
    ], 4));
  }
}), Zt = /* @__PURE__ */ _t(jt, [["__scopeId", "data-v-22e3a305"]]);
export {
  Zt as N
};

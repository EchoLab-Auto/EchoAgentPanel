import { defineComponent as m, computed as r, provide as N, openBlock as v, createElementBlock as f, normalizeStyle as g, normalizeClass as x, renderSlot as y, inject as b } from "vue";
import { RowGutterKey as _ } from "../composables/injectionKeys.js";
import { u as A } from "./createComponent-jnXBYqCm.js";
import { _ as h } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismCol.css';const B = /* @__PURE__ */ m({
  __name: "NeumorphismRow",
  props: {
    gutter: {},
    justify: {},
    align: {},
    wrap: { type: Boolean, default: void 0 }
  },
  setup(i) {
    const t = i, { config: l, resolveProp: o } = A(), a = r(() => {
      var e;
      return o(t.gutter, (e = l.value.grid) == null ? void 0 : e.gutter, 0);
    }), u = r(
      () => {
        var e;
        return o(t.justify, (e = l.value.grid) == null ? void 0 : e.justify, "start");
      }
    ), n = r(() => {
      var e;
      return o(t.align, (e = l.value.grid) == null ? void 0 : e.align, "stretch");
    }), s = r(() => {
      var e;
      return o(t.wrap, (e = l.value.grid) == null ? void 0 : e.wrap, !0);
    }), p = r(
      () => Array.isArray(a.value) ? a.value[0] : a.value
    ), d = r(
      () => Array.isArray(a.value) ? a.value[1] : a.value
    );
    N(_, { x: p, y: d });
    const w = {
      start: "flex-start",
      center: "center",
      end: "flex-end",
      "space-between": "space-between",
      "space-around": "space-around",
      "space-evenly": "space-evenly"
    }, $ = {
      start: "flex-start",
      center: "center",
      end: "flex-end",
      stretch: "stretch",
      baseline: "baseline"
    }, j = r(() => {
      const e = p.value, c = d.value;
      if (!(e === 0 && c === 0))
        return {
          marginLeft: e ? `${-e / 2}px` : void 0,
          marginRight: e ? `${-e / 2}px` : void 0,
          rowGap: c ? `${c}px` : void 0
        };
    }), C = r(() => ["nm-row", { "nm-row--nowrap": !s.value }]);
    return (e, c) => (v(), f("div", {
      class: x(C.value),
      style: g([
        j.value,
        { justifyContent: w[u.value], alignItems: $[n.value] }
      ])
    }, [
      y(e.$slots, "default", {}, void 0, !0)
    ], 6));
  }
}), k = /* @__PURE__ */ h(B, [["__scopeId", "data-v-4e2eb571"]]), R = /* @__PURE__ */ m({
  __name: "NeumorphismCol",
  props: {
    span: { default: 24 },
    offset: {},
    xs: {},
    sm: {},
    md: {},
    lg: {},
    xl: {},
    xxl: {}
  },
  setup(i) {
    const t = i, l = b(_, {
      x: r(() => 0),
      y: r(() => 0)
    });
    function o(n, s) {
      return s === void 0 || s === "" ? "" : `${n}${s}`;
    }
    const a = r(() => [
      o("nm-col-", t.span),
      o("nm-col-offset-", t.offset),
      o("nm-col-xs-", t.xs),
      o("nm-col-sm-", t.sm),
      o("nm-col-md-", t.md),
      o("nm-col-lg-", t.lg),
      o("nm-col-xl-", t.xl),
      o("nm-col-xxl-", t.xxl),
      "nm-col"
    ].filter(Boolean)), u = r(() => {
      const n = l.x.value, s = l.y.value;
      if (!(n === 0 && s === 0))
        return {
          paddingLeft: n ? `${n / 2}px` : void 0,
          paddingRight: n ? `${n / 2}px` : void 0,
          paddingTop: s ? `${s / 2}px` : void 0,
          paddingBottom: s ? `${s / 2}px` : void 0
        };
    });
    return (n, s) => (v(), f("div", {
      class: x(a.value),
      style: g(u.value)
    }, [
      y(n.$slots, "default", {}, void 0, !0)
    ], 6));
  }
}), z = /* @__PURE__ */ h(R, [["__scopeId", "data-v-c367585e"]]);
export {
  z as N,
  k as a
};

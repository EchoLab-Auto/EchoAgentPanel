import { defineComponent as x, computed as l, openBlock as s, createElementBlock as r, unref as e, createElementVNode as p, normalizeStyle as f, Fragment as N, renderList as V, renderSlot as v, createCommentVNode as H } from "vue";
import { useVirtualList as L } from "../composables/useVirtualList.js";
import { _ as S } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismVirtualList.css';const F = {
  key: 0,
  class: "nm-virtual-list__empty"
}, I = /* @__PURE__ */ x({
  __name: "NeumorphismVirtualList",
  props: {
    items: { default: () => [] },
    itemHeight: { default: 40 },
    overscan: { default: 5 },
    keyField: { default: "id" }
  },
  setup(o, { expose: _ }) {
    const i = o, { containerRef: h, visibleItems: n, totalHeight: y, offsetY: g, scrollTo: k, handleScroll: a, startIndex: m } = L({
      items: l(() => i.items),
      itemHeight: l(() => i.itemHeight),
      overscan: l(() => i.overscan)
    });
    return _({ scrollTo: k }), (d, u) => (s(), r("div", {
      ref_key: "containerRef",
      ref: h,
      class: "nm-virtual-list",
      onScroll: u[0] || (u[0] = //@ts-ignore
      (...t) => e(a) && e(a)(...t))
    }, [
      p("div", {
        class: "nm-virtual-list__spacer",
        style: f({ height: e(y) + "px" })
      }, [
        p("div", {
          class: "nm-virtual-list__visible",
          style: f({ transform: `translateY(${e(g)}px)` })
        }, [
          (s(!0), r(N, null, V(e(n), (t, c) => (s(), r("div", {
            key: t[o.keyField] ?? e(m) + c,
            class: "nm-virtual-list__item"
          }, [
            v(d.$slots, "default", {
              item: t,
              index: e(m) + c
            }, void 0, !0)
          ]))), 128))
        ], 4)
      ], 4),
      e(n).length === 0 ? (s(), r("div", F, [
        v(d.$slots, "empty", {}, void 0, !0)
      ])) : H("", !0)
    ], 544));
  }
}), C = /* @__PURE__ */ S(I, [["__scopeId", "data-v-8586c230"]]);
export {
  C as N
};

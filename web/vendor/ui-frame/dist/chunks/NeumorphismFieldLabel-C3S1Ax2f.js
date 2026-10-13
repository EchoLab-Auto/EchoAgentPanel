import { defineComponent as l, openBlock as o, createElementBlock as t, createTextVNode as a, toDisplayString as n, createCommentVNode as r } from "vue";
import { _ as s } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismFieldLabel.css';const c = ["for"], d = {
  key: 0,
  class: "nm-field__required"
}, i = /* @__PURE__ */ l({
  __name: "NeumorphismFieldLabel",
  props: {
    label: {},
    required: { type: Boolean },
    forId: {}
  },
  setup(e) {
    return (m, _) => e.label ? (o(), t("label", {
      key: 0,
      for: e.forId,
      class: "nm-field__label"
    }, [
      a(n(e.label) + " ", 1),
      e.required ? (o(), t("span", d, "*")) : r("", !0)
    ], 8, c)) : r("", !0);
  }
}), p = /* @__PURE__ */ s(i, [["__scopeId", "data-v-86f1558d"]]);
export {
  p as N
};

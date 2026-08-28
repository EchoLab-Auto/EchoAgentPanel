import { defineComponent as a, openBlock as o, createElementBlock as t, createTextVNode as l, toDisplayString as n, createCommentVNode as r } from "vue";
import { _ as s } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismFieldLabel.css';const c = ["for"], i = {
  key: 0,
  class: "nm-field__required"
}, d = /* @__PURE__ */ a({
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
      l(n(e.label) + " ", 1),
      e.required ? (o(), t("span", i, "*")) : r("", !0)
    ], 8, c)) : r("", !0);
  }
}), p = /* @__PURE__ */ s(d, [["__scopeId", "data-v-0594a3a1"]]);
export {
  p as N
};

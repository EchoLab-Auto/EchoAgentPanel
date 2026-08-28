import { defineComponent as r, openBlock as o, createElementBlock as t, toDisplayString as s, createCommentVNode as m } from "vue";
import { _ as i } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../NeumorphismFieldError.css';const a = ["id"], n = /* @__PURE__ */ r({
  __name: "NeumorphismFieldError",
  props: {
    id: {},
    message: {}
  },
  setup(e) {
    return (c, d) => e.message ? (o(), t("div", {
      key: 0,
      id: e.id,
      class: "nm-field__error",
      role: "alert"
    }, s(e.message), 9, a)) : m("", !0);
  }
}), p = /* @__PURE__ */ i(n, [["__scopeId", "data-v-fade598e"]]);
export {
  p as N
};

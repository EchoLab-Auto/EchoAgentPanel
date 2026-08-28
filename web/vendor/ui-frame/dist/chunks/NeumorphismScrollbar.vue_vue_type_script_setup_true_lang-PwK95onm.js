import { defineComponent as e, toRef as o, onMounted as n, createCommentVNode as c } from "vue";
import l from "../composables/useScrollbar.js";
const i = /* @__PURE__ */ e({
  __name: "NeumorphismScrollbar",
  props: {
    variant: { default: "standard" },
    target: { default: "" },
    dotColor: { default: "" },
    accentColor: { default: "" },
    sigma: { default: 14 }
  },
  setup(r) {
    const t = r, { start: a } = l({
      variant: o(t, "variant"),
      target: o(t, "target"),
      dotColor: o(t, "dotColor"),
      accentColor: o(t, "accentColor"),
      sigma: o(t, "sigma")
    });
    return n(a), (s, m) => c("", !0);
  }
});
export {
  i as _
};

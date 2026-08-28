import { defineComponent as n, computed as a, openBlock as l, createElementBlock as d, renderSlot as c, unref as t } from "vue";
import { provideTheme as h } from "../composables/useTheme.js";
import { _ as p } from "./_plugin-vue_export-helper-CHgC5LLL.js";
import '../ThemeProvider.css';const f = { class: "nm-theme-provider nm-root" }, u = /* @__PURE__ */ n({
  __name: "ThemeProvider",
  props: {
    defaultTheme: { default: "auto" },
    storageKey: { default: "nm-theme-preference" },
    followSystem: { type: Boolean, default: !0 }
  },
  setup(r) {
    const o = r, m = a(() => ({
      defaultTheme: o.defaultTheme,
      storageKey: o.storageKey,
      followSystem: o.followSystem
    })), e = h(m);
    return (s, i) => (l(), d("div", f, [
      c(s.$slots, "default", {
        theme: t(e).theme,
        currentTheme: t(e).currentTheme,
        isDark: t(e).isDark,
        setTheme: t(e).setTheme,
        toggleTheme: t(e).toggleTheme
      }, void 0, !0)
    ]));
  }
}), v = /* @__PURE__ */ p(u, [["__scopeId", "data-v-4d385e26"]]);
export {
  v as T
};

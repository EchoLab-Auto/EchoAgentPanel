import { ref as v, computed as u } from "vue";
import { generateId as m } from "../utils/index.js";
function g(n) {
  const o = v(!1), r = u(n), i = n(), f = i.id || m(`nm-${i.prefix}`), c = u(() => typeof r.value.error == "string" ? r.value.error : ""), l = u(() => !!r.value.error);
  function d(e) {
    return u(() => [
      e,
      // 数字尺寸挂 `--sized` 而不是 `--<数字>`：几何量全部来自组件根节点的
      // 内联 CSS 变量，档位 class 一行不动，两条路径互不覆盖
      typeof r.value.size == "number" ? `${e}--sized` : `${e}--${r.value.size}`,
      {
        [`${e}--focused`]: o.value,
        [`${e}--disabled`]: r.value.disabled,
        [`${e}--error`]: l.value
      }
    ]);
  }
  function a(e, t) {
    o.value = !0, t("focus", e);
  }
  function s(e, t) {
    o.value = !1, t("blur", e);
  }
  return {
    isFocused: o,
    fieldId: f,
    errorMessage: c,
    hasError: l,
    baseClassList: d,
    handleFocus: a,
    handleBlur: s
  };
}
export {
  g as useFormField
};

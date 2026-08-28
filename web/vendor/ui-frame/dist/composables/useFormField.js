import { ref as v, computed as u } from "vue";
import { generateId as m } from "../utils/index.js";
function g(n) {
  const o = v(!1), r = u(n), i = n(), c = i.id || m(`nm-${i.prefix}`), f = u(() => typeof r.value.error == "string" ? r.value.error : ""), l = u(() => !!r.value.error);
  function d(e) {
    return u(() => [
      e,
      `${e}--${r.value.size}`,
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
    fieldId: c,
    errorMessage: f,
    hasError: l,
    baseClassList: d,
    handleFocus: a,
    handleBlur: s
  };
}
export {
  g as useFormField
};

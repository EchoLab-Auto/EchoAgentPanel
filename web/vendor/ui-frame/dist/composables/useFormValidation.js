const f = {
  formRequired: "必填字段",
  formMinLength: "最少 {min} 个字符",
  formMaxLength: "最多 {max} 个字符",
  formPattern: "格式不正确",
  formMin: "不能小于 {min}",
  formMax: "不能大于 {max}",
  formValidator: "验证失败"
};
function o(r, m) {
  return m ? r.replace(/\{(\w+)\}/g, (e, t) => String(m[t] ?? `{${t}}`)) : r;
}
function g(r, m, e) {
  const t = (n, i) => o((e == null ? void 0 : e[n]) ?? f[n], i);
  for (const n of m) {
    if (n.required && (r == null || r === ""))
      return n.message || t("formRequired");
    if (!(r == null || r === "")) {
      if (typeof r == "string") {
        if (n.minLength && r.length < n.minLength)
          return n.message || t("formMinLength", { min: n.minLength });
        if (n.maxLength && r.length > n.maxLength)
          return n.message || t("formMaxLength", { max: n.maxLength });
        if (n.pattern && !n.pattern.test(r))
          return n.message || t("formPattern");
      }
      if (typeof r == "number") {
        if (n.min !== void 0 && r < n.min)
          return n.message || t("formMin", { min: n.min });
        if (n.max !== void 0 && r > n.max)
          return n.message || t("formMax", { max: n.max });
      }
      if (n.validator) {
        const i = n.validator(r);
        if (typeof i == "string") return i;
        if (i === !1) return n.message || t("formValidator");
      }
    }
  }
  return "";
}
export {
  g as validateFieldValue
};

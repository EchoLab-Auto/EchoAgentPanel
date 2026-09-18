import { ref as n } from "vue";
function c(r = {}) {
  const { resetDelay: a = 1200 } = r, e = n(!1);
  let t;
  async function i(o) {
    try {
      return typeof navigator > "u" || !navigator.clipboard ? !1 : (await navigator.clipboard.writeText(o), e.value = !0, t && clearTimeout(t), t = setTimeout(() => {
        e.value = !1;
      }, a), !0);
    } catch {
      return !1;
    }
  }
  return { copied: e, copy: i };
}
export {
  c as useClipboard
};

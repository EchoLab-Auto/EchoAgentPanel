import { ref as f } from "vue";
function d(a = {}) {
  const { resetDelay: i = 1200 } = a, r = f(!1);
  let n;
  function c(t) {
    if (typeof document > "u") return !1;
    const e = document.createElement("textarea");
    e.value = t, e.style.position = "fixed", e.style.opacity = "0", document.body.appendChild(e), e.select();
    try {
      return document.execCommand("copy");
    } catch {
      return !1;
    } finally {
      e.remove();
    }
  }
  function o() {
    r.value = !0, n && clearTimeout(n), n = setTimeout(() => {
      r.value = !1;
    }, i);
  }
  async function u(t) {
    try {
      if (typeof navigator < "u" && navigator.clipboard)
        return await navigator.clipboard.writeText(t), o(), !0;
    } catch {
    }
    return c(t) ? (o(), !0) : !1;
  }
  return { copied: r, copy: u };
}
export {
  d as useClipboard
};

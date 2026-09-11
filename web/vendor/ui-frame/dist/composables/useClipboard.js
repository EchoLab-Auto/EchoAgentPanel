import { ref as n } from "vue";

// ⚠️ 本地补丁（2026-09）：非安全上下文（HTTP 经局域网 IP 访问 Panel 时
// window.isSecureContext === false）下 navigator.clipboard 为 undefined，
// 原实现直接返回 false，复制按钮（ChatCopyButton 等）静默失效。
// 兜底顺序：Clipboard API（可用且成功）→ textarea + document.execCommand('copy')。
function fallbackCopy(text) {
  try {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    var selection = document.getSelection();
    var previous = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    var ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (previous && selection) {
      selection.removeAllRanges();
      selection.addRange(previous);
    }
    return !!ok;
  } catch (e) {
    return false;
  }
}

function c(r = {}) {
  const { resetDelay: a = 1200 } = r, e = n(!1);
  let t;
  async function i(o) {
    try {
      let ok = false;
      if (typeof navigator < "u" && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(o);
          ok = true;
        } catch (err) {
          ok = false;
        }
      }
      if (!ok) ok = fallbackCopy(o);
      if (!ok) return false;
      e.value = !0, t && clearTimeout(t), t = setTimeout(() => {
        e.value = !1;
      }, a);
      return true;
    } catch {
      return false;
    }
  }
  return { copied: e, copy: i };
}
export {
  c as useClipboard
};

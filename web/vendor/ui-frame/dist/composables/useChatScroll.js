import { computed as a, unref as i, ref as v, watch as w, nextTick as S } from "vue";
function p(o) {
  const { container: n } = o, f = a(() => i(o.threshold) ?? 120), h = a(() => i(o.autoScroll) ?? !0), e = v(!0);
  let l = !1, r;
  function m() {
    const t = n.value;
    return t ? t.scrollHeight - t.scrollTop - t.clientHeight : 0;
  }
  function c() {
    l || (e.value = m() < f.value);
  }
  function T() {
    c();
  }
  function s(t = "smooth") {
    const u = n.value;
    u && (r && clearTimeout(r), t === "smooth" && (l = !0, r = setTimeout(() => {
      l = !1, c();
    }, 500)), u.scrollTo({ top: u.scrollHeight, behavior: t }), e.value = !0);
  }
  const d = a(() => !e.value);
  return o.watchSource && w(o.watchSource, async () => {
    h.value && e.value && (await S(), s("auto"));
  }), { isNearBottom: e, showJumpButton: d, handleScroll: T, scrollToBottom: s, recheck: c };
}
export {
  p as useChatScroll
};

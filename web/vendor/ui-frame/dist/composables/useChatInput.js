import { computed as l } from "vue";
function n(e) {
  return e.isComposing || e.key === "Process" || e.keyCode === 229;
}
function a(e) {
  const r = l(
    () => {
      var u;
      return !((u = e.disabled) != null && u.value) && e.modelValue.value.trim().length > 0;
    }
  );
  function t() {
    r.value && (e.onSubmit(e.modelValue.value.trim()), e.modelValue.value = "");
  }
  function i(u) {
    u.key !== "Enter" || u.shiftKey || n(u) || (u.preventDefault(), t());
  }
  return { handleKeydown: i, submit: t, canSubmit: r };
}
export {
  n as isImeComposing,
  a as useChatInput
};

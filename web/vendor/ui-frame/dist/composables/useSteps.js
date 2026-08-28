import { computed as f } from "vue";
function p(a) {
  const { steps: u, current: t } = a, r = /* @__PURE__ */ new Map(), c = f(() => u.value[t.value]);
  function l(e) {
    e < 0 || e >= u.value.length || e !== t.value && (t.value = e);
  }
  async function o(e) {
    t.value >= u.value.length - 1 || e && !await e() || (t.value = t.value + 1);
  }
  function s() {
    t.value <= 0 || (t.value = t.value - 1);
  }
  function v(e, n) {
    r.set(e, n);
  }
  return {
    currentStep: c,
    setCurrent: l,
    next: o,
    prev: s,
    setStepStatus: v
  };
}
export {
  p as useSteps
};

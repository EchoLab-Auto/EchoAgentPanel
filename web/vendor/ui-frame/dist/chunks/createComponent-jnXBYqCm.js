import { useConfig as t } from "../composables/useConfig.js";
function s() {
  const o = t();
  function r(e, n, u) {
    return e ?? n ?? u;
  }
  return { config: o, resolveProp: r };
}
export {
  s as u
};

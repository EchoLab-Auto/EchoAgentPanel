import { computed as o, inject as n } from "vue";
const t = Symbol("nm-global-config"), c = {}, e = o(() => c);
function f() {
  return n(t, e);
}
export {
  t as ConfigKey,
  f as useConfig
};

import { computed as a } from "vue";
import { generateId as n } from "../utils/index.js";
function c(i) {
  const e = a(i), s = i(), t = n(`nm-${s.prefix}`), l = a(() => [
    `nm-${e.value.prefix}`,
    `nm-${e.value.prefix}--${e.value.size}`,
    {
      [`nm-${e.value.prefix}--checked`]: e.value.isChecked,
      [`nm-${e.value.prefix}--disabled`]: e.value.isDisabled,
      ...e.value.extraClasses
    }
  ]);
  return { inputId: t, classList: l };
}
export {
  c as useCheckable
};

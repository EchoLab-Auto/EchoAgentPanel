import { computed as a } from "vue";
import { generateId as n } from "../utils/index.js";
function c(i) {
  const e = a(i), s = i(), l = n(`nm-${s.prefix}`), t = a(() => [
    `nm-${e.value.prefix}`,
    ...e.value.size ? [`nm-${e.value.prefix}--${e.value.size}`] : [],
    {
      [`nm-${e.value.prefix}--checked`]: e.value.isChecked,
      [`nm-${e.value.prefix}--disabled`]: e.value.isDisabled,
      ...e.value.extraClasses
    }
  ]);
  return { inputId: l, classList: t };
}
export {
  c as useCheckable
};

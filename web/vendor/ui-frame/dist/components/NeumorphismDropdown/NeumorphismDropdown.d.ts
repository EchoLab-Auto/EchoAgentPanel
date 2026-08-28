import { PopoverPosition, PopoverTrigger } from '../../composables/usePopover';

export interface DropdownItem {
    key: string;
    label: string;
    icon?: string;
    disabled?: boolean;
    divided?: boolean;
    danger?: boolean;
}
export interface NeumorphismDropdownProps {
    /** Dropdown items */
    items?: DropdownItem[];
    /** Popover position relative to trigger */
    position?: PopoverPosition;
    /** Trigger mode */
    trigger?: PopoverTrigger;
    /** Whether the dropdown is disabled */
    disabled?: boolean;
    /** Offset from trigger in px */
    offset?: number;
}
declare function __VLS_template(): {
    default?(_: {}): any;
    items?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismDropdownProps>, {
    items: () => never[];
    disabled: boolean;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    select: (item: DropdownItem) => void;
    "visible-change": (visible: boolean) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismDropdownProps>, {
    items: () => never[];
    disabled: boolean;
}>>> & Readonly<{
    onSelect?: ((item: DropdownItem) => any) | undefined;
    "onVisible-change"?: ((visible: boolean) => any) | undefined;
}>, {
    disabled: boolean;
    items: DropdownItem[];
}, {}, {}, {}, string, import('vue').ComponentProvideOptions, true, {}, any>;
declare const _default: __VLS_WithTemplateSlots<typeof __VLS_component, ReturnType<typeof __VLS_template>>;
export default _default;
type __VLS_NonUndefinedable<T> = T extends undefined ? never : T;
type __VLS_TypePropsToRuntimeProps<T> = {
    [K in keyof T]-?: {} extends Pick<T, K> ? {
        type: import('vue').PropType<__VLS_NonUndefinedable<T[K]>>;
    } : {
        type: import('vue').PropType<T[K]>;
        required: true;
    };
};
type __VLS_WithDefaults<P, D> = {
    [K in keyof Pick<P, keyof P>]: K extends keyof D ? __VLS_Prettify<P[K] & {
        default: D[K];
    }> : P[K];
};
type __VLS_Prettify<T> = {
    [K in keyof T]: T[K];
} & {};
type __VLS_WithTemplateSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};

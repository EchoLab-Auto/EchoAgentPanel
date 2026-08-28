import { PopoverPosition, PopoverTrigger } from '../../composables/usePopover';

export type { PopoverPosition, PopoverTrigger };
export interface NeumorphismPopoverProps {
    /** Preferred position of the popover relative to the trigger */
    position?: PopoverPosition;
    /** How the popover is triggered */
    trigger?: PopoverTrigger;
    /** Whether the popover is disabled */
    disabled?: boolean;
    /** Offset from the trigger element in px */
    offset?: number;
    /** Width of the popover content */
    width?: 'auto' | 'trigger' | number;
    /** Plain text content (when not using the content slot) */
    content?: string;
    /** Whether to show the arrow pointing to the trigger */
    showArrow?: boolean;
}
declare function __VLS_template(): {
    default?(_: {
        expanded: boolean;
        contentId: string;
        tooltipMode: boolean;
    }): any;
    content?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismPopoverProps>, {
    showArrow: undefined;
    disabled: boolean;
}>>, {
    show: () => void;
    hide: () => void;
    toggle: () => void;
    isOpen: import('vue').Ref<boolean, boolean>;
    contentId: string;
}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "visible-change": (visible: boolean) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismPopoverProps>, {
    showArrow: undefined;
    disabled: boolean;
}>>> & Readonly<{
    "onVisible-change"?: ((visible: boolean) => any) | undefined;
}>, {
    disabled: boolean;
    showArrow: boolean;
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

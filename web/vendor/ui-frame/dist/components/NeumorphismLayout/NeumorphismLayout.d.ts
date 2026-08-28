export interface NeumorphismLayoutProps {
    /** 是否显示顶部导航 */
    showHeader?: boolean;
    /** 是否显示侧边栏 */
    showSider?: boolean;
    /** 侧边栏宽度 */
    siderWidth?: number;
    /** 侧边栏是否可折叠 */
    collapsible?: boolean;
    /** 侧边栏是否默认折叠 */
    defaultCollapsed?: boolean;
    /** 侧边栏折叠后宽度 */
    collapsedWidth?: number;
    /** 是否移动端自动折叠侧边栏 */
    mobileAutoCollapse?: boolean;
    /**
     * Layout 高度。默认 '100vh' 用于页面级根容器。
     * 嵌套使用时设为 '100%'（父容器需有确定高度）。
     */
    height?: string;
}
declare function __VLS_template(): {
    "skip-nav"?(_: {}): any;
    "header-left"?(_: {}): any;
    "header-center"?(_: {}): any;
    "header-right"?(_: {}): any;
    sider?(_: {
        collapsed: boolean;
    }): any;
    default?(_: {}): any;
    footer?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismLayoutProps>, {
    collapsible: undefined;
    mobileAutoCollapse: undefined;
    showHeader: undefined;
    showSider: undefined;
    defaultCollapsed: boolean;
    height: string;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    collapse: (collapsed: boolean) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismLayoutProps>, {
    collapsible: undefined;
    mobileAutoCollapse: undefined;
    showHeader: undefined;
    showSider: undefined;
    defaultCollapsed: boolean;
    height: string;
}>>> & Readonly<{
    onCollapse?: ((collapsed: boolean) => any) | undefined;
}>, {
    height: string;
    showHeader: boolean;
    showSider: boolean;
    collapsible: boolean;
    defaultCollapsed: boolean;
    mobileAutoCollapse: boolean;
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

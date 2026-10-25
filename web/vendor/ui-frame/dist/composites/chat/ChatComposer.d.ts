import { GlassValue } from '../../utils/glass';

/**
 * 聚焦（选中）特效。
 *
 * 全部落在**输入槽**上——输入器的视觉主体是那个凹陷槽，特效贴着它才读得懂：
 *   - `ring`  外侧主色光环（历史默认，零变化）
 *   - `glow`  **内辉光**：主色光从凹槽内部亮起来（独立的 screen 加法光层，非彩色阴影）
 *   - `inset` 纯新拟态语汇：只是把凹陷加深，不带彩色
 *   - `none`  不施加任何装饰性特效（保留输入框自身的基础凹陷加深，别让聚焦完全不可见）
 */
export type ChatComposerFocusEffect = 'ring' | 'glow' | 'inset' | 'none';
export interface ChatComposerProps {
    /** 输入内容（v-model） */
    modelValue?: string;
    /** 禁用态（如未连接），禁止输入与提交 */
    disabled?: boolean;
    /** 占位文本（默认取 locale chatInputPlaceholder） */
    placeholder?: string;
    /** 是否显示"取消任务"按钮 */
    cancelable?: boolean;
    /** 发送按钮文本（默认取 locale chatSend） */
    sendLabel?: string;
    /** 取消按钮文本（默认取 locale chatCancel） */
    cancelLabel?: string;
    /** 初始行数 */
    rows?: number | string;
    /** 随内容自动增高 */
    autoResize?: boolean;
    /** 最大输入长度 */
    maxlength?: number | string;
    /**
     * 玻璃拟态档位（与按钮 / 卡片同一套命名）：
     *   - `true` / `'float'` — 悬浮磨砂托盘（环境投影）
     *   - `'raised'`         — 磨砂托盘 + 新拟态凸起双阴影
     *   - `'pressed'`        — 磨砂托盘 + 凹陷内阴影
     *
     * 材质挂在**外壳**上（浮起的玻璃托盘），内部输入槽保持凹陷——
     * 层次是「玻璃托盘 > 凹陷输入槽」，而不是让输入框自己半透明。
     */
    glass?: GlassValue;
    /** 聚焦（选中）特效，见 `ChatComposerFocusEffect` */
    focusEffect?: ChatComposerFocusEffect;
}
export type ChatComposerEmits = {
    (e: 'update:modelValue', value: string): void;
    /** 提交（内容为 trim 后的非空字符串；IME 组合中的 Enter 不会触发） */
    (e: 'send', content: string): void;
    /** 点击"取消任务" */
    (e: 'cancel'): void;
};
declare function __VLS_template(): {
    meta?(_: {}): any;
    actions?(_: {
        submit: () => void;
        canSubmit: boolean;
    }): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<ChatComposerProps>, {
    modelValue: string;
    disabled: boolean;
    placeholder: string;
    cancelable: boolean;
    sendLabel: string;
    cancelLabel: string;
    rows: number;
    autoResize: boolean;
    maxlength: undefined;
    glass: undefined;
    focusEffect: string;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "update:modelValue": (value: string) => void;
    send: (content: string) => void;
    cancel: () => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<ChatComposerProps>, {
    modelValue: string;
    disabled: boolean;
    placeholder: string;
    cancelable: boolean;
    sendLabel: string;
    cancelLabel: string;
    rows: number;
    autoResize: boolean;
    maxlength: undefined;
    glass: undefined;
    focusEffect: string;
}>>> & Readonly<{
    onCancel?: (() => any) | undefined;
    "onUpdate:modelValue"?: ((value: string) => any) | undefined;
    onSend?: ((content: string) => any) | undefined;
}>, {
    disabled: boolean;
    placeholder: string;
    modelValue: string;
    maxlength: number | string;
    glass: GlassValue;
    rows: number | string;
    cancelLabel: string;
    autoResize: boolean;
    cancelable: boolean;
    sendLabel: string;
    focusEffect: ChatComposerFocusEffect;
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

import { UploadFile, UploadStatus } from '../../composables/useUpload';

export type { UploadFile, UploadStatus };
export interface NeumorphismUploadProps {
    /** v-model bound file list */
    modelValue?: UploadFile[];
    /** Accepted MIME types / extensions, e.g. "image/*,.pdf" */
    accept?: string;
    /** Maximum file size in bytes */
    maxSize?: number;
    /** Maximum number of files */
    maxCount?: number;
    /** Allow multiple file selection */
    multiple?: boolean;
    /** Whether the upload is disabled */
    disabled?: boolean;
    /** Enable drag-and-drop zone */
    drag?: boolean;
    /** File list display style */
    listType?: 'text' | 'picture' | 'picture-card';
    /** Whether to show the file list */
    showUploadList?: boolean;
    /** Component size */
    size?: 'small' | 'medium' | 'large';
    /** Whether to auto upload after file selection */
    autoUpload?: boolean;
    /** Override trigger label text */
    triggerText?: string;
    /** Override drop hint text */
    dropText?: string;
    /** Override remove button aria-label */
    removeLabel?: string;
    /** Override preview aria-label */
    previewLabel?: string;
}
declare function __VLS_template(): {
    trigger?(_: {
        dragOver: boolean;
        disabled: boolean;
    }): any;
};
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismUploadProps>, {
    autoUpload: undefined;
    drag: undefined;
    showUploadList: undefined;
    modelValue: () => never[];
    accept: undefined;
    maxSize: undefined;
    maxCount: undefined;
    multiple: boolean;
    disabled: boolean;
    triggerText: string;
    dropText: string;
    removeLabel: string;
    previewLabel: string;
}>>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "update:modelValue": (files: UploadFile[]) => void;
    change: (files: UploadFile[]) => void;
    preview: (file: UploadFile) => void;
    remove: (file: UploadFile) => void;
    exceed: (excessCount: number) => void;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<__VLS_WithDefaults<__VLS_TypePropsToRuntimeProps<NeumorphismUploadProps>, {
    autoUpload: undefined;
    drag: undefined;
    showUploadList: undefined;
    modelValue: () => never[];
    accept: undefined;
    maxSize: undefined;
    maxCount: undefined;
    multiple: boolean;
    disabled: boolean;
    triggerText: string;
    dropText: string;
    removeLabel: string;
    previewLabel: string;
}>>> & Readonly<{
    onChange?: ((files: UploadFile[]) => any) | undefined;
    "onUpdate:modelValue"?: ((files: UploadFile[]) => any) | undefined;
    onRemove?: ((file: UploadFile) => any) | undefined;
    onPreview?: ((file: UploadFile) => any) | undefined;
    onExceed?: ((excessCount: number) => any) | undefined;
}>, {
    drag: boolean;
    disabled: boolean;
    modelValue: UploadFile[];
    multiple: boolean;
    maxCount: number;
    accept: string;
    maxSize: number;
    autoUpload: boolean;
    showUploadList: boolean;
    triggerText: string;
    dropText: string;
    removeLabel: string;
    previewLabel: string;
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

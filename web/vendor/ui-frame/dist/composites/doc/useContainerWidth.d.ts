import { ComputedRef, Ref } from 'vue';

export interface UseContainerWidthOptions {
    /** 测不到宽度时的兜底（也作为布局下限：图表再窄也不会挤成一团） */
    minWidth: number;
}
export interface ContainerWidth {
    /** 可直接参与布局的宽度（≥ minWidth） */
    width: ComputedRef<number>;
    /** 原始测量值（0 = 还没测到；诊断用） */
    measured: Ref<number>;
}
export declare function useContainerWidth(target: Ref<HTMLElement | null>, options: UseContainerWidthOptions): ContainerWidth;

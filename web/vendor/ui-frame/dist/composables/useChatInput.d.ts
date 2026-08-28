import { ComputedRef, Ref } from 'vue';

export interface UseChatInputOptions {
    /** 输入内容（v-model 绑定引用） */
    modelValue: Ref<string>;
    /** 禁用态（如未连接），禁用时禁止提交 */
    disabled?: Ref<boolean>;
    /** 提交回调，参数为 trim 后的非空内容 */
    onSubmit: (content: string) => void;
}
export interface UseChatInputReturn {
    /** 绑定到输入框的 keydown：Enter 提交、Shift+Enter 换行、IME 组合中不提交 */
    handleKeydown: (event: KeyboardEvent) => void;
    /** 主动提交（点击发送按钮） */
    submit: () => void;
    /** 当前是否可提交（非禁用且内容非空白） */
    canSubmit: ComputedRef<boolean>;
}
/**
 * 判断键盘事件是否处于 IME 组合输入中。
 * 中文输入法回车选字也会派发 Enter keydown，必须排除，否则会误发送。
 */
export declare function isImeComposing(event: KeyboardEvent): boolean;
/**
 * Headless 聊天输入 —— 封装"Enter 发送 / Shift+Enter 换行 / IME 安全"的
 * 提交逻辑与可提交状态，可搭配任意输入框 UI 使用。
 *
 * @example
 * ```ts
 * const { handleKeydown, submit, canSubmit } = useChatInput({
 *   modelValue: input,
 *   onSubmit: content => send(content),
 * })
 * ```
 */
export declare function useChatInput(options: UseChatInputOptions): UseChatInputReturn;

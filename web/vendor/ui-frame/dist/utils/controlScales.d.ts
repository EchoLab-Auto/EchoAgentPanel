import { ControlScaleSpec } from './controlScale';

/** 按钮：`size` 的数字语义 = 最小高度 px */
export declare const BUTTON_SCALE: ControlScaleSpec;
/**
 * 表单控件族（Input / Textarea / Select / AutoComplete / DatePicker / InputNumber）：
 * `size` 的数字语义 = 最小高度 px。整族共用 `--nm-field-*` token。
 */
export declare const FIELD_SCALE: ControlScaleSpec;
/** 分段控制器：`size` 的数字语义 = 单段最小高度 px */
export declare const SEGMENTED_SCALE: ControlScaleSpec;
/** 主题切换器：`size` 的数字语义 = 内层按钮上下内距 px */
export declare const THEME_TOGGLE_SCALE: ControlScaleSpec;
/** 上传：`size` 的数字语义 = 触发区最小高度 px */
export declare const UPLOAD_SCALE: ControlScaleSpec;
/** 标签：`size` 的数字语义 = 字号 px */
export declare const TAG_SCALE: ControlScaleSpec;
/** 提示条：`size` 的数字语义 = 正文字号 px */
export declare const ALERT_SCALE: ControlScaleSpec;
/** 面包屑：`size` 的数字语义 = 字号 px */
export declare const BREADCRUMB_SCALE: ControlScaleSpec;
/** 列表：`size` 的数字语义 = 字号 px */
export declare const LIST_SCALE: ControlScaleSpec;
/** 标签页：`size` 的数字语义 = 标签字号 px */
export declare const TABS_SCALE: ControlScaleSpec;
/** 折叠面板：`size` 的数字语义 = 标题字号 px */
export declare const COLLAPSE_SCALE: ControlScaleSpec;
/** 表格：`size` 的数字语义 = 单元格上下内距 px（行密度） */
export declare const TABLE_SCALE: ControlScaleSpec;
/** 分页：`size` 的数字语义 = 页码按钮高 px */
export declare const PAGINATION_SCALE: ControlScaleSpec;
/** 步骤条：`size` 的数字语义 = 序号圆直径 px */
export declare const STEPS_SCALE: ControlScaleSpec;
/** 进度条：`size` 的数字语义 = 线形条厚度 px（环形直径/描边同步插值） */
export declare const PROGRESS_SCALE: ControlScaleSpec;
/** 下拉菜单：`size` 的数字语义 = 菜单项字号 px */
export declare const MENU_SCALE: ControlScaleSpec;
/** 导航菜单：`size` 的数字语义 = 导航项字号 px */
export declare const NAV_MENU_SCALE: ControlScaleSpec;
/** 头像：`size` 的数字语义 = 直径 px */
export declare const AVATAR_SCALE: ControlScaleSpec;
/** 空状态：`size` 的数字语义 = 插图边长 px */
export declare const EMPTY_SCALE: ControlScaleSpec;
/**
 * 复选框：`size` 的数字语义 = **勾选框边长** px。
 *
 * 锚点取 `checkable-sizes` 混基给 `.nm-checkbox__box` 的 18 / 24 / 30；
 * 里面的勾形图标是另一套枚举档（`--nm-icon-size-xs/sm/md` = 12 / 14 / 16），
 * 单列成 `--nm-checkbox-sz-icon`，不能拿它当主几何量。
 */
export declare const CHECKBOX_SCALE: ControlScaleSpec;
/**
 * 单选框：`size` 的数字语义 = 圆圈直径 px。
 *
 * 锚点取 `checkable-sizes` 混基给 `.nm-radio__circle` 的 18 / 24 / 30；
 * 内部圆点在三档上走 spacing token（8 / 12 / 16），不是圆圈的等比缩放，
 * 所以单列成 `--nm-radio-sz-dot`，数字路径才不会在锚点处差 1px。
 */
export declare const RADIO_SCALE: ControlScaleSpec;
/** 滑块：`size` 的数字语义 = 轨道粗细 px */
export declare const SLIDER_SCALE: ControlScaleSpec;
/** 全部尺度（测试按组件名核对锚点与 token 是否一致） */
export declare const CONTROL_SCALES: {
    readonly button: ControlScaleSpec;
    readonly field: ControlScaleSpec;
    readonly segmented: ControlScaleSpec;
    readonly themeToggle: ControlScaleSpec;
    readonly upload: ControlScaleSpec;
    readonly tag: ControlScaleSpec;
    readonly alert: ControlScaleSpec;
    readonly breadcrumb: ControlScaleSpec;
    readonly list: ControlScaleSpec;
    readonly tabs: ControlScaleSpec;
    readonly collapse: ControlScaleSpec;
    readonly table: ControlScaleSpec;
    readonly pagination: ControlScaleSpec;
    readonly steps: ControlScaleSpec;
    readonly progress: ControlScaleSpec;
    readonly menu: ControlScaleSpec;
    readonly navMenu: ControlScaleSpec;
    readonly avatar: ControlScaleSpec;
    readonly empty: ControlScaleSpec;
    readonly checkbox: ControlScaleSpec;
    readonly radio: ControlScaleSpec;
    readonly slider: ControlScaleSpec;
};

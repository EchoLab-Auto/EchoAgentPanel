import { ComputedRef, InjectionKey } from 'vue';

export interface NeumorphismGlobalConfig {
    /** Default button props applied to all NeumorphismButton instances */
    button?: {
        /**
         * 默认视觉预设。玻璃是其中一档（`glass` / `glass-raised` / `glass-pressed`），
         * 这里一并放开，否则「全站默认玻璃」无从配置。
         */
        variant?: 'raised' | 'pressed' | 'primary' | 'glow' | 'glass' | 'glass-raised' | 'glass-pressed';
        size?: number | 'small' | 'medium' | 'large';
        shape?: 'rounded' | 'pill' | 'circle';
    };
    /** Default input props applied to all NeumorphismInput instances */
    input?: {
        size?: number | 'small' | 'medium' | 'large';
    };
    /** Default input number props applied to all NeumorphismInputNumber instances */
    inputNumber?: {
        size?: number | 'small' | 'medium' | 'large';
    };
    /** Default date picker props */
    datePicker?: {
        size?: number | 'small' | 'medium' | 'large';
        format?: string;
        clearable?: boolean;
        firstDayOfWeek?: number;
        placeholder?: string;
    };
    /** Default select props */
    select?: {
        size?: number | 'small' | 'medium' | 'large';
        clearable?: boolean;
        emptyText?: string;
        placeholder?: string;
        multiple?: boolean;
        filterable?: boolean;
        collapseTags?: boolean;
        /** 视觉变体：default（新拟态凹陷）/ outlined（描边扁平 + 连体下拉） */
        variant?: 'default' | 'outlined';
    };
    /** Default modal props */
    modal?: {
        /** 对话框宽度（px）；旧字符串档位仍接受（已弃用） */
        size?: number | 'small' | 'medium' | 'large';
        maskClosable?: boolean;
        closable?: boolean;
        showClose?: boolean;
        destroyOnClose?: boolean;
    };
    /** Default toast props */
    toast?: {
        position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
        maxCount?: number;
    };
    /** Default tooltip props */
    tooltip?: {
        position?: 'top' | 'bottom' | 'left' | 'right';
        trigger?: 'hover' | 'click' | 'focus';
        offset?: number;
        delay?: number;
    };
    /** Default tabs props */
    tabs?: {
        position?: 'top' | 'left' | 'right';
        size?: number | 'small' | 'medium' | 'large';
    };
    /** Default pagination props */
    pagination?: {
        size?: number | 'small' | 'medium' | 'large';
        showTotal?: boolean;
        showJumper?: boolean;
        maxVisiblePages?: number;
        pageSize?: number;
    };
    /** Default collapse props */
    collapse?: {
        size?: number | 'small' | 'medium' | 'large';
        accordion?: boolean;
    };
    /** Default form props */
    form?: {
        size?: number | 'small' | 'medium' | 'large';
        labelWidth?: string;
        direction?: 'horizontal' | 'vertical';
    };
    /** Default tag props */
    tag?: {
        variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
        size?: number | 'small' | 'medium' | 'large';
        rounded?: boolean;
    };
    /** Default progress props */
    progress?: {
        variant?: 'primary' | 'success' | 'warning' | 'error';
        size?: number | 'small' | 'medium' | 'large';
        showLabel?: boolean;
        effect?: 'default' | 'pulse' | 'flow' | 'wave' | 'stripes' | 'sparkle';
    };
    /** Default avatar props */
    avatar?: {
        size?: number | 'small' | 'medium' | 'large';
        shape?: 'circle' | 'rounded';
    };
    /** Default tree props */
    tree?: {
        showSearch?: boolean;
        multiple?: boolean;
        searchPlaceholder?: string;
    };
    /** Default switch props */
    switch?: {
        /**
         * 尺寸 = px 高度（连续尺寸；default 变体默认 30px、power 变体默认 91px）。
         *
         * @deprecated 字符串档位（`'small' | 'medium' | 'large'`）已弃用，仅为兼容
         * 旧配置保留：按 small=24 / medium=30 / large=36（px 高度）映射；请改用数字。
         */
        size?: number | 'small' | 'medium' | 'large';
        /** 视觉变体：default（凹陷轨道 + 弹簧滑块）/ power（电力开关） */
        variant?: 'default' | 'power';
    };
    /** Default table props */
    table?: {
        size?: number | 'small' | 'medium' | 'large';
        striped?: boolean;
        hoverable?: boolean;
    };
    /** Default card props */
    card?: {
        /** 默认圆角（px），如 `0` / `8` / `24` */
        radius?: number;
        hoverable?: boolean | 'bulge' | 'sink';
        /** 默认玻璃拟态档位：true / 'float' / 'raised' / 'pressed' */
        glass?: boolean | 'float' | 'raised' | 'pressed';
    };
    /** Default badge props */
    badge?: {
        max?: number;
        dot?: boolean;
        showZero?: boolean;
    };
    /** Default breadcrumb props */
    breadcrumb?: {
        size?: number | 'small' | 'medium' | 'large';
        separator?: string;
    };
    /** Default checkbox props */
    checkbox?: {
        size?: number | 'small' | 'medium' | 'large';
    };
    /** Default radio props */
    radio?: {
        size?: number | 'small' | 'medium' | 'large';
    };
    /** Default radio group props */
    radioGroup?: {
        size?: number | 'small' | 'medium' | 'large';
        direction?: 'horizontal' | 'vertical';
    };
    /** Default textarea props */
    textarea?: {
        size?: number | 'small' | 'medium' | 'large';
        rows?: number;
        autoResize?: boolean;
        showCount?: boolean;
    };
    /** Default divider props */
    divider?: {
        direction?: 'horizontal' | 'vertical';
        align?: 'left' | 'center' | 'right';
        dashed?: boolean;
        inset?: boolean;
    };
    /** Default container props */
    container?: {
        mode?: 'fixed' | 'fluid';
        noPadding?: boolean;
    };
    /** Default layout props */
    layout?: {
        showHeader?: boolean;
        showSider?: boolean;
        siderWidth?: number;
        collapsible?: boolean;
        collapsedWidth?: number;
        mobileAutoCollapse?: boolean;
    };
    /** Default theme toggle props */
    themeToggle?: {
        size?: number | 'small' | 'medium' | 'large';
        disableAuto?: boolean;
    };
    /** Default canvas props */
    canvas?: {
        showGrid?: boolean;
        gridSize?: number;
        gridVariant?: 'dots' | 'lines';
        showControls?: boolean;
        /** 无限画布模式（虚拟平移 + transform，替代原生滚动） */
        infinite?: boolean;
    };
    /** Default skeleton props */
    skeleton?: {
        variant?: 'text' | 'circle' | 'rect';
        animation?: 'pulse' | 'wave' | 'none';
    };
    /** Default grid props */
    grid?: {
        gutter?: number | [number, number];
        justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';
        align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
        wrap?: boolean;
    };
    /** Default field props */
    field?: {
        labelWidth?: string;
    };
    /** Default slider props */
    slider?: {
        size?: number | 'small' | 'medium' | 'large';
        showTooltip?: boolean;
        showStops?: boolean;
    };
    /** Default steps props */
    steps?: {
        direction?: 'horizontal' | 'vertical';
        size?: number | 'small' | 'medium' | 'large';
        center?: boolean;
    };
    /** Default upload props */
    upload?: {
        size?: number | 'small' | 'medium' | 'large';
        drag?: boolean;
        showUploadList?: boolean;
        listType?: 'text' | 'picture' | 'picture-card';
        autoUpload?: boolean;
    };
    /** Default list props */
    list?: {
        bordered?: boolean;
        split?: boolean;
        size?: number | 'small' | 'medium' | 'large';
        hoverable?: boolean;
    };
    /** Default logo animation props */
    logo?: {
        mode?: 'pulse' | 'liquid' | 'wave' | 'pointer';
        /** Logo 宽度（px）；旧字符串档位仍接受（已弃用） */
        size?: number | 'small' | 'medium' | 'large';
        goo?: boolean;
        autoplay?: boolean;
        floating?: boolean;
    };
    /** Default art props */
    art?: {
        effect?: 'pixel-field' | 'particles' | 'waves' | 'goo' | 'ascii';
        reactive?: boolean;
    };
    /** Default graph view props */
    graph?: {
        nodeRadius?: number;
        linkDistance?: number;
        repulsion?: number;
        showLabels?: 'auto' | 'always' | 'hover';
        showControls?: boolean;
        draggable?: boolean;
        highlightNeighbors?: boolean;
    };
    /** Default alert props */
    alert?: {
        type?: 'success' | 'warning' | 'error' | 'info';
        closable?: boolean;
        duration?: number;
        icon?: boolean;
        bordered?: boolean;
        size?: number | 'small' | 'medium' | 'large';
    };
    /** Default menu props */
    menu?: {
        mode?: 'vertical' | 'horizontal';
        size?: number | 'small' | 'medium' | 'large';
        selectable?: boolean;
    };
    /** Default nav menu props */
    navMenu?: {
        mode?: 'horizontal' | 'vertical';
        size?: number | 'small' | 'medium' | 'large';
        showIndicator?: boolean;
    };
    /** Default popover props */
    popover?: {
        position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
        trigger?: 'hover' | 'click' | 'focus';
        offset?: number;
        width?: 'auto' | 'trigger' | number;
        showArrow?: boolean;
    };
    /** Default dropdown props */
    dropdown?: {
        position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
        trigger?: 'hover' | 'click' | 'focus';
        offset?: number;
    };
    /** Default empty props */
    empty?: {
        size?: number | 'small' | 'medium' | 'large';
    };
    /** Default autocomplete props */
    autoComplete?: {
        size?: number | 'small' | 'medium' | 'large';
        clearable?: boolean;
    };
    /** Default status dot props */
    statusDot?: {
        status?: 'online' | 'offline' | 'busy' | 'connecting';
        /** 圆点直径（px）；旧字符串档位仍接受（已弃用） */
        size?: number | 'small' | 'medium' | 'large';
        pulse?: boolean;
    };
    /** Default spinner props */
    spinner?: {
        size?: number | 'small' | 'medium' | 'large' | number;
    };
    /** Default segmented props */
    segmented?: {
        size?: number | 'small' | 'medium' | 'large';
        disabled?: boolean;
    };
    /** Locale configuration */
    locale?: 'zh-CN' | 'en-US';
    /** Custom locale messages (overrides built-in locale) */
    localeMessages?: import('../locales/types').LocaleMessages;
    /** Default theme config */
    theme?: {
        defaultTheme?: 'light' | 'dark' | 'auto';
        storageKey?: string;
        followSystem?: boolean;
    };
    /** Whether to use RTL (right-to-left) direction */
    rtl?: boolean;
    /** Default chart props */
    chart?: {
        showGrid?: boolean;
        showTooltip?: boolean;
        showLegend?: boolean;
        showAxis?: boolean;
        animate?: boolean;
        colorPalette?: string[];
        bar?: {
            orientation?: 'vertical' | 'horizontal';
            stacked?: boolean;
            barGap?: number;
        };
        line?: {
            curve?: 'linear' | 'smooth' | 'step';
            area?: boolean;
            showPoints?: boolean;
            lineWidth?: number;
        };
        pie?: {
            innerRadius?: number;
            labelPosition?: 'inside' | 'outside' | 'none';
            roundedCorners?: boolean;
        };
        /** Candlestick / stock chart defaults */
        candlestick?: {
            upColor?: string;
            downColor?: string;
            showVolume?: boolean;
            showMA?: boolean;
            maPeriods?: number[];
            bodyWidthRatio?: number;
        };
    };
    /** Extension: consumers can add custom component config sections. */
    [configSection: string]: unknown;
}
export declare const ConfigKey: InjectionKey<ComputedRef<NeumorphismGlobalConfig>>;
/**
 * Returns the global config merged with component-level defaults.
 * Components should use this to resolve their props.
 *
 * @example
 * ```ts
 * const config = useConfig()
 * const size = props.size ?? config.value.button?.size ?? 'medium'
 * ```
 */
export declare function useConfig(): ComputedRef<NeumorphismGlobalConfig>;

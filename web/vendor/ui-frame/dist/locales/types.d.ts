/**
 * Locale message keys used across the component library.
 * All messages are flat strings (no nested objects) for easy overriding.
 */
export interface LocaleMessages {
    /** Badge */
    badgeOnline?: string;
    badgeUnread?: string;
    badgeAvatar?: string;
    /** Skeleton */
    skeletonLoading?: string;
    /** ThemeToggle */
    themeToggleLight?: string;
    themeToggleAuto?: string;
    themeToggleDark?: string;
    themeToggleLabel?: string;
    /** Canvas */
    canvasZoomOut?: string;
    canvasZoomIn?: string;
    canvasZoomReset?: string;
    /** 无限画布模式下的视图复位（平移 + 缩放一并回到全部内容视图） */
    canvasResetView?: string;
    canvasZoomFit?: string;
    canvasFullscreen?: string;
    canvasExitFullscreen?: string;
    canvasLabel?: string;
    artLabel?: string;
    asciiArtLabel?: string;
    /** Tree */
    treeExpandAll?: string;
    treeCollapseAll?: string;
    treeSearchPlaceholder?: string;
    treeEmpty?: string;
    treeClearSearch?: string;
    treeExpand?: string;
    treeCollapse?: string;
    treeLabel?: string;
    /** Table */
    tableLoading?: string;
    tableEmpty?: string;
    /** Select */
    selectPlaceholder?: string;
    /** Slider 滑块可访问名称 */
    sliderThumb?: string;
    /** Switch（缺省可访问名称） */
    switchToggle?: string;
    selectEmpty?: string;
    selectClear?: string;
    selectListLabel?: string;
    selectLoading?: string;
    selectNoMatch?: string;
    selectSearchLabel?: string;
    /** Modal */
    modalClose?: string;
    modalCancel?: string;
    modalConfirm?: string;
    /** Drawer */
    drawerClose?: string;
    /** Pagination */
    paginationPrev?: string;
    paginationNext?: string;
    paginationTotal?: string;
    paginationLabel?: string;
    paginationPageLabel?: string;
    /** 跳页器文案，须含 {input} 占位符（组件按占位符拆为输入框前后两段） */
    paginationJumper?: string;
    /** Toast */
    toastClose?: string;
    /** Tabs */
    tabsNavLabel?: string;
    /** Alert */
    alertClose?: string;
    /** Tag */
    tagClose?: string;
    /** Layout */
    layoutExpandSider?: string;
    layoutCollapseSider?: string;
    layoutSiderLabel?: string;
    layoutSkipNav?: string;
    /** Breadcrumb */
    breadcrumbLabel?: string;
    /** Form validation */
    formRequired?: string;
    formMinLength?: string;
    formMaxLength?: string;
    formPattern?: string;
    formMin?: string;
    formMax?: string;
    formValidator?: string;
    /** Progress */
    progressLabel?: string;
    progressIndeterminate?: string;
    /** DatePicker */
    datePickerPlaceholder?: string;
    datePickerClear?: string;
    datePickerToday?: string;
    datePickerPrevMonth?: string;
    datePickerNextMonth?: string;
    datePickerPrevYear?: string;
    datePickerNextYear?: string;
    datePickerMonth1?: string;
    datePickerMonth2?: string;
    datePickerMonth3?: string;
    datePickerMonth4?: string;
    datePickerMonth5?: string;
    datePickerMonth6?: string;
    datePickerMonth7?: string;
    datePickerMonth8?: string;
    datePickerMonth9?: string;
    datePickerMonth10?: string;
    datePickerMonth11?: string;
    datePickerMonth12?: string;
    /** Upload */
    uploadSelectFile?: string;
    uploadDropFile?: string;
    uploadRemove?: string;
    uploadPreview?: string;
    /** List */
    listLoading?: string;
    listEmpty?: string;
    listLabel?: string;
    /** Chart */
    chartNoData?: string;
    chartLegend?: string;
    chartTooltipValue?: string;
    chartTooltipPercentage?: string;
    chartOhlcOpen?: string;
    chartOhlcHigh?: string;
    chartOhlcLow?: string;
    chartOhlcClose?: string;
    chartVolume?: string;
    /** Markdown */
    markdownCodeCopied?: string;
    markdownCodeCopy?: string;
    markdownTocLabel?: string;
    markdownTocToggle?: string;
    markdownTocClose?: string;
    markdownTocExpand?: string;
    markdownTocCollapse?: string;
    /** Dropdown */
    dropdownMenuLabel?: string;
    /** Slider */
    sliderLabel?: string;
    /** InputNumber */
    inputNumberIncrement?: string;
    inputNumberDecrement?: string;
    /** AutoComplete */
    autoCompleteLoading?: string;
    autoCompleteEmpty?: string;
    /** StatusDot */
    statusDotOnline?: string;
    statusDotOffline?: string;
    statusDotBusy?: string;
    statusDotConnecting?: string;
    /** Spinner */
    spinnerLoading?: string;
    /** Segmented */
    segmentedLabel?: string;
    /** Chat */
    chatRoleUser?: string;
    chatRoleAgent?: string;
    chatRoleSystem?: string;
    chatRoleTool?: string;
    chatCopy?: string;
    chatCopied?: string;
    chatToolRunning?: string;
    chatToolSucceeded?: string;
    chatToolFailed?: string;
    chatToolDetails?: string;
    chatToolCollapse?: string;
    chatCollapse?: string;
    chatReasoning?: string;
    chatBranchMerge?: string;
    chatBranchStats?: string;
    chatBranchEmpty?: string;
    chatSourceGroup?: string;
    chatJumpToBottom?: string;
    chatEmpty?: string;
    chatInputPlaceholder?: string;
    chatSend?: string;
    chatCancel?: string;
}
export type Locale = 'zh-CN' | 'en-US';

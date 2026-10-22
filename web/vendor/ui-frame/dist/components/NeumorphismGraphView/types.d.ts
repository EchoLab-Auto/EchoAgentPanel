/**
 * NeumorphismGraphView（实验性节点图）的公开数据类型。
 */
/** 节点标签显示策略 */
export type GraphLabelMode = 
/** 缩放到阈值以上才显示，悬停/选中及其邻居始终显示（Obsidian 默认行为） */
'auto'
/** 始终显示全部标签 */
 | 'always'
/** 仅显示悬停 / 选中节点及其邻居的标签 */
 | 'hover';
/** 图节点（数据源里的纯描述对象，不含运行时坐标/速度） */
export interface GraphNode {
    /** 唯一标识，连线通过它引用两端 */
    id: string;
    /** 展示名；省略时回退用 `id` */
    label?: string;
    /** 分组名——同组节点共用调色板颜色（按分组名字典序取色，保证稳定） */
    group?: string;
    /** 节点半径（画布坐标）；省略时按节点度数自动增大 */
    size?: number;
    /** 节点颜色；显式指定时优先于分组配色 */
    color?: string;
    /** 初始横坐标（画布坐标）；省略时按索引黄金角螺旋落位 */
    x?: number;
    /** 初始纵坐标（画布坐标）；省略时按索引黄金角螺旋落位 */
    y?: number;
    /** 固定节点：力学模拟不移动它（适合钉住中心节点） */
    fixed?: boolean;
}
/** 图连线 */
export interface GraphLink {
    /** 起点节点 id */
    source: string;
    /** 固定节点：力学模拟不移动它（适合钉住中心节点） */
    target: string;
    /** 连线标签（当前仅数据层保留，渲染为可选悬浮提示） */
    label?: string;
    /** 弹簧刚度权重（默认 1；>1 拉得更紧、<1 更松） */
    weight?: number;
}
/** 视口变换：世界坐标 → 屏幕 CSS 像素 */
export interface GraphView {
    /** 缩放倍率 */
    scale: number;
    /** 平移（屏幕 CSS 像素） */
    tx: number;
    ty: number;
}

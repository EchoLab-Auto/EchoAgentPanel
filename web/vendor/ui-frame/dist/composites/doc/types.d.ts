/**
 * Doc 模块核心类型定义
 *
 * 文档节点、文档树和配置选项的类型声明。
 */
/** 文档节点 */
export interface ProDocNode {
    /** 唯一标识符 */
    id: string;
    /** 文档标题 */
    title: string;
    /** 文档路径（相对于 docs 根目录） */
    path: string;
    /** Markdown 原始内容 */
    content: string;
    /** 解析后的内容（不含 frontmatter） */
    body: string;
    /** frontmatter 元数据 */
    meta: Record<string, unknown>;
    /** 子文档 */
    children: ProDocNode[];
    /** 排序权重 */
    order: number;
}
/** 文档树结构 */
export interface DocTree {
    /** 根节点 */
    root: ProDocNode;
    /** 所有节点映射（path -> node） */
    nodeMap: Map<string, ProDocNode>;
    /** 根据路径查找节点 */
    findByPath(path: string): ProDocNode | undefined;
    /** 根据 ID 查找节点 */
    findById(id: string): ProDocNode | undefined;
}
/** Doc 模块配置选项 */
export interface ProDocOptions {
    /** 文档根目录路径 */
    docsRoot?: string;
    /** 首页路径 */
    indexPath?: string;
}
/** 流程图方向 */
export type ProDocFlowDirection = 'LR' | 'RL' | 'TB' | 'BT';
/** 流程图节点形状 */
export type ProDocFlowNodeShape = 'rect' | 'rounded' | 'stadium' | 'diamond';
/** 流程图节点 */
export interface ProDocFlowNode {
    /** 节点标识（源码中的裸标识符） */
    id: string;
    /** 显示文本（缺省为 id） */
    label: string;
    /** 形状 */
    shape: ProDocFlowNodeShape;
    /**
     * 关联文档路径（"显示文本|/路径.md" 语法）。
     * 统一存储为**无前导斜杠**形式（如 `guide/index.md`），
     * 查找文档树时按树 key 形态再做归一。
     */
    docPath?: string;
    /** 手动排版：节点左上角画布坐标（`A[文本] @ 100, 200` 语法）；缺省自动布局 */
    x?: number;
    y?: number;
}
/** 流程图边 */
export interface ProDocFlowEdge {
    from: string;
    to: string;
    label?: string;
}
/** 流程图语法容错记录 */
export interface ProDocFlowError {
    /** 1-based 行号 */
    line: number;
    /** 原始行文本 */
    source: string;
    message: string;
}
/** 解析后的流程图 */
export interface ProDocFlowGraph {
    direction: ProDocFlowDirection;
    nodes: ProDocFlowNode[];
    edges: ProDocFlowEdge[];
    /** 语法容错：非法行收集于此，渲染器可提示但不阻断 */
    errors: ProDocFlowError[];
}

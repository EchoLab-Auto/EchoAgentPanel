import { ProDocNode } from './types.js';

/** 解析 frontmatter 为对象 */
export declare function parseFrontmatter(content: string): {
    meta: Record<string, unknown>;
    body: string;
};
/** 从文件路径生成文档 ID */
export declare function pathToId(filePath: string): string;
/** 从文件内容解析出标题（H1 或 frontmatter title） */
export declare function extractTitle(body: string, meta: Record<string, unknown>): string;
/** 创建单个 ProDocNode */
export declare function createNode(filePath: string, content: string): ProDocNode;
/** 从文件结构构建文档树 */
export declare function buildDocTree(files: Record<string, string>): ProDocNode;

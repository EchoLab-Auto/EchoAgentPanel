import { Ref, ComputedRef } from 'vue';

export interface TreeNodeData {
    key: string;
    label: string;
    children?: TreeNodeData[];
    disabled?: boolean;
    [k: string]: unknown;
}
export interface UseTreeOptions {
    /** Tree data */
    data: Ref<TreeNodeData[]> | ComputedRef<TreeNodeData[]>;
    /** v-model selected keys */
    selectedKeys?: Ref<string[]>;
    /** v-model expanded keys */
    expandedKeys?: Ref<string[]>;
    /** Whether multiple selection is allowed */
    multiple?: Ref<boolean>;
}
export interface UseTreeReturn {
    /** Local expanded keys */
    localExpandedKeys: Ref<string[]>;
    /** Local selected keys */
    localSelectedKeys: Ref<string[]>;
    /** All node keys in the tree */
    allKeys: ComputedRef<string[]>;
    /** Search text for filtering */
    searchText: Ref<string>;
    /** Currently focused key for keyboard navigation */
    focusedKey: Ref<string | null>;
    /** Toggle expand/collapse of a node */
    toggleExpand: (key: string) => void;
    /** Select a node */
    select: (key: string) => void;
    /** Find a node by key */
    findNode: (nodes: TreeNodeData[], key: string) => TreeNodeData | null;
    /** Expand all nodes */
    expandAll: () => void;
    /** Collapse all nodes */
    collapseAll: () => void;
    /** Handle search input — auto-expands matching nodes */
    onSearchInput: (value: string) => void;
    /** Handle keyboard navigation events */
    handleKeydown: (event: KeyboardEvent) => void;
}
/**
 * Headless tree — encapsulates expand/collapse, selection, search, and
 * node lookup without any rendering. Use with your own UI.
 */
export declare function useTree(opts: UseTreeOptions): UseTreeReturn;

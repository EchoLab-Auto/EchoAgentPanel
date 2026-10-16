<script setup lang="ts">
//! 单个 panel：NeumorphismCard 包裹 + 标题 + 节点列表（03a §1.1）。
//! 节点 key = `${panel.id}/${index}/${node.type}`（03a §1.4）。

import type { Component } from 'vue';
import NeumorphismCard from '@echolab-auto/ui-frame/components/NeumorphismCard';
import NeumorphismEmpty from '@echolab-auto/ui-frame/components/NeumorphismEmpty';
import type { UiNodeType, UiPanel } from './types';
import ButtonNode from './nodes/ButtonNode.vue';
import ImageNode from './nodes/ImageNode.vue';
import LinkNode from './nodes/LinkNode.vue';
import ListEditorNode from './nodes/ListEditorNode.vue';
import SelectNode from './nodes/SelectNode.vue';
import StatusNode from './nodes/StatusNode.vue';
import TextNode from './nodes/TextNode.vue';

const props = defineProps<{ panel: UiPanel }>();

const NODE_COMPONENTS: Record<UiNodeType, Component> = {
  status: StatusNode,
  text: TextNode,
  link: LinkNode,
  select: SelectNode,
  list_editor: ListEditorNode,
  image: ImageNode,
  button: ButtonNode,
};

function nodeKey(index: number, type: UiNodeType): string {
  return `${props.panel.id}/${index}/${type}`;
}
</script>

<template>
  <NeumorphismCard class="adapter-ui-panel" :data-panel-id="panel.id">
    <div v-if="panel.title" class="adapter-ui-panel__head">
      <h3>{{ panel.title }}</h3>
    </div>
    <NeumorphismEmpty v-if="!panel.nodes.length" description="暂无可配置项" size="small" />
    <component
      :is="NODE_COMPONENTS[node.type]"
      v-for="(node, index) in panel.nodes"
      :key="nodeKey(index, node.type)"
      :node="node"
      :node-key="nodeKey(index, node.type)"
    />
  </NeumorphismCard>
</template>

<style scoped>
.adapter-ui-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}
.adapter-ui-panel__head h3 {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--nm-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
</style>

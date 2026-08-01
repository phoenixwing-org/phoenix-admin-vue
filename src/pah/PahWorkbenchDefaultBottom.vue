<template>
	<div class="pah-workbench-default-bottom" role="status">
		<PnwIcon name="panel-bottom-active" :size="28" decorative />
		<div>
			<strong>工作台 Bottom</strong>
			<span>当前 View 暂无附加内容；此区域仍由工作台布局统一控制。</span>
		</div>
	</div>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'PahWorkbenchDefaultBottom'
});

import { PnwIcon } from 'phoenix-wing';
</script>

<style lang="scss" scoped>
.pah-workbench-default-bottom {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10px;
	min-height: 100%;
	padding: 16px;
	box-sizing: border-box;
	color: var(--pnw-workbench-muted, #64748b);
	text-align: left;

	> div {
		display: grid;
		gap: 3px;
	}

	strong {
		color: var(--pnw-workbench-text, #0f172a);
		font-size: 12px;
	}

	span {
		font-size: 11px;
	}
}
</style>

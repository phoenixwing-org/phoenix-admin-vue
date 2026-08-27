<template>
	<div class="pah-workbench-default-bottom">
		<PnwOutputBlock
			:text="text"
			aria-label="Phoenix Admin 输出"
			empty-text="暂无工作台输出"
		/>
	</div>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'PahWorkbenchDefaultBottom'
});

import { PnwOutputBlock } from 'phoenix-wing';

defineProps<{
	text: string;
}>();
</script>

<style lang="scss" scoped>
.pah-workbench-default-bottom {
	width: 100%;
	height: 100%;
	min-width: 0;
	min-height: 100%;
	overflow: hidden;
}
</style>

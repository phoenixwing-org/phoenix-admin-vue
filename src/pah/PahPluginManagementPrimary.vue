<template>
	<pnw-primary-panel title="插件管理" aria-label="插件管理入口">
		<template #summary>
			Cool 原生插件与 Phoenix 业务插件使用不同安装契约，请在这里切换。
		</template>

		<nav class="plugin-kinds" aria-label="插件类型">
			<button
				type="button"
				class="plugin-kind"
				:class="{ active: active === 'cool' }"
				:aria-current="active === 'cool' ? 'page' : undefined"
				@click="open('/helper/plugins')"
			>
				<strong>Cool 插件</strong>
				<span>.cool 原生 Hook 插件</span>
			</button>

			<button
				type="button"
				class="plugin-kind"
				:class="{ active: active === 'phoenix' }"
				:aria-current="active === 'phoenix' ? 'page' : undefined"
				@click="open('/phoenix/plugins')"
			>
				<strong>Phoenix 插件</strong>
				<span>.phoenix.cool 业务插件</span>
			</button>
		</nav>
	</pnw-primary-panel>
</template>

<script lang="ts" setup>
import { PnwPrimaryPanel } from 'phoenix-wing';
import { useCool } from '/@/cool';

defineOptions({ name: 'pah-plugin-management-primary' });

defineProps<{
	active: 'cool' | 'phoenix';
}>();

const { router } = useCool();

function open(path: '/helper/plugins' | '/phoenix/plugins') {
	void router.push(path);
}
</script>

<style scoped>
.plugin-kinds {
	display: grid;
	gap: 1px;
	background: var(--pnw-workbench-border, var(--el-border-color));
}

.plugin-kind {
	display: grid;
	gap: 4px;
	width: 100%;
	padding: 12px;
	border: 0;
	color: var(--pnw-workbench-text, var(--el-text-color-primary));
	text-align: left;
	cursor: pointer;
	background: var(--pnw-workbench-surface, var(--el-bg-color));
}

.plugin-kind:hover {
	background: var(--pnw-control-hover-bg, var(--el-fill-color-light));
}

.plugin-kind.active {
	box-shadow: inset 3px 0 var(--el-color-primary);
	background: color-mix(in srgb, var(--el-color-primary) 10%, var(--el-bg-color));
}

.plugin-kind strong {
	font-size: 13px;
}

.plugin-kind span {
	color: var(--pnw-workbench-muted, var(--el-text-color-secondary));
	font-size: 12px;
}
</style>

<template>
	<pnw-primary-panel title="字典维护">
		<pnw-primary-section title="业务插件" :default-expanded="true">
			<div class="primary-field">
				<label for="pah-dictionary-plugin">已启用插件</label>
				<el-select
					id="pah-dictionary-plugin"
					:model-value="selectedModuleId"
					filterable
					placeholder="选择声明了字典的插件"
					@change="selectPlugin"
				>
					<el-option
						v-for="option in pluginOptions"
						:key="option.value"
						:label="option.label"
						:value="option.value"
					/>
				</el-select>
			</div>
		</pnw-primary-section>

		<pnw-primary-section
			title="dry-run 计划"
			:default-expanded="false"
			@toggle="onDryRunToggle"
		>
			<div class="dry-run-summary">
				<template v-if="planSummary">
					<div>
						<span>待补全</span><strong>{{ planSummary.totalChanges }}</strong>
					</div>
					<div>
						<span>冲突</span><strong>{{ planSummary.conflicts }}</strong>
					</div>
				</template>
				<p v-else>展开后才读取计划和最近执行记录。</p>
				<el-button
					type="primary"
					:disabled="!selectedModuleId"
					:loading="planLoading"
					@click="onLoadPlan"
				>
					{{ planSummary ? '刷新计划' : '生成计划' }}
				</el-button>
			</div>
		</pnw-primary-section>
	</pnw-primary-panel>
</template>

<script lang="ts" setup>
import { PnwPrimaryPanel, PnwPrimarySection } from 'phoenix-wing';

interface DictionaryPluginOption {
	label: string;
	value: string;
}

interface DictionaryPlanSummary {
	totalChanges: number;
	conflicts: number;
}

const props = defineProps<{
	pluginOptions: DictionaryPluginOption[];
	selectedModuleId: string;
	planSummary: DictionaryPlanSummary | null;
	planLoading: boolean;
	onSelect: (moduleId: string) => void;
	onLoadPlan: () => void | Promise<void>;
}>();

function selectPlugin(value: unknown) {
	props.onSelect(typeof value === 'string' ? value : '');
}

function onDryRunToggle(expanded: boolean) {
	if (expanded && props.selectedModuleId && !props.planSummary && !props.planLoading) {
		void props.onLoadPlan();
	}
}
</script>

<style lang="scss" scoped>
.primary-field,
.dry-run-summary {
	display: grid;
	gap: 8px;
	padding: 8px;
}

.primary-field label,
.dry-run-summary span,
.dry-run-summary p {
	margin: 0;
	color: var(--pnw-workbench-muted, var(--el-text-color-secondary));
	font-size: 12px;
}

.dry-run-summary > div {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.dry-run-summary strong {
	font-size: 16px;
}
</style>

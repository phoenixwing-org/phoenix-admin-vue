<template>
	<pnw-page-layout
		class="dictionary-maintenance"
		title="字典维护"
		:body-inset="true"
		:body-scroll="true"
	>
		<template #actions>
			<div class="header-actions">
				<el-button @click="openDictionaryCrud">编辑字典</el-button>
				<el-button :loading="loading" @click="refreshAll({ emitOutput: true })"
					>刷新</el-button
				>
			</div>
		</template>

		<el-alert
			title="本页只执行数据 reconcile，不执行 ALTER TABLE"
			description="enabled、tags、core 与 owner 字段由 Host 受控 0002 迁移发布；普通字典页面仍负责名称、备注、启停和标签维护。"
			type="info"
			show-icon
			:closable="false"
		/>

		<section v-if="plan" class="panel">
			<div class="section-heading">
				<div>
					<p class="eyebrow">DRY-RUN</p>
					<h2>补全计划</h2>
				</div>
				<el-button
					type="success"
					:loading="reconciling"
					:disabled="plan.conflicts.length > 0 || totalChanges === 0"
					@click="reconcile"
				>
					确认补全
				</el-button>
			</div>

			<el-alert
				v-if="plan.conflicts.length"
				title="发现冲突，已停止补全"
				:description="plan.conflicts.join('；')"
				type="error"
				show-icon
				:closable="false"
			/>

			<div class="totals">
				<div>
					<span>新建类型</span><strong>{{ plan.totals.createTypes }}</strong>
				</div>
				<div>
					<span>补全类型元数据</span><strong>{{ plan.totals.updateTypes }}</strong>
				</div>
				<div>
					<span>新建字典项</span><strong>{{ plan.totals.createItems }}</strong>
				</div>
				<div>
					<span>补全字典元数据</span><strong>{{ plan.totals.updateItems }}</strong>
				</div>
				<div>
					<span>保留既有项</span><strong>{{ plan.totals.preserveItems }}</strong>
				</div>
				<div>
					<span>保留自定义项</span><strong>{{ plan.totals.preserveCustomItems }}</strong>
				</div>
			</div>

			<el-table :data="planRows" class="plan-table" empty-text="本插件未声明字典项">
				<el-table-column label="字典项" min-width="240">
					<template #default="{ row }">
						<div class="plan-item-name">
							<strong>{{ row.typeName }} · {{ row.name }}</strong>
							<code>{{ row.typeKey }}</code>
						</div>
					</template>
				</el-table-column>
				<el-table-column
					prop="value"
					label="稳定值"
					min-width="160"
					show-overflow-tooltip
				/>
				<el-table-column label="状态" width="80">
					<template #default="{ row }">{{ row.enabled ? '启用' : '停用' }}</template>
				</el-table-column>
				<el-table-column label="标签" min-width="180" show-overflow-tooltip>
					<template #default="{ row }">{{ row.tags.join(', ') || '无标签' }}</template>
				</el-table-column>
				<el-table-column label="动作" width="100">
					<template #default="{ row }">
						<el-tag :type="actionType(row.action)" size="small" effect="plain">
							{{ actionLabel(row.action) }}
						</el-tag>
					</template>
				</el-table-column>
			</el-table>
		</section>

		<section v-if="plan" class="panel">
			<div class="section-heading">
				<div>
					<p class="eyebrow">LEDGER</p>
					<h2>最近补全记录</h2>
				</div>
			</div>
			<el-table :data="records" empty-text="尚无补全记录">
				<el-table-column prop="createTime" label="时间" min-width="180" />
				<el-table-column prop="pluginVersion" label="插件版本" min-width="130" />
				<el-table-column label="状态" width="110">
					<template #default="{ row }">
						<el-tag :type="recordType(row.status)" effect="plain">
							{{ recordLabel(row.status) }}
						</el-tag>
					</template>
				</el-table-column>
				<el-table-column prop="actorId" label="执行人" width="110" />
				<el-table-column prop="error" label="错误" min-width="220" show-overflow-tooltip />
			</el-table>
		</section>
	</pnw-page-layout>
</template>

<script lang="ts" setup>
defineOptions({ name: 'pah-dictionary-maintenance' });

import { computed, markRaw, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { PnwPageLayout } from 'phoenix-wing';
import { useCool } from '/@/cool';
import PahPluginManagementPrimary from '/@/phoenix/PahPluginManagementPrimary.vue';
import { usePahWorkbenchOutput } from '/@/phoenix/PahWorkbenchOutput';
import { usePahViewContributions } from '/@/phoenix/PahViewContributions';

type ReconcileAction = 'create' | 'update' | 'preserve';

interface DictionaryInstallation {
	moduleId: string;
	name: string;
	version: string;
	state: string;
	manifest: { dictionaryContributions?: unknown[] };
}

interface DictionaryPlan {
	fingerprint: string;
	conflicts: string[];
	totals: {
		createTypes: number;
		updateTypes: number;
		createItems: number;
		updateItems: number;
		preserveItems: number;
		preserveCustomItems: number;
	};
	types: Array<{
		typeKey: string;
		typeName: string;
		action: ReconcileAction;
		items: Array<{
			value: string;
			name: string;
			enabled: boolean;
			tags: string[];
			action: ReconcileAction;
		}>;
	}>;
}

interface DictionaryRecord {
	id: number;
	pluginVersion: string;
	actorId: string;
	status: 'running' | 'succeeded' | 'failed';
	error?: string;
	createTime: string;
}

const { service } = useCool();
const router = useRouter();
const workbenchOutput = usePahWorkbenchOutput();
const loading = ref(false);
const planLoading = ref(false);
const reconciling = ref(false);
const installations = ref<DictionaryInstallation[]>([]);
const selectedModuleId = ref('');
const plan = ref<DictionaryPlan>();
const records = ref<DictionaryRecord[]>([]);

const dictionaryInstallations = computed(() =>
	installations.value.filter(
		item => item.state === 'enabled' && item.manifest.dictionaryContributions?.length
	)
);
const totalChanges = computed(() => {
	if (!plan.value) return 0;
	return (
		plan.value.totals.createTypes +
		plan.value.totals.updateTypes +
		plan.value.totals.createItems +
		plan.value.totals.updateItems
	);
});
const planRows = computed(() =>
	(plan.value?.types || []).flatMap(type =>
		type.items.map(item => ({
			...item,
			typeKey: type.typeKey,
			typeName: type.typeName
		}))
	)
);
const primaryProps = computed(() => ({
	active: 'dictionary' as const,
	pluginOptions: dictionaryInstallations.value.map(installation => ({
		label: `${installation.name} · ${installation.version}`,
		value: installation.moduleId
	})),
	selectedModuleId: selectedModuleId.value,
	planSummary: plan.value
		? { totalChanges: totalChanges.value, conflicts: plan.value.conflicts.length }
		: null,
	planLoading: planLoading.value,
	onSelect: selectDictionaryModule,
	onLoadPlan: () => refreshPlan({ emitOutput: true })
}));

usePahViewContributions('/phoenix/dictionary-maintenance', {
	primary: {
		component: markRaw(PahPluginManagementPrimary),
		props: primaryProps
	}
});

function appendOutput(message: string) {
	workbenchOutput?.appendLine(`[字典维护] ${message}`);
}

function errorMessage(error: unknown, fallback: string) {
	return error instanceof Error && error.message ? error.message : fallback;
}

function actionLabel(action: ReconcileAction) {
	return { create: '新建', update: '补全元数据', preserve: '保留' }[action];
}

function actionType(action: ReconcileAction) {
	return ({ create: 'success', update: 'warning', preserve: 'info' }[action] || 'info') as
		| 'success'
		| 'warning'
		| 'info';
}

function recordLabel(status: DictionaryRecord['status']) {
	return { running: '执行中', succeeded: '成功', failed: '失败' }[status];
}

function recordType(status: DictionaryRecord['status']) {
	return ({ running: 'warning', succeeded: 'success', failed: 'danger' }[status] || 'info') as
		| 'warning'
		| 'success'
		| 'danger'
		| 'info';
}

async function loadInstallations() {
	installations.value = await service.request({
		url: '/admin/phoenix/plugin/list',
		method: 'POST',
		data: {}
	});
	if (!dictionaryInstallations.value.some(item => item.moduleId === selectedModuleId.value)) {
		selectDictionaryModule(dictionaryInstallations.value[0]?.moduleId || '');
	}
}

function selectDictionaryModule(moduleId: string) {
	if (moduleId === selectedModuleId.value) return;
	selectedModuleId.value = moduleId;
	plan.value = undefined;
	records.value = [];
}

async function refreshPlan({ emitOutput = false }: { emitOutput?: boolean } = {}) {
	if (!selectedModuleId.value) {
		plan.value = undefined;
		records.value = [];
		return;
	}
	planLoading.value = true;
	try {
		const [nextPlan, recordPage] = await Promise.all([
			service.request({
				url: '/admin/phoenix/plugin/dictionary-plan',
				method: 'GET',
				params: { moduleId: selectedModuleId.value }
			}),
			service.request({
				url: '/admin/phoenix/plugin/dictionary-records',
				method: 'GET',
				params: { moduleId: selectedModuleId.value, page: 1, size: 20 }
			})
		]);
		plan.value = nextPlan;
		records.value = recordPage.list || [];
		if (emitOutput) {
			appendOutput(
				`dry-run 完成：${selectedModuleId.value}，待补全 ${totalChanges.value} 项，冲突 ${nextPlan.conflicts.length} 项。`
			);
		}
	} catch (error: unknown) {
		const message = errorMessage(error, '字典补全计划加载失败');
		ElMessage.error(message);
		if (emitOutput) appendOutput(`dry-run 失败：${selectedModuleId.value}，${message}`);
	} finally {
		planLoading.value = false;
	}
}

async function refreshAll({ emitOutput = false }: { emitOutput?: boolean } = {}) {
	loading.value = true;
	try {
		await loadInstallations();
		if (plan.value && selectedModuleId.value) await refreshPlan();
		if (emitOutput) {
			appendOutput(
				`状态已刷新：${dictionaryInstallations.value.length} 个插件可执行字典补全。`
			);
		}
	} catch (error: unknown) {
		const message = errorMessage(error, '字典维护状态加载失败');
		ElMessage.error(message);
		if (emitOutput) appendOutput(`状态刷新失败：${message}`);
	} finally {
		loading.value = false;
	}
}

async function reconcile() {
	if (!plan.value || !selectedModuleId.value) return;
	try {
		await ElMessageBox.confirm(
			`将新建/补全 ${totalChanges.value} 项治理数据；管理员自定义项和额外标签会保留。是否继续？`,
			'确认字典补全',
			{ type: 'warning', confirmButtonText: '确认补全' }
		);
	} catch {
		appendOutput(`已取消补全：${selectedModuleId.value}。`);
		return;
	}
	reconciling.value = true;
	appendOutput(`开始补全：${selectedModuleId.value}，计划 ${totalChanges.value} 项。`);
	try {
		await service.request({
			url: '/admin/phoenix/plugin/dictionary-reconcile',
			method: 'POST',
			data: {
				moduleId: selectedModuleId.value,
				dictionaryFingerprint: plan.value.fingerprint,
				dictionaryConfirmed: true
			}
		});
		ElMessage.success('字典补全完成；再次 dry-run 应为 0 项变更');
		await refreshPlan();
		appendOutput(
			`补全完成：${selectedModuleId.value}；复核 dry-run 剩余 ${totalChanges.value} 项。`
		);
	} catch (error: unknown) {
		const message = errorMessage(error, '字典补全失败');
		ElMessage.error(message);
		appendOutput(`补全失败：${selectedModuleId.value}，${message}`);
	} finally {
		reconciling.value = false;
	}
}

function openDictionaryCrud() {
	void router.push('/dict/list');
}

onMounted(refreshAll);
</script>

<style lang="scss" scoped>
.dictionary-maintenance {
	height: 100%;
	min-height: 0;
	color: var(--el-text-color-primary);
	--pnw-page-bg: var(--el-bg-color-page);
}

.section-heading,
.header-actions {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
}

.section-heading h2 {
	margin: 4px 0;
}

.eyebrow {
	margin: 0;
	color: var(--el-text-color-secondary);
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.12em;
}

.panel {
	margin-top: 16px;
	padding: 18px;
	border: 1px solid var(--el-border-color-light);
	border-radius: 12px;
	background: var(--el-bg-color);
}

.totals {
	display: grid;
	grid-template-columns: repeat(6, minmax(110px, 1fr));
	gap: 10px;
	margin-top: 16px;
}

.totals div {
	display: grid;
	gap: 6px;
	padding: 12px;
	border-radius: 8px;
	background: var(--el-fill-color-light);
}

.totals span {
	color: var(--el-text-color-secondary);
	font-size: 12px;
}

.totals strong {
	font-size: 22px;
}

.plan-table {
	margin-top: 16px;
}

.plan-item-name {
	display: grid;
	gap: 2px;
}

.plan-item-name code {
	color: var(--el-text-color-secondary);
	font-size: 12px;
}

@media (max-width: 900px) {
	.dictionary-maintenance {
		--pnw-page-main-block-padding: 10px;
	}

	.section-heading {
		align-items: stretch;
		flex-direction: column;
	}

	.header-actions {
		width: 100%;
	}

	.totals {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}
</style>

<template>
	<pnw-page-layout
		class="phoenix-maintenance-page"
		title="系统维护"
		:body-inset="true"
		:body-scroll="true"
	>
		<template #actions>
			<el-button :loading="loading" @click="load">刷新</el-button>
		</template>

		<section class="maintenance-notice">
			<strong>检测后再执行</strong>
			<span
				>本页只调用 Host 预注册的等幂维护项，不接收任意
				SQL、脚本或文件路径。执行前会在事务中重新核对计划指纹。</span
			>
		</section>

		<section v-loading="loading" class="maintenance-list" aria-live="polite">
			<el-empty v-if="!loading && !operations.length" description="没有已登记的维护项" />
			<article
				v-for="operation in operations"
				:key="operation.operationId"
				class="maintenance-card"
				:data-state="operation.state"
			>
				<header>
					<div>
						<strong>{{ operation.title }}</strong>
						<span>{{ operation.description }}</span>
					</div>
					<el-tag :type="operation.state === 'healthy' ? 'success' : 'warning'">
						{{ operation.state === 'healthy' ? '无需处理' : '待处理' }}
					</el-tag>
				</header>

				<dl>
					<div>
						<dt>来源</dt>
						<dd>
							{{
								operation.source === 'host'
									? 'Phoenix Admin Host'
									: operation.source
							}}
						</dd>
					</div>
					<div>
						<dt>影响记录</dt>
						<dd>{{ operation.affectedRecords }}</dd>
					</div>
				</dl>

				<div v-if="operation.changes.length" class="maintenance-plan">
					<strong>当前计划</strong>
					<div v-for="change in operation.changes" :key="change.recordId">
						<span>{{ change.name }} · #{{ change.recordId }}</span>
						<code v-if="change.label && change.label.current !== change.label.target">
							{{ change.label.current }} → {{ change.label.target }}
						</code>
						<code v-if="change.router.current !== change.router.target">
							{{ change.router.current }} → {{ change.router.target }}
						</code>
						<code v-if="change.viewPath.current !== change.viewPath.target">
							{{ change.viewPath.current }} → {{ change.viewPath.target }}
						</code>
					</div>
				</div>

				<footer>
					<el-button
						:loading="checkingOperationId === operation.operationId"
						@click="check(operation.operationId)"
					>
						重新检测
					</el-button>
					<el-button
						v-if="operation.state === 'action-required'"
						type="primary"
						:loading="applyingOperationId === operation.operationId"
						@click="apply(operation)"
					>
						执行升级
					</el-button>
				</footer>
			</article>
		</section>
	</pnw-page-layout>
</template>

<script lang="ts" setup>
import { markRaw, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { PnwPageLayout } from 'phoenix-wing';
import { useCool } from '/@/cool';
import PahPluginManagementPrimary from '/@/phoenix/PahPluginManagementPrimary.vue';
import { usePahViewContributions } from '/@/phoenix/PahViewContributions';

defineOptions({ name: 'phoenix-system-maintenance' });

type MaintenanceChange = {
	recordId: number;
	name: string;
	label?: { current: string | null; target: string | null };
	router: { current: string | null; target: string | null };
	viewPath: { current: string | null; target: string | null };
};

type MaintenanceOperation = {
	operationId: string;
	title: string;
	description: string;
	source: 'host' | string;
	state: 'healthy' | 'action-required';
	affectedRecords: number;
	fingerprint: string;
	changes: MaintenanceChange[];
};

const { service } = useCool();
const loading = ref(false);
const checkingOperationId = ref('');
const applyingOperationId = ref('');
const operations = ref<MaintenanceOperation[]>([]);

usePahViewContributions('/phoenix/maintenance', {
	primary: {
		component: markRaw(PahPluginManagementPrimary),
		props: { active: 'maintenance' }
	}
});

function replaceOperation(next: MaintenanceOperation) {
	const index = operations.value.findIndex(item => item.operationId === next.operationId);
	if (index >= 0) operations.value.splice(index, 1, next);
	else operations.value.push(next);
}

async function load() {
	loading.value = true;
	try {
		operations.value =
			(await service.request({
				url: '/admin/phoenix/maintenance/read',
				method: 'GET'
			})) || [];
	} catch (error: any) {
		ElMessage.error(error.message || '系统维护状态加载失败');
	} finally {
		loading.value = false;
	}
}

async function check(operationId: string) {
	checkingOperationId.value = operationId;
	try {
		const operation = await service.request({
			url: '/admin/phoenix/maintenance/plan',
			method: 'POST',
			data: { operationId }
		});
		replaceOperation(operation);
		ElMessage.success(
			operation.state === 'healthy' ? '复检通过，无需处理' : '已生成最新维护计划'
		);
	} catch (error: any) {
		ElMessage.error(error.message || '维护项检测失败');
	} finally {
		checkingOperationId.value = '';
	}
}

async function apply(operation: MaintenanceOperation) {
	try {
		await ElMessageBox.confirm(
			`将按当前计划升级 ${operation.affectedRecords} 条记录。执行前会再次核对计划，是否继续？`,
			'执行系统维护',
			{ type: 'warning', confirmButtonText: '确认执行' }
		);
	} catch {
		return;
	}

	applyingOperationId.value = operation.operationId;
	try {
		const result = await service.request({
			url: '/admin/phoenix/maintenance/apply',
			method: 'POST',
			data: {
				operationId: operation.operationId,
				expectedFingerprint: operation.fingerprint
			}
		});
		replaceOperation(result.plan);
		ElMessage.success(
			result.applied ? `已升级 ${result.updatedRecords} 条记录` : '当前已经无需处理'
		);
	} catch (error: any) {
		ElMessage.error(error.message || '系统维护执行失败');
	} finally {
		applyingOperationId.value = '';
	}
}

onMounted(load);
</script>

<style scoped>
.phoenix-maintenance-page {
	color: var(--pnw-workbench-text, var(--el-text-color-primary));
}

.maintenance-notice,
.maintenance-card {
	border: 1px solid var(--pnw-workbench-border, var(--el-border-color));
	border-radius: 14px;
	background: var(--pnw-workbench-surface, var(--el-bg-color));
}

.maintenance-notice {
	display: grid;
	gap: 6px;
	padding: 14px 16px;
}

.maintenance-notice span,
.maintenance-card header span {
	color: var(--pnw-workbench-muted, var(--el-text-color-secondary));
	line-height: 1.6;
}

.maintenance-list {
	display: grid;
	gap: 14px;
	margin-top: 16px;
}

.maintenance-card {
	display: grid;
	gap: 14px;
	padding: 16px;
}

.maintenance-card header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 16px;
}

.maintenance-card header > div {
	display: grid;
	gap: 5px;
}

.maintenance-card dl {
	display: flex;
	gap: 24px;
	margin: 0;
}

.maintenance-card dl div {
	display: grid;
	gap: 3px;
}

.maintenance-card dt {
	color: var(--pnw-workbench-muted, var(--el-text-color-secondary));
	font-size: 12px;
}

.maintenance-card dd {
	margin: 0;
	font-weight: 600;
}

.maintenance-plan {
	display: grid;
	gap: 8px;
	padding: 12px;
	border-radius: 10px;
	background: var(--pnw-control-hover-bg, var(--el-fill-color-light));
}

.maintenance-plan > div {
	display: grid;
	gap: 4px;
}

.maintenance-plan code {
	overflow-wrap: anywhere;
	color: var(--el-color-primary);
}

.maintenance-card footer {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
}
</style>

<template>
	<div class="pah-navigation-page">
		<header class="hero">
			<div>
				<p class="eyebrow">PHOENIX ADMIN HOST</p>
				<h1>导航分组管理</h1>
				<p>
					内置“管理、开发、业务”作为稳定默认值；可建立自定义分组，并将 Host
					模块或已安装插件移动到任意分组。
				</p>
			</div>
			<el-button :loading="loading" @click="load">刷新</el-button>
		</header>

		<section class="notice">
			<strong>插件归属可恢复</strong>
			<span
				>业务插件以稳定模块键绑定。停用、卸载后重新安装时，将自动回到管理员最后配置的分组。</span
			>
		</section>

		<section class="groups card">
			<div class="section-head">
				<div>
					<h2>分组</h2>
					<span>内置组可编辑名称、顺序与启用状态；自定义组可删除。</span>
				</div>
				<el-button type="primary" @click="openCreate">新建分组</el-button>
			</div>
			<el-empty v-if="!loading && !groups.length" description="尚未加载分组" />
			<div v-else class="group-list">
				<article v-for="group in groups" :key="group.id" class="group-row">
					<div class="group-row__flag">{{ group.isBuiltin ? '内置' : '自定义' }}</div>
					<el-input v-model="draft(group).label" maxlength="12" aria-label="分组名称" />
					<el-input-number
						v-model="draft(group).orderNum"
						:min="0"
						:max="9999"
						controls-position="right"
					/>
					<el-switch
						v-model="draft(group).isEnabled"
						active-text="启用"
						inactive-text="停用"
					/>
					<el-button :loading="savingId === group.id" @click="saveGroup(group)"
						>保存</el-button
					>
					<el-button
						v-if="!group.isBuiltin"
						type="danger"
						plain
						:loading="savingId === group.id"
						@click="removeGroup(group)"
						>删除</el-button
					>
				</article>
			</div>
		</section>

		<section class="modules card">
			<div class="section-head">
				<div>
					<h2>模块归属</h2>
					<span>模块为空时不会显示该大分组；未归属模块将自动归入“其他模块”。</span>
				</div>
			</div>
			<el-table :data="modules" stripe>
				<el-table-column prop="label" label="模块" min-width="180">
					<template #default="{ row }">
						<strong>{{ row.label }}</strong>
						<small>{{ sourceLabel(row.source) }}</small>
					</template>
				</el-table-column>
				<el-table-column label="所属大分组" min-width="240">
					<template #default="{ row }">
						<el-select
							:model-value="assignmentFor(row.targetKey)"
							placeholder="选择分组"
							:loading="assigningTarget === row.targetKey"
							@change="assign(row.targetKey, Number($event))"
						>
							<el-option
								v-for="group in enabledGroups"
								:key="group.id"
								:label="group.label"
								:value="group.id"
							/>
						</el-select>
					</template>
				</el-table-column>
			</el-table>
		</section>

		<el-dialog v-model="createVisible" title="新建大分组" width="420px" destroy-on-close>
			<el-form label-position="top">
				<el-form-item label="名称"
					><el-input v-model="createForm.label" maxlength="12" placeholder="例如：运营"
				/></el-form-item>
				<el-form-item label="顺序"
					><el-input-number v-model="createForm.orderNum" :min="0" :max="9999"
				/></el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="createVisible = false">取消</el-button>
				<el-button type="primary" :loading="creating" @click="createGroup">创建</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<script lang="ts" setup>
defineOptions({ name: 'pah-navigation-groups' });

import { computed, markRaw, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useCool } from '/@/cool';
import PahPluginManagementPrimary from '/@/phoenix/PahPluginManagementPrimary.vue';
import { usePahViewContributions } from '/@/phoenix/PahViewContributions';

type Group = {
	id: number;
	groupKey: string;
	label: string;
	orderNum: number;
	isBuiltin: boolean;
	isEnabled: boolean;
};
type Assignment = { targetKey: string; groupId: number };
type Module = { targetKey: string; menuId: number; label: string; source: string };

const { service } = useCool();
const loading = ref(false);
const creating = ref(false);
const createVisible = ref(false);
const savingId = ref<number>();
const assigningTarget = ref('');
const groups = ref<Group[]>([]);
const assignments = ref<Assignment[]>([]);
const modules = ref<Module[]>([]);
const drafts = reactive<Record<number, Pick<Group, 'label' | 'orderNum' | 'isEnabled'>>>({});
const createForm = reactive({ label: '', orderNum: 100 });
const enabledGroups = computed(() => groups.value.filter(group => group.isEnabled));

usePahViewContributions('/phoenix/navigation', {
	primary: {
		component: markRaw(PahPluginManagementPrimary),
		props: { active: 'groups' }
	}
});

function draft(group: Group) {
	if (!drafts[group.id]) {
		drafts[group.id] = {
			label: group.label,
			orderNum: group.orderNum,
			isEnabled: group.isEnabled
		};
	}
	return drafts[group.id];
}

function sourceLabel(source: string) {
	return source === 'host' ? 'Phoenix Admin Host' : `插件 · ${source}`;
}

function assignmentFor(targetKey: string) {
	return assignments.value.find(item => item.targetKey === targetKey)?.groupId;
}

async function load() {
	loading.value = true;
	try {
		const data = await service.request({
			url: '/admin/phoenix/navigation/read',
			method: 'GET'
		});
		groups.value = data.groups || [];
		assignments.value = data.assignments || [];
		modules.value = data.modules || [];
		groups.value.forEach(draft);
	} catch (error: any) {
		ElMessage.error(error.message || '大分组加载失败');
	} finally {
		loading.value = false;
	}
}

function openCreate() {
	createForm.label = '';
	createForm.orderNum = 100;
	createVisible.value = true;
}

async function createGroup() {
	creating.value = true;
	try {
		await service.request({
			url: '/admin/phoenix/navigation/save-group',
			method: 'POST',
			data: createForm
		});
		ElMessage.success('已建立自定义大分组');
		createVisible.value = false;
		await load();
	} catch (error: any) {
		ElMessage.error(error.message || '新建分组失败');
	} finally {
		creating.value = false;
	}
}

async function saveGroup(group: Group) {
	savingId.value = group.id;
	try {
		await service.request({
			url: '/admin/phoenix/navigation/save-group',
			method: 'POST',
			data: { id: group.id, ...draft(group) }
		});
		ElMessage.success('大分组已保存');
		await load();
	} catch (error: any) {
		ElMessage.error(error.message || '保存失败');
	} finally {
		savingId.value = undefined;
	}
}

async function removeGroup(group: Group) {
	try {
		await ElMessageBox.confirm(
			`删除“${group.label}”后，其中模块将恢复为未归属状态。是否继续？`,
			'删除自定义分组',
			{ type: 'warning' }
		);
	} catch {
		return;
	}
	savingId.value = group.id;
	try {
		await service.request({
			url: '/admin/phoenix/navigation/remove-group',
			method: 'POST',
			data: { id: group.id }
		});
		ElMessage.success('自定义大分组已删除');
		await load();
	} catch (error: any) {
		ElMessage.error(error.message || '删除失败');
	} finally {
		savingId.value = undefined;
	}
}

async function assign(targetKey: string, groupId: number) {
	assigningTarget.value = targetKey;
	try {
		const data = await service.request({
			url: '/admin/phoenix/navigation/assign',
			method: 'POST',
			data: { targetKey, groupId }
		});
		assignments.value = data.assignments || [];
		groups.value = data.groups || groups.value;
		ElMessage.success('模块归属已更新');
	} catch (error: any) {
		ElMessage.error(error.message || '模块归属更新失败');
	} finally {
		assigningTarget.value = '';
	}
}

onMounted(load);
</script>

<style lang="scss" scoped>
.pah-navigation-page {
	min-height: 100%;
	box-sizing: border-box;
	padding: 28px;
	overflow: auto;
	color: var(--pnw-workbench-text, var(--el-text-color-primary));
	background:
		radial-gradient(
			circle at 90% 0%,
			color-mix(
				in srgb,
				var(--pnw-control-active-bg, var(--el-color-primary)) 12%,
				transparent
			),
			transparent 32%
		),
		var(--pnw-workbench-bg, var(--el-bg-color-page));
}
.hero,
.section-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20px;
}
.hero h1,
.section-head h2 {
	margin: 4px 0 8px;
}
.hero h1 {
	font-size: 30px;
}
.eyebrow {
	margin: 0;
	color: var(--pnw-workbench-muted, var(--el-text-color-secondary));
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.14em;
}
.hero p:last-child,
.section-head span {
	margin: 0;
	color: var(--pnw-workbench-muted, var(--el-text-color-secondary));
}
.notice,
.card {
	margin-top: 20px;
	border: 1px solid var(--pnw-workbench-border, var(--el-border-color));
	border-radius: 16px;
	background: color-mix(
		in srgb,
		var(--pnw-workbench-surface, var(--el-bg-color)) 92%,
		transparent
	);
	box-shadow: 0 12px 36px
		color-mix(in srgb, var(--pnw-workbench-text, var(--el-text-color-primary)) 6%, transparent);
}
.notice {
	display: flex;
	gap: 12px;
	padding: 16px 20px;
	color: var(--pnw-workbench-muted, var(--el-text-color-regular));
}
.notice strong {
	color: var(--pnw-control-active-bg, var(--el-color-primary));
	white-space: nowrap;
}
.card {
	padding: 20px;
}
.group-list {
	display: grid;
	gap: 10px;
	margin-top: 16px;
}
.group-row {
	display: grid;
	grid-template-columns: 70px minmax(120px, 1fr) 130px 105px auto auto;
	gap: 10px;
	align-items: center;
	padding: 10px;
	border-radius: 10px;
	background: color-mix(
		in srgb,
		var(--pnw-workbench-bg, var(--el-bg-color-page)) 72%,
		var(--pnw-workbench-surface, var(--el-bg-color))
	);
}
.group-row__flag {
	color: var(--pnw-workbench-muted, var(--el-text-color-secondary));
	font-size: 12px;
	font-weight: 700;
}
.modules small {
	display: block;
	margin-top: 3px;
	color: var(--pnw-workbench-muted, var(--el-text-color-secondary));
}
@media (max-width: 850px) {
	.group-row {
		grid-template-columns: 1fr 1fr;
	}
	.hero,
	.section-head {
		align-items: flex-start;
		flex-direction: column;
	}
	.notice {
		flex-direction: column;
	}
}
</style>

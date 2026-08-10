<template>
	<div class="pah-plugin-page">
		<header class="hero">
			<div>
				<p class="eyebrow">PHOENIX ADMIN HOST</p>
				<h1>Phoenix 插件</h1>
				<p class="summary">选择插件包，完成一次点检并安装；停用和卸载作为独立管理操作。</p>
			</div>
			<div class="hero-actions">
				<el-button @click="router.push('/pah/identity')">外部身份审查</el-button>
				<el-button :loading="loading" @click="refresh">刷新</el-button>
				<el-button type="primary" :loading="acting" @click="choosePackage">
					添加 .phoenix.cool
				</el-button>
			</div>
		</header>

		<input
			ref="packageInput"
			class="package-input"
			type="file"
			accept=".phoenix.cool"
			@change="onPackageSelected"
		/>

		<div v-if="packageState !== 'idle'" class="package-status" :data-state="packageState">
			<div>
				<strong>{{ packageStatusTitle }}</strong>
				<span>{{ packageStatusDetail }}</span>
			</div>
			<el-button
				v-if="selectedPackage && packageState !== 'success'"
				type="primary"
				:loading="acting"
				@click="validateSelectedPackage"
			>
				验证并添加
			</el-button>
		</div>

		<section class="package-rule">
			<strong>无需额外 pnpm 安装</strong>
			<span>
				Phoenix 插件包必须自包含 Node/Vue 运行制品；若运行点检报告缺少依赖，应修正插件包，
				不在 Host 临时安装未知 npm 包。
			</span>
		</section>

		<section class="plugin-grid" v-loading="loading">
			<article v-for="installation in list" :key="installation.id" class="plugin-card">
				<header class="card-header">
					<img
						class="plugin-mark"
						src="/pah-phoenixwing-mark.svg"
						alt="Phoenix"
					/>
					<div class="card-identity">
						<div class="card-badges">
							<el-tag type="primary" effect="dark" size="small">Phoenix</el-tag>
							<el-tag effect="plain" size="small">v{{ installation.version }}</el-tag>
							<el-tag type="success" effect="plain" size="small">业务插件</el-tag>
						</div>
						<h2>{{ installation.name }}</h2>
						<p class="module-id">{{ installation.moduleId }}</p>
						<p class="publisher-date">
							{{ installation.publisher || installation.manifest.publisher || 'Phoenix' }} ·
							{{ formatInstallationDate(installation) }}
						</p>
					</div>
					<span class="state" :data-state="installation.state">
						{{ stateLabel(installation.state) }}
					</span>
				</header>

				<div class="card-facts">
					<span>{{ installation.manifest.navigation.modules.length }} 个导航模块</span>
					<span>{{ installation.manifest.migrations.length }} 条迁移</span>
					<span>{{ installation.manifest.dataOwnership.tables.length }} 张业务表</span>
				</div>

				<div class="reuse">
					<el-tag
						v-for="item in installation.manifest.hostReuse"
						:key="item"
						effect="plain"
						size="small"
					>
						{{ reuseLabel[item] || item }}
					</el-tag>
				</div>

				<p v-if="installation.state === 'uninstalled'" class="retained">
					代码贡献已注销，业务数据保持不变。
				</p>

				<footer class="card-actions">
					<el-button
						v-if="installation.state === 'verified'"
						type="primary"
						@click="openInstallDialog(installation)"
					>
						安装
					</el-button>
					<el-button
						v-else-if="installation.state === 'installed'"
						type="success"
						@click="openInstallDialog(installation)"
					>
						启用
					</el-button>
					<el-button
						v-else-if="installation.state === 'enabled'"
						:loading="acting"
						@click="runAction('disable', installation)"
					>
						停用
					</el-button>
					<el-button
						v-else-if="installation.state === 'disabled'"
						type="success"
						:loading="acting"
						@click="enableManagedPlugin(installation)"
					>
						启用
					</el-button>
					<el-button
						v-else-if="installation.state === 'uninstalled'"
						@click="choosePackage"
					>
						重新选择插件包
					</el-button>
					<el-button
						v-if="installation.state === 'verified'"
						plain
						:loading="discardLoadingModuleId === installation.moduleId"
						@click="discardSelectedPackage(installation)"
					>
						移除已选包
					</el-button>

					<el-button
						v-if="['installed', 'disabled'].includes(installation.state)"
						type="danger"
						plain
						:loading="uninstallLoadingModuleId === installation.moduleId"
						@click="controlledUninstall(installation)"
					>
						卸载
					</el-button>
				</footer>
			</article>
		</section>

		<el-empty v-if="!loading && !list.length" description="尚未登记 Phoenix 业务插件">
			<el-button type="primary" @click="choosePackage">选择 .phoenix.cool</el-button>
		</el-empty>

		<el-dialog
			v-model="installDialogVisible"
			:title="activeInstallation ? `安装 ${activeInstallation.name}` : '安装插件'"
			width="min(680px, calc(100vw - 32px))"
			:close-on-click-modal="!installBusy"
			:close-on-press-escape="!installBusy"
		>
			<template v-if="activeInstallation">
				<el-steps
					:active="installProgress(activeInstallation)"
					finish-status="success"
					align-center
				>
					<el-step title="运行点检" />
					<el-step title="受控安装" />
					<el-step title="启用入口" />
				</el-steps>

				<section class="install-summary">
					<strong>{{ installHeadline(activeInstallation) }}</strong>
					<p>{{ installDescription(activeInstallation) }}</p>
				</section>

				<div
					v-if="migrationPlans[activeInstallation.moduleId]"
					class="migration-plan compact"
				>
					<div class="plan-facts">
						<span>事务：必须</span>
						<span>
							备份：{{
								migrationPlans[activeInstallation.moduleId]?.backupRequired
									? 'Host 自动备份并恢复点检'
									: '无待执行 DDL，本次无需'
							}}
						</span>
						<span>
							有效期至：{{
								formatPlanExpiry(
									migrationPlans[activeInstallation.moduleId]?.expiresAt
								)
							}}
						</span>
					</div>
					<ul>
						<li
							v-for="item in migrationPlans[activeInstallation.moduleId]?.items || []"
							:key="item.id"
						>
							<el-tag
								:type="item.state === 'applied' ? 'success' : 'warning'"
								effect="plain"
							>
								{{ item.state === 'applied' ? '已应用' : '待应用' }}
							</el-tag>
							<strong>{{ item.id }}</strong>
							<span>{{ item.description }}</span>
						</li>
					</ul>
				</div>

				<el-checkbox
					v-if="migrationPlans[activeInstallation.moduleId]?.backupRequired"
					v-model="installAcknowledged"
				>
					我已确认本次会修改数据库；Host 将自动创建备份并完成恢复点检
				</el-checkbox>
			</template>

			<template #footer>
				<el-button :disabled="installBusy" @click="installDialogVisible = false"
					>取消</el-button
				>
				<el-button
					v-if="activeInstallation && activeInstallation.state !== 'enabled'"
					type="primary"
					:loading="installBusy"
					@click="continueInstallation(activeInstallation)"
				>
					{{ installButtonLabel(activeInstallation) }}
				</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<script lang="ts" setup>
defineOptions({ name: 'phoenix-business-plugins' });

import { computed, markRaw, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useCool } from '/@/cool';
import { useBase } from '/$/base';
import type { PahMigrationDryRunPlan, PahPluginManifest } from '../manifest/PahPluginManifest';
import { pahPathBelongsToPlugin } from '/@/pah/PahPluginLifecycleCleanup';
import { usePahWorkbenchOutput } from '/@/pah/PahWorkbenchOutput';
import PahPluginManagementPrimary from '/@/pah/PahPluginManagementPrimary.vue';
import { usePahViewContributions } from '/@/pah/PahViewContributions';

type LifecycleState =
	| 'verified'
	| 'staged'
	| 'migrated'
	| 'installed'
	| 'enabled'
	| 'disabled'
	| 'uninstalled'
	| 'rejected'
	| 'failed';

interface Installation {
	id: number;
	moduleId: string;
	name: string;
	version: string;
	state: LifecycleState;
	activationMode: 'restart';
	manifest: PahPluginManifest;
	publisher?: string;
	dataRetained: boolean;
	lastBackupId?: string;
	createTime?: string;
	updateTime?: string;
	stateChangedAt?: string;
}

interface LocalBackup {
	backupId: string;
	sha256: string;
	size: number;
	createdAt: string;
	restoreVerifiedAt: string;
}

interface DictionaryPlan {
	fingerprint: string;
	conflicts: string[];
	totals: {
		createTypes: number;
		updateTypes: number;
		createItems: number;
		updateItems: number;
	};
}

interface LocalRuntimeStatus {
	moduleId: string;
	version: string;
	ready: boolean;
	migrations: number;
	pendingMigrations: number;
}

const { service, route, router } = useCool();
const { menu, process } = useBase();
const workbenchOutput = usePahWorkbenchOutput();

usePahViewContributions('/phoenix/plugins', {
	primary: {
		component: markRaw(PahPluginManagementPrimary),
		props: { active: 'phoenix' }
	}
});
const list = ref<Installation[]>([]);
const loading = ref(false);
const acting = ref(false);
const runtimeCheckLoadingModuleId = ref('');
const planLoadingModuleId = ref('');
const installLoadingModuleId = ref('');
const uninstallLoadingModuleId = ref('');
const discardLoadingModuleId = ref('');
const dictionaryPlanLoadingModuleId = ref('');
const runtimeStatuses = ref<Record<string, LocalRuntimeStatus | undefined>>({});
const migrationPlans = ref<Record<string, PahMigrationDryRunPlan | undefined>>({});
const dictionaryPlans = ref<Record<string, DictionaryPlan | undefined>>({});
const packageInput = ref<HTMLInputElement>();
const selectedPackage = ref<File>();
const packageState = ref<'idle' | 'selected' | 'working' | 'success' | 'error'>('idle');
const packageStatusDetail = ref('尚未选择插件包');
const installDialogVisible = ref(false);
const activeModuleId = ref('');
const installAcknowledged = ref(false);
const packageStatusTitle = computed(
	() =>
		({
			idle: '等待选择',
			selected: '已选择，等待验证',
			working: '正在校验并装配',
			success: '插件包已登记',
			error: '插件包处理失败'
		})[packageState.value]
);
const activeInstallation = computed(
	() => list.value.find(item => item.moduleId === activeModuleId.value) || null
);
const installBusy = computed(
	() =>
		acting.value ||
		Boolean(runtimeCheckLoadingModuleId.value) ||
		Boolean(planLoadingModuleId.value) ||
		Boolean(installLoadingModuleId.value) ||
		Boolean(dictionaryPlanLoadingModuleId.value)
);

const reuseLabel: Record<string, string> = {
	identity: '统一登录',
	users: '用户',
	departments: '部门',
	roles: '系统角色',
	menus: '菜单',
	dictionary: '字典',
	files: '文件',
	tasks: '任务',
	audit: '审计',
	parameters: '参数',
	backup: '备份'
};

const stateLabels: Record<string, string> = {
	verified: '已验证',
	staged: '已暂存',
	migrated: '已迁移',
	installed: '已安装',
	enabled: '已启用',
	disabled: '已停用',
	uninstalled: '已卸载 · 数据保留',
	rejected: '已拒绝',
	failed: '失败'
};

function stateLabel(state: string) {
	return stateLabels[state] || state;
}

function output(message: string) {
	console.info(`[phoenix-plugin] ${message}`);
	workbenchOutput?.appendLine(`[Phoenix 插件] ${message}`);
}

function formatPlanExpiry(value?: string) {
	if (!value) return '未知';
	return new Date(value).toLocaleString();
}

function formatInstallationDate(installation: Installation) {
	const value =
		installation.updateTime || installation.stateChangedAt || installation.createTime;
	if (!value) return '日期未知';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '日期未知';
	return new Intl.DateTimeFormat('zh-CN', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(date);
}

function packageProcessingErrorMessage(error: any) {
	const message = String(error?.message || '插件包处理失败');
	const status = Number(error?.response?.status || 0);
	if (status >= 500 || /status code 5\d\d/iu.test(message)) {
		return 'API 未就绪或插件包处理失败；请先确认 API Terminal 已 ready，再查看后端首条错误';
	}
	return message;
}

async function synchronizeHostAfterPluginStateChange(
	installation: Installation,
	enabled: boolean
) {
	if (!enabled) {
		prunePluginRoutesAndTabs(installation);
	}

	try {
		await menu.get();
		output(`${installation.moduleId} 的菜单、权限与动态路由状态已同步`);
	} catch (error: any) {
		output(`${installation.moduleId} 状态已更新，但导航刷新失败：${error.message || '未知错误'}`);
		ElMessage.warning('插件状态已更新；导航刷新失败，请刷新页面');
	}

	if (!enabled && pahPathBelongsToPlugin(route.path, installation)) {
		await router.replace('/phoenix/plugins');
	}
}

function prunePluginRoutesAndTabs(installation: Installation) {
	const staleRouteNames = router
		.getRoutes()
		.filter(
			item =>
				item.meta?.dynamic &&
				pahPathBelongsToPlugin(item.path, installation) &&
				item.name
		)
		.map(item => String(item.name));
	for (const routeName of staleRouteNames) router.removeRoute(routeName);

	process.set(process.list.filter(item => !pahPathBelongsToPlugin(item.path, installation)));
}

function openInstallDialog(installation: Installation) {
	activeModuleId.value = installation.moduleId;
	installAcknowledged.value = false;
	installDialogVisible.value = true;
}

function installProgress(installation: Installation) {
	if (installation.state === 'enabled') return 3;
	if (['installed', 'disabled'].includes(installation.state)) return 2;
	if (runtimeStatuses.value[installation.moduleId]?.ready) return 1;
	return 0;
}

function installHeadline(installation: Installation) {
	if (installation.state === 'verified') {
		return runtimeStatuses.value[installation.moduleId]?.ready
			? '运行制品已就绪，可以执行受控安装'
			: '先检查 API 是否已加载新插件';
	}
	if (installation.state === 'installed') return '安装完成，等待启用菜单和权限';
	if (installation.state === 'disabled') return '插件已停用，可以直接重新启用';
	if (installation.state === 'enabled') return '插件已经启用';
	return `当前状态：${stateLabel(installation.state)}`;
}

function installDescription(installation: Installation) {
	if (installation.state === 'verified' && !runtimeStatuses.value[installation.moduleId]?.ready) {
		return '若本次加入了新的 Node payload，请先在 API Terminal 重启服务，再点“检查并继续”。';
	}
	if (installation.state === 'verified') {
		return 'Host 会生成一次性 dry-run；有待执行 DDL 时自动创建备份并完成恢复点检，然后以事务安装。';
	}
	if (['installed', 'disabled'].includes(installation.state)) {
		return '启用会物化插件声明的菜单、权限和字典贡献。';
	}
	return '无需继续安装。';
}

function installButtonLabel(installation: Installation) {
	if (installation.state === 'verified') {
		return runtimeStatuses.value[installation.moduleId]?.ready ? '安装并启用' : '检查并继续';
	}
	if (['installed', 'disabled'].includes(installation.state)) return '启用';
	return '继续';
}

async function checkLocalRuntime(installation: Installation) {
	runtimeCheckLoadingModuleId.value = installation.moduleId;
	output(`${installation.moduleId} 开始检查 API 重启后的 Node 运行制品`);
	try {
		const status = (await service.request({
			url: '/admin/phoenix/plugin/local-runtime-status',
			method: 'GET',
			params: { moduleId: installation.moduleId }
		})) as LocalRuntimeStatus;
		runtimeStatuses.value = {
			...runtimeStatuses.value,
			[installation.moduleId]: status
		};
		output(
			`${installation.moduleId}@${status.version} API 运行时已就绪：迁移 ${status.migrations} 条，待应用 ${status.pendingMigrations} 条`
		);
		ElMessage.success('API 运行时检查通过；现在可以生成 dry-run 计划');
		return status;
	} catch (error: any) {
		runtimeStatuses.value = {
			...runtimeStatuses.value,
			[installation.moduleId]: undefined
		};
		output(
			`${installation.moduleId} API 运行时检查失败：${error.message || '运行制品尚未加载'}`
		);
		ElMessage.error(error.message || 'API 尚未按新插件制品完成重启');
		return undefined;
	} finally {
		runtimeCheckLoadingModuleId.value = '';
	}
}

async function loadMigrationPlan(installation: Installation) {
	planLoadingModuleId.value = installation.moduleId;
	try {
		const plan = (await service.request({
			url: '/admin/phoenix/plugin/migration-plan',
			method: 'GET',
			params: { moduleId: installation.moduleId }
		})) as PahMigrationDryRunPlan;
		migrationPlans.value = { ...migrationPlans.value, [installation.moduleId]: plan };
		ElMessage.success('dry-run 计划已生成；该计划短时有效且只能由受控发布编排使用');
		return plan;
	} catch (error: any) {
		ElMessage.error(error.message || '迁移计划生成失败');
		return undefined;
	} finally {
		planLoadingModuleId.value = '';
	}
}

async function refresh() {
	loading.value = true;
	try {
		list.value = await service.request({
			url: '/admin/phoenix/plugin/list',
			method: 'POST',
			data: {}
		});
		for (const installation of list.value.filter(item =>
			['disabled', 'uninstalled'].includes(item.state)
		)) {
			prunePluginRoutesAndTabs(installation);
		}
	} catch (error: any) {
		ElMessage.error(error.message || '插件列表加载失败');
	} finally {
		loading.value = false;
	}
}

function choosePackage() {
	packageInput.value?.click();
}

async function onPackageSelected(event: Event) {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	input.value = '';
	if (!file) return;
	if (!file.name.endsWith('.phoenix.cool')) {
		packageState.value = 'error';
		packageStatusDetail.value = '只接受 .phoenix.cool；旧插件后缀不兼容';
		ElMessage.error(packageStatusDetail.value);
		output(`拒绝文件 ${file.name}：后缀不正确`);
		return;
	}
	selectedPackage.value = file;
	packageState.value = 'selected';
	packageStatusDetail.value = `${file.name} · ${(file.size / 1024).toFixed(1)} KiB`;
	output(`已选择 ${file.name}，等待验证`);
}

async function validateSelectedPackage() {
	const file = selectedPackage.value;
	if (!file) return;
	acting.value = true;
	packageState.value = 'working';
	packageStatusDetail.value = `${file.name} · ${(file.size / 1024).toFixed(1)} KiB`;
	output(`开始校验 ${file.name}（${file.size} bytes）`);
	try {
		const data = new FormData();
		data.append('files', file);
		const result = (await service.request({
			url: '/admin/phoenix/plugin/package',
			method: 'POST',
			data,
			headers: { 'Content-Type': 'multipart/form-data' },
			timeout: 120000
		})) as {
			moduleId: string;
			version: string;
			name: string;
			fileCount: number;
			packageSha256: string;
			restartRequired: boolean;
		};
		packageState.value = 'success';
		runtimeStatuses.value = {
			...runtimeStatuses.value,
			[result.moduleId]: undefined
		};
		const restartDetail = result.restartRequired
			? '新 Node/Vue payload 已装配；请重启 API 后在安装向导继续'
			: '不可变 payload 未变化；请在安装向导点检当前 API 运行时';
		packageStatusDetail.value = `${result.name} ${result.version} · ${result.fileCount} 文件 · SHA-256 ${result.packageSha256.slice(0, 12)}… · ${restartDetail}`;
		output(`${result.moduleId}@${result.version} 校验登记完成；${restartDetail}`);
		ElMessage.success('插件包已添加；请在安装向导继续');
		await refresh();
		const installation = list.value.find(item => item.moduleId === result.moduleId);
		if (installation) openInstallDialog(installation);
	} catch (error: any) {
		packageState.value = 'error';
		packageStatusDetail.value = packageProcessingErrorMessage(error);
		output(`处理失败：${packageStatusDetail.value}`);
		ElMessage.error(packageStatusDetail.value);
	} finally {
		acting.value = false;
	}
}

function hasDictionaryContributions(installation: Installation) {
	return Boolean(installation.manifest.dictionaryContributions?.length);
}

function dictionaryPlanChangeCount(moduleId: string) {
	const totals = dictionaryPlans.value[moduleId]?.totals;
	if (!totals) return 0;
	return totals.createTypes + totals.updateTypes + totals.createItems + totals.updateItems;
}

async function loadDictionaryPlan(installation: Installation) {
	dictionaryPlanLoadingModuleId.value = installation.moduleId;
	try {
		const plan = (await service.request({
			url: '/admin/phoenix/plugin/dictionary-plan',
			method: 'GET',
			params: { moduleId: installation.moduleId }
		})) as DictionaryPlan;
		dictionaryPlans.value = { ...dictionaryPlans.value, [installation.moduleId]: plan };
		const changes = dictionaryPlanChangeCount(installation.moduleId);
		output(
			`${installation.moduleId} 字典 dry-run 完成：待补全 ${changes} 项，冲突 ${plan.conflicts.length} 项`
		);
		if (plan.conflicts.length) {
			ElMessage.error('字典计划存在冲突，处理冲突后才能启用');
		} else {
			ElMessage.success('字典 dry-run 已生成；启用时将确认并应用该指纹');
		}
		return plan;
	} catch (error: any) {
		output(`${installation.moduleId} 字典 dry-run 失败：${error.message || '未知错误'}`);
		ElMessage.error(error.message || '字典计划生成失败');
		return undefined;
	} finally {
		dictionaryPlanLoadingModuleId.value = '';
	}
}

async function controlledInstall(installation: Installation) {
	installLoadingModuleId.value = installation.moduleId;
	output(`${installation.moduleId} 开始执行受控安装`);
	try {
		const result = (await service.request({
			url: '/admin/phoenix/plugin/local-controlled-install',
			method: 'POST',
			data: { moduleId: installation.moduleId },
			timeout: 300000
		})) as { appliedMigrations: number; backupId?: string };
		output(
			`${installation.moduleId} 受控安装完成：应用 ${result.appliedMigrations} 条迁移${
				result.backupId ? `，备份 ${result.backupId}` : '，本次无需备份'
			}`
		);
		ElMessage.success('受控安装完成；现在可以启用插件');
		await refresh();
		return true;
	} catch (error: any) {
		output(`${installation.moduleId} 受控安装失败：${error.message || '未知错误'}`);
		ElMessage.error(error.message || '受控安装失败');
		return false;
	} finally {
		installLoadingModuleId.value = '';
	}
}

async function runAction(action: 'enable' | 'disable', installation: Installation) {
	acting.value = true;
	try {
		const dictionaryPlan = dictionaryPlans.value[installation.moduleId];
		await service.request({
			url: `/admin/phoenix/plugin/${action}`,
			method: 'POST',
			data: {
				moduleId: installation.moduleId,
				...(action === 'enable' && hasDictionaryContributions(installation)
					? {
							dictionaryFingerprint: dictionaryPlan?.fingerprint,
							dictionaryConfirmed: true
						}
					: {})
			}
		});
		output(`${installation.moduleId} ${action === 'enable' ? '启用' : '停用'}完成`);
		ElMessage.success({ enable: '已启用', disable: '已停用' }[action]);
		await synchronizeHostAfterPluginStateChange(installation, action === 'enable');
		await refresh();
		return true;
	} catch (error: any) {
		ElMessage.error(error.message || '操作失败');
		return false;
	} finally {
		acting.value = false;
	}
}

async function enableManagedPlugin(installation: Installation) {
	let plan = dictionaryPlans.value[installation.moduleId];
	if (hasDictionaryContributions(installation) && !plan) {
		plan = await loadDictionaryPlan(installation);
	}
	if (plan?.conflicts.length) return false;
	return runAction('enable', installation);
}

async function continueInstallation(installation: Installation) {
	if (['installed', 'disabled'].includes(installation.state)) {
		if (await enableManagedPlugin(installation)) installDialogVisible.value = false;
		return;
	}
	if (installation.state !== 'verified') return;

	let runtime = runtimeStatuses.value[installation.moduleId];
	if (!runtime?.ready) {
		runtime = await checkLocalRuntime(installation);
		if (!runtime?.ready) return;
	}

	const plan =
		migrationPlans.value[installation.moduleId] || (await loadMigrationPlan(installation));
	if (!plan) return;
	if (plan.backupRequired && !installAcknowledged.value) {
		ElMessage.warning('请先确认数据库变更与自动备份');
		return;
	}
	if (!(await controlledInstall(installation))) return;

	const installed = list.value.find(item => item.moduleId === installation.moduleId);
	if (installed && (await enableManagedPlugin(installed))) {
		installDialogVisible.value = false;
	}
}

async function controlledUninstall(installation: Installation) {
	try {
		await ElMessageBox.confirm(
			`仅注销 ${installation.name} 的代码、路由和任务贡献；${installation.manifest.dataOwnership.tables.length} 张业务表将保留。requiresBackup 时应先在受控流程完成可信备份；本页生成的只是卸载关联号。是否继续？`,
			'安全卸载',
			{ type: 'warning', confirmButtonText: '保留数据并卸载' }
		);
	} catch {
		return;
	}

	uninstallLoadingModuleId.value = installation.moduleId;
	try {
		const result = (await service.request({
			url: '/admin/phoenix/plugin/local-controlled-uninstall',
			method: 'POST',
			data: { moduleId: installation.moduleId },
			timeout: 300000
		})) as { backup: LocalBackup };
		output(`${installation.moduleId} 已备份并卸载：${result.backup.backupId}`);
		ElMessage.success('已卸载，业务数据保持不变');
		await synchronizeHostAfterPluginStateChange(installation, false);
		await refresh();
	} catch (error: any) {
		ElMessage.error(error.message || '卸载失败');
	} finally {
		uninstallLoadingModuleId.value = '';
	}
}

async function discardSelectedPackage(installation: Installation) {
	try {
		await ElMessageBox.confirm(
			`移除 ${installation.name}@${installation.version} 的本机 Node/Vue 已选制品并结束本次验证？不会执行 SQL，也不会删除业务表、迁移台账或管理员分组。`,
			'移除已选包',
			{
				type: 'warning',
				confirmButtonText: '移除并允许重新选择',
				cancelButtonText: '取消'
			}
		);
	} catch {
		return;
	}

	discardLoadingModuleId.value = installation.moduleId;
	try {
		const result = (await service.request({
			url: '/admin/phoenix/plugin/local-package-discard',
			method: 'POST',
			data: { moduleId: installation.moduleId }
		})) as { removedPayloads: Array<'node' | 'vue'> };
		output(
			`${installation.moduleId}@${installation.version} 已移除本机已选包：${
				result.removedPayloads.join('/') || '无残留 payload'
			}`
		);
		selectedPackage.value = undefined;
		packageState.value = 'idle';
		packageStatusDetail.value = '尚未选择插件包';
		runtimeStatuses.value = {
			...runtimeStatuses.value,
			[installation.moduleId]: undefined
		};
		migrationPlans.value = {
			...migrationPlans.value,
			[installation.moduleId]: undefined
		};
		ElMessage.success('已移除旧制品，现在可以选择新的 .phoenix.cool');
		await refresh();
	} catch (error: any) {
		output(`${installation.moduleId} 已选包清理失败：${error.message || '未知错误'}`);
		ElMessage.error(error.message || '已选包清理失败');
	} finally {
		discardLoadingModuleId.value = '';
	}
}

onMounted(refresh);
</script>

<style lang="scss" scoped>
.pah-plugin-page {
	box-sizing: border-box;
	min-height: 100%;
	padding: 28px;
	overflow: auto;
	color: var(--el-text-color-primary);
	background:
		radial-gradient(
			circle at 90% 0%,
			color-mix(in srgb, var(--el-color-primary) 12%, transparent),
			transparent 32%
		),
		var(--el-bg-color-page);
}

.hero {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20px;
}

.hero h1 {
	margin: 4px 0 8px;
	font-size: 30px;
}

.hero-actions {
	display: flex;
	gap: 8px;
}

.eyebrow {
	margin: 0;
	color: var(--el-text-color-secondary);
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.14em;
}

.summary {
	margin: 0;
	color: var(--el-text-color-regular);
}

.package-input {
	display: none;
}

.package-status {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	margin-top: 20px;
	padding: 14px 16px;
	border: 1px dashed var(--el-border-color);
	border-radius: 10px;
	color: var(--el-text-color-regular);
	background: var(--el-fill-color-light);
}

.package-status > div {
	display: grid;
	gap: 4px;
}

.package-status strong {
	color: var(--el-text-color-primary);
}

.package-status[data-state='success'] {
	border-color: var(--el-color-success-light-5);
}

.package-status[data-state='selected'] {
	border-color: var(--el-color-primary-light-5);
}

.package-status[data-state='error'] {
	border-color: var(--el-color-danger-light-5);
}

.package-rule {
	display: grid;
	gap: 4px;
	margin-top: 20px;
	padding: 14px 16px;
	border: 1px solid var(--el-border-color-light);
	border-radius: 12px;
	color: var(--el-text-color-regular);
	font-size: 13px;
	background: color-mix(in srgb, var(--el-bg-color) 92%, transparent);
}

.package-rule strong {
	color: var(--el-text-color-primary);
}

.plugin-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	gap: 16px;
	margin-top: 20px;
}

.plugin-card {
	display: flex;
	min-width: 0;
	min-height: 220px;
	padding: 16px;
	border: 1px solid var(--el-border-color-light);
	border-radius: 14px;
	flex-direction: column;
	background: color-mix(in srgb, var(--el-bg-color) 94%, transparent);
	box-shadow: var(--el-box-shadow-light);
}

.card-header {
	display: grid;
	grid-template-columns: 68px minmax(0, 1fr) auto;
	align-items: start;
	gap: 14px;
}

.plugin-mark {
	display: block;
	width: 68px;
	height: 68px;
	object-fit: contain;
}

.card-identity {
	min-width: 0;
}

.card-badges {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 6px;
}

.card-badges :deep(.el-tag) {
	border-radius: 6px;
}

.plugin-card h2 {
	margin: 9px 0 0;
	font-size: 20px;
}

.module-id,
.publisher-date {
	margin: 4px 0 0;
	overflow: hidden;
	color: var(--el-text-color-secondary);
	font-size: 12px;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.publisher-date {
	margin-top: 8px;
	overflow: visible;
	text-overflow: clip;
	white-space: normal;
}

.card-facts {
	display: flex;
	flex-wrap: wrap;
	gap: 8px 14px;
	margin-top: 14px;
	color: var(--el-text-color-secondary);
	font-size: 12px;
}

.card-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin-top: auto;
	padding-top: 14px;
	border-top: 1px solid var(--el-border-color-lighter);
}

.install-summary {
	display: grid;
	gap: 6px;
	margin: 22px 0 14px;
	padding: 14px 16px;
	border-radius: 10px;
	background: var(--el-fill-color-light);
}

.install-summary p {
	margin: 0;
	color: var(--el-text-color-regular);
	line-height: 1.6;
}

.migration-plan.compact {
	margin: 14px 0;
	padding: 14px;
	border: 1px solid var(--el-color-warning-light-5);
	border-radius: 10px;
	background: var(--el-color-warning-light-9);
}

.state {
	padding: 4px 9px;
	border-radius: 999px;
	color: var(--el-color-primary);
	font-size: 12px;
	font-weight: 700;
	background: var(--el-color-primary-light-9);
}

.state[data-state='enabled'] {
	color: var(--el-color-success);
	background: var(--el-color-success-light-9);
}

.state[data-state='disabled'],
.state[data-state='uninstalled'] {
	color: var(--el-color-warning);
	background: var(--el-color-warning-light-9);
}

.reuse {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 6px;
	margin-top: 14px;
}

.reuse :deep(.el-tag) {
	width: auto;
	max-width: 100%;
	padding-inline: 8px;
	border-radius: 999px;
}

.migration-plan {
	display: grid;
	gap: 12px;
}

.plan-facts {
	display: flex;
	flex-wrap: wrap;
	gap: 8px 16px;
	color: var(--el-text-color-regular);
	font-size: 13px;
}

.migration-plan ul {
	display: grid;
	gap: 8px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.migration-plan li {
	display: grid;
	grid-template-columns: auto minmax(160px, auto) minmax(180px, 1fr) auto;
	align-items: center;
	gap: 10px;
	padding: 10px 12px;
	border-radius: 9px;
	background: color-mix(in srgb, var(--el-bg-color) 80%, transparent);
}

.retained {
	margin: 14px 0 0;
	padding: 10px 12px;
	border-radius: 10px;
	color: var(--el-color-warning);
	background: var(--el-color-warning-light-9);
}

@media (max-width: 800px) {
	.pah-plugin-page {
		padding: 18px;
	}

	.hero {
		align-items: flex-start;
		flex-direction: column;
	}

	.hero-actions {
		flex-wrap: wrap;
	}

	.plugin-grid {
		grid-template-columns: 1fr;
	}

	.card-header {
		grid-template-columns: 56px minmax(0, 1fr);
	}

	.plugin-mark {
		width: 56px;
		height: 56px;
	}

	.card-header .state {
		grid-column: 1 / -1;
		justify-self: start;
	}

	.package-status {
		align-items: flex-start;
		flex-direction: column;
	}

	.migration-plan li {
		display: flex;
		align-items: flex-start;
		flex-direction: column;
	}
}
</style>

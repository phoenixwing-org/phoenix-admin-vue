<template>
	<div class="pah-plugin-page">
		<header class="hero">
			<div>
				<p class="eyebrow">PHOENIX ADMIN HOST</p>
				<h1>业务插件</h1>
				<p class="summary">登记并验证跨前后端业务模块；Host 不归档或执行插件业务源码。</p>
			</div>
			<el-button :loading="loading" @click="refresh">刷新</el-button>
		</header>

		<section class="notice">
			<div class="notice-mark">Pah</div>
			<div>
				<strong>受控重启模式</strong>
				<p>
					启用代表贡献已获准，实际入口加载仍由受控构建或重启完成。卸载默认保留业务数据。
				</p>
			</div>
		</section>

		<section class="registration">
			<div class="section-heading">
				<div>
					<p class="eyebrow">PHOENIX PACKAGE</p>
					<h2>Phoenix 插件安装向导</h2>
				</div>
				<div class="package-actions">
					<el-button :disabled="acting" @click="choosePackage">
						第一步：选择 .phoenix.cool
					</el-button>
					<el-button
						type="primary"
						:loading="acting"
						:disabled="!selectedPackage"
						@click="validateSelectedPackage"
					>
						第二步：验证制品并登记
					</el-button>
				</div>
			</div>
			<p class="section-description">
				先选择不可变业务插件包，再明确执行验证。Host 校验后缀、完整性、manifest、Node/Vue
				payload 和 migration checksum，然后登记并装配到当前本机测试 Host。旧后缀不兼容。
			</p>
			<input
				ref="packageInput"
				class="package-input"
				type="file"
				accept=".phoenix.cool"
				@change="onPackageSelected"
			/>
			<div class="package-status" :data-state="packageState">
				<strong>{{ packageStatusTitle }}</strong>
				<span>{{ packageStatusDetail }}</span>
			</div>
			<p v-if="selectedPackage" class="step-reason">
				已选择 {{ selectedPackage.name }}；点击“第二步”才会上传和验证。
			</p>
		</section>

		<section v-for="installation in list" :key="installation.id" class="installation">
			<div class="installation-title">
				<div>
					<p class="eyebrow">{{ installation.moduleId }}</p>
					<h2>{{ installation.name }}</h2>
				</div>
				<span class="state" :data-state="installation.state">
					{{ stateLabel(installation.state) }}
				</span>
			</div>

			<div class="facts">
				<div>
					<span>版本</span><strong>{{ installation.version }}</strong>
				</div>
				<div><span>激活方式</span><strong>受控重启</strong></div>
				<div>
					<span>导航模块</span>
					<strong>{{ installation.manifest.navigation.modules.length }}</strong>
				</div>
				<div>
					<span>数据表</span>
					<strong>{{ installation.manifest.dataOwnership.tables.length }}</strong>
				</div>
				<div>
					<span>DDL 迁移</span>
					<strong>{{ installation.manifest.migrations.length }}</strong>
				</div>
			</div>

			<div v-if="pahHasMigrations(installation.manifest)" class="migration-governance">
				<div class="migration-heading">
					<div>
						<strong>受控 DDL 发布</strong>
						<p>
							本页只能校验制品并生成短时、一次性的 dry-run 计划；不能执行
							SQL，也不接收 planId、制品目录或备份证明。
						</p>
					</div>
				</div>

				<div v-if="migrationPlans[installation.moduleId]" class="migration-plan">
					<div class="plan-facts">
						<span>制品：已校验</span>
						<span>事务：必须</span>
						<span>
							备份：{{
								migrationPlans[installation.moduleId]?.backupRequired
									? '需可信证明'
									: '本次无需'
							}}
						</span>
						<span>
							有效期至：{{
								formatPlanExpiry(migrationPlans[installation.moduleId]?.expiresAt)
							}}
						</span>
					</div>
					<ul>
						<li
							v-for="item in migrationPlans[installation.moduleId]?.items || []"
							:key="item.id"
						>
							<el-tag
								:type="item.state === 'applied' ? 'success' : 'warning'"
								effect="plain"
							>
								{{ item.state === 'applied' ? '已应用' : '待应用' }}
							</el-tag>
							<strong>{{ item.id }} · v{{ item.version }}</strong>
							<span>{{ item.description }}</span>
							<code>{{ item.artifactPath }}</code>
						</li>
					</ul>
					<p class="controlled-release">
						执行仅由受控发布编排完成；需要备份时，必须先通过 Host 的可信备份验证器。
					</p>
				</div>
			</div>

			<div class="reuse">
				<span>复用 Admin Host</span>
				<div>
					<el-tag
						v-for="item in installation.manifest.hostReuse"
						:key="item"
						effect="plain"
					>
						{{ reuseLabel[item] || item }}
					</el-tag>
				</div>
			</div>

			<section class="workflow">
				<div class="workflow-heading">
					<strong>按顺序完成安装与生命周期</strong>
					<span>当前：{{ stateLabel(installation.state) }}</span>
				</div>
				<ol class="workflow-steps">
					<li :data-complete="runtimeStepComplete(installation)">
						<div class="step-index">3</div>
						<div class="step-content">
							<strong>重启 API 并检查运行时</strong>
							<p>
								在 API Terminal 中停止旧进程并按本地启动文档重新启动；返回本页后检查
								Node 制品是否已经加载。
							</p>
						</div>
						<el-button
							:loading="runtimeCheckLoadingModuleId === installation.moduleId"
							:disabled="installation.state !== 'verified'"
							@click="checkLocalRuntime(installation)"
						>
							第三步：检查 API 已重启
						</el-button>
						<small v-if="runtimeStatuses[installation.moduleId]?.ready">
							运行时已就绪；检测到
							{{ runtimeStatuses[installation.moduleId]?.migrations }} 条迁移，待应用
							{{ runtimeStatuses[installation.moduleId]?.pendingMigrations }} 条
						</small>
						<small v-else-if="installation.state !== 'verified'">
							{{ runtimeCheckDisabledReason(installation) }}
						</small>
						<small v-else>
							重启完成后必须点击本按钮；未通过检查不能生成 dry-run 计划
						</small>
					</li>

					<li
						:data-complete="
							Boolean(migrationPlans[installation.moduleId]) ||
							hasReachedInstalled(installation.state)
						"
					>
						<div class="step-index">4</div>
						<div class="step-content">
							<strong>生成 dry-run 计划</strong>
							<p>只读验证迁移制品、台账、顺序和 checksum，不执行 SQL。</p>
						</div>
						<el-button
							:loading="planLoadingModuleId === installation.moduleId"
							:disabled="!canLoadMigrationPlan(installation)"
							@click="loadMigrationPlan(installation)"
						>
							{{
								migrationPlans[installation.moduleId]
									? '刷新计划'
									: '第四步：生成计划'
							}}
						</el-button>
						<small v-if="!canLoadMigrationPlan(installation)">
							{{ migrationPlanDisabledReason(installation) }}
						</small>
					</li>

					<li
						:data-complete="
							Boolean(localBackups[installation.moduleId]) ||
							hasReachedInstalled(installation.state)
						"
					>
						<div class="step-index">5</div>
						<div class="step-content">
							<strong>创建可信备份</strong>
							<p>执行 PostgreSQL dump，并恢复到临时数据库完成真实恢复演练。</p>
						</div>
						<el-button
							:loading="backupLoadingModuleId === installation.moduleId"
							:disabled="!canCreateBackup(installation)"
							@click="createLocalBackup(installation)"
						>
							第五步：备份并验证恢复
						</el-button>
						<small v-if="!canCreateBackup(installation)">
							{{ backupDisabledReason(installation) }}
						</small>
						<small v-else-if="localBackups[installation.moduleId]">
							备份 {{ localBackups[installation.moduleId]?.backupId }} 已验证
						</small>
					</li>

					<li :data-complete="hasReachedInstalled(installation.state)">
						<div class="step-index">6</div>
						<div class="step-content">
							<strong>执行受控安装</strong>
							<p>服务端重新生成一次性计划，使用内部备份证明执行事务迁移。</p>
						</div>
						<el-button
							type="primary"
							:loading="installLoadingModuleId === installation.moduleId"
							:disabled="!canControlledInstall(installation)"
							@click="controlledInstall(installation)"
						>
							第六步：受控安装
						</el-button>
						<small v-if="!canControlledInstall(installation)">
							{{ controlledInstallDisabledReason(installation) }}
						</small>
					</li>

					<li
						:data-complete="
							!hasDictionaryContributions(installation) ||
							Boolean(dictionaryPlans[installation.moduleId]) ||
							installation.state === 'enabled'
						"
					>
						<div class="step-index">7</div>
						<div class="step-content">
							<strong>确认产品字典计划</strong>
							<p>只读检查字典类型、稳定值与治理元数据；启用时按该指纹补全。</p>
						</div>
						<el-button
							:loading="dictionaryPlanLoadingModuleId === installation.moduleId"
							:disabled="!canLoadDictionaryPlan(installation)"
							@click="loadDictionaryPlan(installation)"
						>
							第七步：生成字典计划
						</el-button>
						<small v-if="!hasDictionaryContributions(installation)">
							插件未声明产品字典，本步自动完成
						</small>
						<small v-else-if="!hasReachedInstalled(installation.state)">
							请先完成第六步：受控安装
						</small>
						<small v-else-if="dictionaryPlans[installation.moduleId]">
							待补全 {{ dictionaryPlanChangeCount(installation.moduleId) }} 项，冲突
							{{ dictionaryPlans[installation.moduleId]?.conflicts.length || 0 }} 项
						</small>
					</li>

					<li
						:data-complete="
							['enabled', 'disabled', 'uninstalled'].includes(installation.state)
						"
					>
						<div class="step-index">8</div>
						<div class="step-content">
							<strong>启用插件</strong>
							<p>确认字典计划后，物化菜单、权限、字典和运行贡献。</p>
						</div>
						<el-button
							type="success"
							:loading="acting"
							:disabled="!canEnable(installation)"
							@click="runAction('enable', installation)"
						>
							第八步：启用
						</el-button>
						<small v-if="!['installed', 'disabled'].includes(installation.state)">
							仅已安装或已停用插件可以启用
						</small>
						<small
							v-else-if="
								hasDictionaryContributions(installation) &&
								!dictionaryPlans[installation.moduleId]
							"
						>
							请先完成第七步：生成字典计划
						</small>
						<small v-else-if="dictionaryPlans[installation.moduleId]?.conflicts.length">
							字典计划存在冲突，不能启用
						</small>
					</li>

					<li :data-complete="['disabled', 'uninstalled'].includes(installation.state)">
						<div class="step-index">9</div>
						<div class="step-content">
							<strong>停用插件</strong>
							<p>撤销菜单和运行贡献；业务数据保持不变。</p>
						</div>
						<el-button
							:loading="acting"
							:disabled="installation.state !== 'enabled'"
							@click="runAction('disable', installation)"
						>
							第九步：停用
						</el-button>
						<small v-if="installation.state !== 'enabled'">
							仅已启用插件可以停用
						</small>
					</li>

					<li :data-complete="installation.state === 'uninstalled'">
						<div class="step-index">10</div>
						<div class="step-content">
							<strong>卸载并保留数据</strong>
							<p>再次创建可信备份，注销代码贡献；声明的业务表不删除。</p>
						</div>
						<el-button
							type="danger"
							plain
							:loading="uninstallLoadingModuleId === installation.moduleId"
							:disabled="!['installed', 'disabled'].includes(installation.state)"
							@click="controlledUninstall(installation)"
						>
							第十步：备份并卸载
						</el-button>
						<small v-if="installation.state === 'enabled'"
							>请先完成第九步：停用插件</small
						>
						<small v-else-if="!['installed', 'disabled'].includes(installation.state)">
							仅已安装或已停用插件可以卸载
						</small>
					</li>
				</ol>
			</section>

			<p v-if="installation.state === 'uninstalled'" class="retained">
				代码贡献已注销；{{
					installation.manifest.dataOwnership.tables.length
				}}
				张业务表仍保留，卸载关联号（不等于可信备份证明）：{{ installation.lastBackupId }}
			</p>
		</section>

		<el-empty v-if="!loading && !list.length" description="尚未登记 Phoenix 业务插件" />
	</div>
</template>

<script lang="ts" setup>
defineOptions({ name: 'phoenix-business-plugins' });

import { computed, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useCool } from '/@/cool';
import type { PahMigrationDryRunPlan, PahPluginManifest } from '../manifest/PahPluginManifest';
import { pahHasMigrations } from '../manifest/PahPluginPolicy';
import { usePahWorkbenchOutput } from '/@/pah/PahWorkbenchOutput';

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
	dataRetained: boolean;
	lastBackupId?: string;
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

const { service } = useCool();
const workbenchOutput = usePahWorkbenchOutput();
const list = ref<Installation[]>([]);
const loading = ref(false);
const acting = ref(false);
const runtimeCheckLoadingModuleId = ref('');
const planLoadingModuleId = ref('');
const backupLoadingModuleId = ref('');
const installLoadingModuleId = ref('');
const uninstallLoadingModuleId = ref('');
const dictionaryPlanLoadingModuleId = ref('');
const runtimeStatuses = ref<Record<string, LocalRuntimeStatus | undefined>>({});
const migrationPlans = ref<Record<string, PahMigrationDryRunPlan | undefined>>({});
const localBackups = ref<Record<string, LocalBackup | undefined>>({});
const dictionaryPlans = ref<Record<string, DictionaryPlan | undefined>>({});
const packageInput = ref<HTMLInputElement>();
const selectedPackage = ref<File>();
const packageState = ref<'idle' | 'selected' | 'working' | 'success' | 'error'>('idle');
const packageStatusDetail = ref('尚未选择插件包');
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

function runtimeStepComplete(installation: Installation) {
	return (
		hasReachedInstalled(installation.state) ||
		Boolean(runtimeStatuses.value[installation.moduleId]?.ready)
	);
}

function runtimeCheckDisabledReason(installation: Installation) {
	return (
		{
			installed: '当前已安装，API 重启检查已经完成，无需重复执行',
			enabled: '当前已启用，API 重启检查已经完成，无需重复执行',
			disabled: '当前已停用，运行制品已经装配；可直接从第八步重新启用',
			uninstalled: '当前已卸载；请重新选择插件包开始新安装',
			staged: '插件仍在暂存中，尚未完成第二步验证登记',
			migrated: '迁移状态不接受运行时检查，请刷新插件状态',
			rejected: '插件制品已被拒绝，请重新选择有效插件包',
			failed: '插件安装状态失败，请先处理失败原因并重新验证'
		}[installation.state] || '仅“已验证”状态需要执行 API 重启检查'
	);
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
	} catch (error: any) {
		runtimeStatuses.value = {
			...runtimeStatuses.value,
			[installation.moduleId]: undefined
		};
		output(
			`${installation.moduleId} API 运行时检查失败：${error.message || '运行制品尚未加载'}`
		);
		ElMessage.error(error.message || 'API 尚未按新插件制品完成重启');
	} finally {
		runtimeCheckLoadingModuleId.value = '';
	}
}

function canLoadMigrationPlan(installation: Installation) {
	return (
		installation.state === 'verified' &&
		Boolean(runtimeStatuses.value[installation.moduleId]?.ready)
	);
}

function migrationPlanDisabledReason(installation: Installation) {
	if (installation.state === 'verified') {
		return '请先完成第三步：重启 API 并检查运行时';
	}
	return (
		{
			installed: '当前已安装，迁移计划已经执行，无需重复生成',
			enabled: '当前已启用，安装流程已经完成，无需重复生成',
			disabled: '当前已停用；重新启用不重新执行安装迁移',
			uninstalled: '当前已卸载；请重新选择插件包开始新安装',
			staged: '插件仍在暂存中，请先完成第二步验证登记',
			migrated: '迁移已完成，无需重复生成安装计划',
			rejected: '插件制品已被拒绝，不能生成安装计划',
			failed: '插件安装状态失败，不能生成安装计划'
		}[installation.state] || '当前状态不允许生成安装计划'
	);
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
	} catch (error: any) {
		ElMessage.error(error.message || '迁移计划生成失败');
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
			? '新 Node/Vue payload 已装配；必须完成第三步重启 API 并检查运行时'
			: '不可变 payload 未变化；仍须完成第三步检查当前 API 运行时';
		packageStatusDetail.value = `${result.name} ${result.version} · ${result.fileCount} 文件 · SHA-256 ${result.packageSha256.slice(0, 12)}… · ${restartDetail}`;
		output(`${result.moduleId}@${result.version} 校验登记完成；${restartDetail}`);
		ElMessage.success('插件包已校验并登记；请继续页面中的第三步');
		await refresh();
	} catch (error: any) {
		packageState.value = 'error';
		packageStatusDetail.value = error.message || '插件包处理失败';
		output(`处理失败：${packageStatusDetail.value}`);
		ElMessage.error(packageStatusDetail.value);
	} finally {
		acting.value = false;
	}
}

function canCreateBackup(installation: Installation) {
	return (
		installation.state === 'verified' && Boolean(migrationPlans.value[installation.moduleId])
	);
}

function backupDisabledReason(installation: Installation) {
	if (installation.state === 'verified') {
		return '请先完成第四步：生成 dry-run 计划';
	}
	return (
		{
			installed: '当前已安装，安装前可信备份已经完成，无需重复执行',
			enabled: '当前已启用，安装前可信备份已经完成，无需重复执行',
			disabled: '当前已停用；卸载时由第十步重新创建可信备份',
			uninstalled: '当前已卸载；请重新选择插件包开始新安装',
			staged: '插件仍在暂存中，请先完成第二步验证登记',
			migrated: '迁移状态不接受安装前备份，请刷新插件状态',
			rejected: '插件制品已被拒绝，不能创建安装备份',
			failed: '插件安装状态失败，不能创建安装备份'
		}[installation.state] || '当前状态不允许创建安装前备份'
	);
}

function canControlledInstall(installation: Installation) {
	return (
		installation.state === 'verified' &&
		Boolean(migrationPlans.value[installation.moduleId]) &&
		Boolean(localBackups.value[installation.moduleId])
	);
}

function controlledInstallDisabledReason(installation: Installation) {
	if (installation.state === 'verified') {
		return migrationPlans.value[installation.moduleId]
			? '请先完成第五步：备份并验证恢复'
			: '请先完成第四步：生成 dry-run 计划';
	}
	return (
		{
			installed: '当前已安装，无需重复执行受控安装',
			enabled: '当前已启用，受控安装已经完成，无需重复执行',
			disabled: '当前已停用；可直接从第八步重新启用',
			uninstalled: '当前已卸载；请重新选择插件包开始新安装',
			staged: '插件仍在暂存中，请先完成第二步验证登记',
			migrated: '迁移状态不接受重复安装，请刷新插件状态',
			rejected: '插件制品已被拒绝，不能执行受控安装',
			failed: '插件安装状态失败，不能执行受控安装'
		}[installation.state] || '当前状态不允许执行受控安装'
	);
}

function hasReachedInstalled(state: LifecycleState) {
	return ['installed', 'enabled', 'disabled', 'uninstalled'].includes(state);
}

function hasDictionaryContributions(installation: Installation) {
	return Boolean(installation.manifest.dictionaryContributions?.length);
}

function canLoadDictionaryPlan(installation: Installation) {
	return (
		hasDictionaryContributions(installation) &&
		['installed', 'enabled', 'disabled'].includes(installation.state)
	);
}

function dictionaryPlanChangeCount(moduleId: string) {
	const totals = dictionaryPlans.value[moduleId]?.totals;
	if (!totals) return 0;
	return totals.createTypes + totals.updateTypes + totals.createItems + totals.updateItems;
}

function canEnable(installation: Installation) {
	if (!['installed', 'disabled'].includes(installation.state)) return false;
	if (!hasDictionaryContributions(installation)) return true;
	const plan = dictionaryPlans.value[installation.moduleId];
	return Boolean(plan && plan.conflicts.length === 0);
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
	} catch (error: any) {
		output(`${installation.moduleId} 字典 dry-run 失败：${error.message || '未知错误'}`);
		ElMessage.error(error.message || '字典计划生成失败');
	} finally {
		dictionaryPlanLoadingModuleId.value = '';
	}
}

async function createLocalBackup(installation: Installation) {
	backupLoadingModuleId.value = installation.moduleId;
	output(`${installation.moduleId} 开始创建 PostgreSQL 备份并执行恢复演练`);
	try {
		const backup = (await service.request({
			url: '/admin/phoenix/plugin/local-backup',
			method: 'POST',
			data: { moduleId: installation.moduleId },
			timeout: 300000
		})) as LocalBackup;
		localBackups.value = { ...localBackups.value, [installation.moduleId]: backup };
		output(
			`${installation.moduleId} 可信备份已验证：${backup.backupId}，${backup.size} bytes，SHA-256 ${backup.sha256}`
		);
		ElMessage.success('可信备份与临时数据库恢复演练均已通过');
	} catch (error: any) {
		output(`${installation.moduleId} 可信备份失败：${error.message || '未知错误'}`);
		ElMessage.error(error.message || '可信备份失败');
	} finally {
		backupLoadingModuleId.value = '';
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
		})) as { appliedMigrations: number; backupId: string };
		output(
			`${installation.moduleId} 受控安装完成：应用 ${result.appliedMigrations} 条迁移，备份 ${result.backupId}`
		);
		ElMessage.success('受控安装完成；现在可以启用插件');
		await refresh();
	} catch (error: any) {
		output(`${installation.moduleId} 受控安装失败：${error.message || '未知错误'}`);
		ElMessage.error(error.message || '受控安装失败');
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
		await refresh();
	} catch (error: any) {
		ElMessage.error(error.message || '操作失败');
	} finally {
		acting.value = false;
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
		await refresh();
	} catch (error: any) {
		ElMessage.error(error.message || '卸载失败');
	} finally {
		uninstallLoadingModuleId.value = '';
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

.hero,
.section-heading,
.installation-title,
.package-actions {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20px;
}

.package-actions {
	flex-wrap: wrap;
}

.hero h1,
.section-heading h2,
.installation h2 {
	margin: 4px 0 8px;
}

.hero h1 {
	font-size: 30px;
}

.eyebrow {
	margin: 0;
	color: var(--el-text-color-secondary);
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.14em;
}

.summary,
.section-description,
.notice p {
	margin: 0;
	color: var(--el-text-color-regular);
}

.notice,
.registration,
.installation {
	margin-top: 20px;
	border: 1px solid var(--el-border-color-light);
	border-radius: 16px;
	background: color-mix(in srgb, var(--el-bg-color) 92%, transparent);
	box-shadow: var(--el-box-shadow-light);
}

.notice {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 16px 20px;
}

.notice-mark {
	display: grid;
	width: 46px;
	height: 46px;
	border-radius: 13px;
	color: white;
	font-weight: 800;
	place-items: center;
	background: linear-gradient(135deg, #3865ed, #8b5cf6);
}

.notice p {
	margin-top: 4px;
}

.registration,
.installation {
	padding: 22px;
}

.section-description {
	margin: 8px 0 16px;
}

.package-input {
	display: none;
}

.package-status {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding: 14px 16px;
	border: 1px dashed var(--el-border-color);
	border-radius: 10px;
	color: var(--el-text-color-regular);
	background: var(--el-fill-color-light);
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

.state {
	padding: 7px 12px;
	border-radius: 999px;
	color: var(--el-color-primary);
	font-size: 13px;
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

.facts {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 12px;
	margin-top: 20px;
}

.facts div {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 14px;
	border-radius: 12px;
	background: var(--el-fill-color-light);
}

.facts span,
.reuse > span {
	color: var(--el-text-color-secondary);
	font-size: 12px;
}

.reuse {
	display: grid;
	gap: 10px;
	margin-top: 20px;
}

.workflow {
	margin-top: 20px;
	padding: 16px;
	border: 1px solid var(--el-border-color-light);
	border-radius: 12px;
	background: var(--el-bg-color);
}

.workflow-heading {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding-bottom: 12px;
	border-bottom: 1px solid var(--el-border-color-lighter);
}

.workflow-heading span,
.step-content p,
.workflow-steps small,
.step-reason {
	color: var(--el-text-color-secondary);
}

.workflow-steps {
	display: grid;
	gap: 0;
	margin: 0;
	padding: 0;
	list-style: none;
}

.workflow-steps li {
	display: grid;
	grid-template-columns: 32px minmax(0, 1fr) auto;
	align-items: center;
	gap: 12px;
	min-height: 72px;
	padding: 10px 0;
	border-bottom: 1px solid var(--el-border-color-lighter);
}

.workflow-steps li:last-child {
	border-bottom: 0;
}

.workflow-steps small {
	grid-column: 2 / -1;
	margin-top: -8px;
}

.step-index {
	display: grid;
	width: 28px;
	height: 28px;
	border: 1px solid var(--el-border-color);
	border-radius: 50%;
	color: var(--el-text-color-secondary);
	font-weight: 700;
	place-items: center;
	background: var(--el-fill-color-light);
}

.workflow-steps li[data-complete='true'] .step-index {
	border-color: var(--el-color-success-light-5);
	color: var(--el-color-success);
	background: var(--el-color-success-light-9);
}

.step-content {
	display: grid;
	gap: 4px;
}

.step-content p,
.step-reason {
	margin: 0;
	font-size: 13px;
}

.step-reason {
	margin-top: 10px;
}

.migration-governance {
	display: grid;
	gap: 14px;
	margin-top: 20px;
	padding: 16px;
	border: 1px solid var(--el-color-warning-light-5);
	border-radius: 12px;
	background: var(--el-color-warning-light-9);
}

.migration-heading {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 16px;
}

.migration-heading p,
.controlled-release {
	margin: 5px 0 0;
	color: var(--el-text-color-regular);
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

.migration-plan code {
	color: var(--el-text-color-secondary);
	font-size: 12px;
}

.reuse div {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.retained {
	margin: 20px 0 0;
	padding: 12px 14px;
	border-radius: 10px;
	color: var(--el-color-warning);
	background: var(--el-color-warning-light-9);
}

@media (max-width: 800px) {
	.pah-plugin-page {
		padding: 18px;
	}

	.facts {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.migration-heading,
	.migration-plan li {
		display: flex;
		align-items: flex-start;
		flex-direction: column;
	}

	.section-heading,
	.installation-title {
		align-items: flex-start;
		flex-direction: column;
	}

	.workflow-steps li {
		grid-template-columns: 32px minmax(0, 1fr);
	}

	.workflow-steps .el-button,
	.workflow-steps small {
		grid-column: 2;
		justify-self: start;
	}
}
</style>

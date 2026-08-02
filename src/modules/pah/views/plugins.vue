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
					<p class="eyebrow">MANIFEST JSON</p>
					<h2>登记插件清单</h2>
				</div>
				<el-button
					type="primary"
					:disabled="!manifestText.trim()"
					:loading="acting"
					@click="registerManifest"
				>
					校验并登记
				</el-button>
			</div>
			<p class="section-description">
				粘贴业务插件包提供的 manifest。页面只把声明发送给 Host
				校验，不读取入口文件，也不加载插件源码。
			</p>
			<el-input
				v-model="manifestText"
				type="textarea"
				:rows="10"
				resize="vertical"
				spellcheck="false"
				placeholder='例如：{ "formatVersion": 2, "moduleId": "example-plugin", ... }'
			/>
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
					<el-button
						:loading="planLoadingModuleId === installation.moduleId"
						@click="loadMigrationPlan(installation)"
					>
						生成 / 刷新 dry-run 计划
					</el-button>
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

			<div class="actions">
				<el-button
					v-if="
						installation.state === 'verified' &&
						pahCanDirectInstall(installation.manifest)
					"
					type="primary"
					:loading="acting"
					@click="runAction('install', installation)"
				>
					安装
				</el-button>
				<el-button
					v-if="['installed', 'disabled'].includes(installation.state)"
					type="success"
					:loading="acting"
					@click="runAction('enable', installation)"
				>
					启用
				</el-button>
				<el-button
					v-if="installation.state === 'enabled'"
					:loading="acting"
					@click="runAction('disable', installation)"
				>
					停用
				</el-button>
				<el-button
					v-if="['installed', 'disabled'].includes(installation.state)"
					type="danger"
					plain
					:loading="acting"
					@click="uninstall(installation)"
				>
					卸载（保留数据）
				</el-button>
			</div>

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
defineOptions({ name: 'pah-business-plugins' });

import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useCool } from '/@/cool';
import type { PahMigrationDryRunPlan, PahPluginManifest } from '../manifest/PahPluginManifest';
import {
	pahAssertDirectInstallAllowed,
	pahCanDirectInstall,
	pahHasMigrations,
	parsePahPluginManifest
} from '../manifest/PahPluginPolicy';

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

const { service } = useCool();
const list = ref<Installation[]>([]);
const manifestText = ref('');
const loading = ref(false);
const acting = ref(false);
const planLoadingModuleId = ref('');
const migrationPlans = ref<Record<string, PahMigrationDryRunPlan | undefined>>({});

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

function parseManifest(): PahPluginManifest {
	return parsePahPluginManifest(manifestText.value);
}

function formatPlanExpiry(value?: string) {
	if (!value) return '未知';
	return new Date(value).toLocaleString();
}

async function loadMigrationPlan(installation: Installation) {
	planLoadingModuleId.value = installation.moduleId;
	try {
		const plan = (await service.request({
			url: '/admin/pah/plugin/migration-plan',
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
			url: '/admin/pah/plugin/list',
			method: 'POST',
			data: {}
		});
	} catch (error: any) {
		ElMessage.error(error.message || '插件列表加载失败');
	} finally {
		loading.value = false;
	}
}

async function registerManifest() {
	acting.value = true;
	try {
		const manifest = parseManifest();
		await service.request({
			url: '/admin/pah/plugin/register',
			method: 'POST',
			data: { manifest }
		});
		ElMessage.success(`${manifest.name || manifest.moduleId} manifest 验证通过`);
		manifestText.value = '';
		await refresh();
	} catch (error: any) {
		ElMessage.error(error.message || '登记失败');
	} finally {
		acting.value = false;
	}
}

async function runAction(action: 'install' | 'enable' | 'disable', installation: Installation) {
	if (action === 'install') {
		try {
			pahAssertDirectInstallAllowed(installation.manifest);
		} catch (error: any) {
			ElMessage.error(error.message);
			return;
		}
	}
	acting.value = true;
	try {
		await service.request({
			url: `/admin/pah/plugin/${action}`,
			method: 'POST',
			data: { moduleId: installation.moduleId }
		});
		ElMessage.success({ install: '安装完成', enable: '已启用', disable: '已停用' }[action]);
		await refresh();
	} catch (error: any) {
		ElMessage.error(error.message || '操作失败');
	} finally {
		acting.value = false;
	}
}

async function uninstall(installation: Installation) {
	try {
		await ElMessageBox.confirm(
			`仅注销 ${installation.name} 的代码、路由和任务贡献；${installation.manifest.dataOwnership.tables.length} 张业务表将保留。requiresBackup 时应先在受控流程完成可信备份；本页生成的只是卸载关联号。是否继续？`,
			'安全卸载',
			{ type: 'warning', confirmButtonText: '保留数据并卸载' }
		);
	} catch {
		return;
	}

	acting.value = true;
	try {
		const uninstallReference = `pah-uninstall-${installation.moduleId}-${new Date()
			.toISOString()
			.replace(/[:.]/g, '-')}`;
		await service.request({
			url: '/admin/pah/plugin/uninstall',
			method: 'POST',
			data: { moduleId: installation.moduleId, backupId: uninstallReference }
		});
		ElMessage.success('已卸载，业务数据保持不变');
		await refresh();
	} catch (error: any) {
		ElMessage.error(error.message || '卸载失败');
	} finally {
		acting.value = false;
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
.actions {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20px;
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

.actions {
	justify-content: flex-start;
	margin-top: 22px;
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
}
</style>

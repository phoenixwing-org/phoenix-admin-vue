<template>
	<pnw-primary-panel title="插件" aria-label="插件管理入口">
		<pnw-primary-section title="插件管理" :default-expanded="true">
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

				<button
					type="button"
					class="plugin-kind"
					:class="{ active: active === 'groups' }"
					:aria-current="active === 'groups' ? 'page' : undefined"
					@click="open('/phoenix/navigation')"
				>
					<strong>分组</strong>
					<span>导航分组与模块归属</span>
				</button>
			</nav>
		</pnw-primary-section>

		<pnw-primary-section v-if="active !== 'groups'" title="插件属性" :default-expanded="true">
			<template v-if="details" #suffix>
				<span class="section-version">v{{ details.version }}</span>
			</template>

			<div v-if="details" class="plugin-details">
				<header class="details-identity">
					<img src="/pah-phoenixwing-mark.svg" alt="" />
					<div>
						<strong>{{ details.name }}</strong>
						<span :title="details.moduleId">{{ details.moduleId }}</span>
					</div>
					<span class="details-state" :data-state="details.state">
						{{ details.stateLabel }}
					</span>
				</header>

				<dl class="details-properties">
					<div>
						<dt>发布方</dt>
						<dd>{{ details.publisher }}</dd>
					</div>
					<div>
						<dt>最近更新</dt>
						<dd>{{ details.updatedAt }}</dd>
					</div>
					<div>
						<dt>激活方式</dt>
						<dd>{{ details.activationMode }}</dd>
					</div>
					<div>
						<dt>卸载数据</dt>
						<dd>{{ details.dataPolicy }}</dd>
					</div>
				</dl>

				<div class="details-metrics" aria-label="插件贡献概况">
					<div>
						<strong>{{ details.navigationModules }}</strong>
						<span>导航</span>
					</div>
					<div>
						<strong>{{ details.migrations }}</strong>
						<span>迁移</span>
					</div>
					<div>
						<strong>{{ details.tables }}</strong>
						<span>业务表</span>
					</div>
				</div>

				<div class="details-reuse" aria-label="Host 复用能力">
					<span v-for="item in details.hostReuse" :key="item">{{ item }}</span>
				</div>
			</div>

			<p v-else class="details-empty">
				{{
					active === 'phoenix'
						? '选择右侧插件卡片，查看版本、状态与 Host 复用信息。'
						: 'Cool 与 Phoenix 使用独立安装契约；切换后可查看 Phoenix 受控安装属性。'
				}}
			</p>
		</pnw-primary-section>
	</pnw-primary-panel>
</template>

<script lang="ts" setup>
import { PnwPrimaryPanel, PnwPrimarySection } from 'phoenix-wing';
import { useCool } from '/@/cool';

defineOptions({ name: 'pah-plugin-management-primary' });

interface PluginPrimaryDetails {
	name: string;
	moduleId: string;
	version: string;
	state: string;
	stateLabel: string;
	publisher: string;
	updatedAt: string;
	activationMode: string;
	dataPolicy: string;
	navigationModules: number;
	migrations: number;
	tables: number;
	hostReuse: string[];
}

defineProps<{
	active: 'cool' | 'phoenix' | 'groups';
	details?: PluginPrimaryDetails | null;
}>();

const { router } = useCool();

function open(path: '/helper/plugins' | '/phoenix/plugins' | '/phoenix/navigation') {
	void router.push(path);
}
</script>

<style scoped>
.section-version {
	color: var(--pnw-workbench-muted, var(--el-text-color-secondary));
	font-size: 11px;
}

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

.plugin-details {
	display: grid;
	gap: 10px;
	padding: 12px;
}

.details-identity {
	display: grid;
	grid-template-columns: 40px minmax(0, 1fr) auto;
	align-items: center;
	gap: 9px;
}

.details-identity img {
	display: block;
	width: 40px;
	height: 40px;
	object-fit: contain;
}

.details-identity > div {
	display: grid;
	min-width: 0;
	gap: 2px;
}

.details-identity strong {
	overflow: hidden;
	color: var(--pnw-workbench-text, var(--el-text-color-primary));
	font-size: 13px;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.details-identity div span {
	overflow: hidden;
	color: var(--pnw-workbench-muted, var(--el-text-color-secondary));
	font-size: 11px;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.details-state {
	padding: 3px 7px;
	border-radius: 999px;
	color: var(--el-color-primary);
	font-size: 11px;
	font-weight: 700;
	white-space: nowrap;
	background: var(--el-color-primary-light-9);
}

.details-state[data-state='enabled'] {
	color: var(--el-color-success);
	background: var(--el-color-success-light-9);
}

.details-state[data-state='disabled'],
.details-state[data-state='uninstalled'] {
	color: var(--el-color-warning);
	background: var(--el-color-warning-light-9);
}

.details-state[data-state='failed'],
.details-state[data-state='rejected'] {
	color: var(--el-color-danger);
	background: var(--el-color-danger-light-9);
}

.details-properties {
	display: grid;
	gap: 1px;
	margin: 0;
	background: var(--pnw-workbench-border, var(--el-border-color-lighter));
}

.details-properties > div {
	display: grid;
	grid-template-columns: 64px minmax(0, 1fr);
	gap: 8px;
	padding: 7px 9px;
	background: var(--pnw-workbench-surface, var(--el-bg-color));
}

.details-properties dt,
.details-properties dd {
	min-width: 0;
	margin: 0;
	font-size: 12px;
	line-height: 1.45;
}

.details-properties dt {
	color: var(--pnw-workbench-muted, var(--el-text-color-secondary));
	font-weight: 600;
	white-space: nowrap;
}

.details-properties dd {
	overflow-wrap: anywhere;
	color: var(--pnw-workbench-text, var(--el-text-color-primary));
}

.details-metrics {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 6px;
}

.details-metrics > div {
	display: grid;
	gap: 2px;
	padding: 8px;
	border: 1px solid var(--pnw-workbench-border, var(--el-border-color-lighter));
	border-radius: 7px;
	text-align: center;
	background: var(--pnw-control-default-bg, var(--el-fill-color-light));
}

.details-metrics strong {
	color: var(--pnw-workbench-text, var(--el-text-color-primary));
	font-size: 16px;
}

.details-metrics span {
	color: var(--pnw-workbench-muted, var(--el-text-color-secondary));
	font-size: 11px;
}

.details-reuse {
	display: flex;
	flex-wrap: wrap;
	gap: 5px;
}

.details-reuse span {
	padding: 2px 6px;
	border: 1px solid var(--el-color-primary-light-5);
	border-radius: 999px;
	color: var(--el-color-primary);
	font-size: 11px;
	line-height: 1.35;
}

.details-empty {
	margin: 0;
	padding: 14px 12px;
	color: var(--pnw-workbench-muted, var(--el-text-color-secondary));
	font-size: 12px;
	text-align: center;
}
</style>

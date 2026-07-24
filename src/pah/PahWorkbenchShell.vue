<template>
	<section class="pah-workbench-shell">
		<header class="pah-host-header">
			<button type="button" class="pah-brand" title="Phoenix Admin Host 首页" @click="goHome">
				<img src="/pah-phoenixwing-mark.svg" alt="" />
				<span class="pah-brand-copy">
					<strong>Phoenix Admin</strong>
					<small>{{ activeRibbonTabLabel || 'Host 工作台' }}</small>
				</span>
			</button>

			<div v-if="navigationStyle === 'ribbon'" class="pah-header-tabs">
				<PnwRibbonTabBar v-model:active-tab="activeRibbonTab" :tabs="ribbonTabOptions" />
			</div>
			<div v-else class="pah-header-context">
				<span>工作区</span>
				<strong>{{ activeRibbonTabLabel || '未选择分组' }}</strong>
			</div>

			<div class="pah-workbench-topbar">
				<slot name="topbar" />
			</div>

			<el-popover placement="bottom-end" :width="280" trigger="click">
				<template #reference>
					<button
						type="button"
						class="pah-settings-button"
						:title="`宿主设置 · ${navigationStyleLabel}`"
					>
						<el-icon><Setting /></el-icon>
					</button>
				</template>
				<div class="pah-settings-panel">
					<strong>宿主导航样式</strong>
					<p>两种样式共享当前账号的菜单和资源权限。</p>
					<button
						type="button"
						:class="{ active: navigationStyle === 'ribbon' }"
						:aria-pressed="navigationStyle === 'ribbon'"
						@click="setNavigationStyle('ribbon')"
					>
						<el-icon><Grid /></el-icon>
						<span><b>Ribbon 工作台</b><small>顶部大分组与工具带</small></span>
					</button>
					<button
						type="button"
						:class="{ active: navigationStyle === 'grouped-sidebar' }"
						:aria-pressed="navigationStyle === 'grouped-sidebar'"
						@click="setNavigationStyle('grouped-sidebar')"
					>
						<el-icon><Collection /></el-icon>
						<span><b>大分组侧栏</b><small>分组树、模块与功能</small></span>
					</button>

					<div class="pah-settings-layout">
						<strong>区域显示</strong>
						<label><input v-model="primaryOpen" type="checkbox" /> Primary</label>
						<label><input v-model="propertiesOpen" type="checkbox" /> Properties</label>
						<label><input v-model="logOpen" type="checkbox" /> Log</label>
						<label>
							<input
								type="checkbox"
								:checked="ribbonLayout === 'inline'"
								@change="toggleRibbonLayout"
							/>
							紧凑 Ribbon
						</label>
					</div>
					<button type="button" class="pah-settings-reset" @click="resetHostPreferences">
						恢复宿主默认布局
					</button>
				</div>
			</el-popover>
		</header>

		<PnwRibbonShell v-if="navigationStyle === 'ribbon'" v-model:layout="ribbonLayout">
			<div v-for="group in activeRibbonGroups" :key="group.id" class="pah-ribbon-group">
				<PnwRibbonGroup
					:label="group.label"
					:items="ribbonGroupItems(group)"
					:layout="ribbonLayout"
					@open="openRibbonPage"
				/>
				<span class="pah-ribbon-group-label">{{ group.label }}</span>
			</div>
		</PnwRibbonShell>

		<div class="pah-workbench-body">
			<aside
				v-if="navigationStyle === 'grouped-sidebar'"
				class="pah-grouped-sidebar"
				aria-label="Phoenix 大分组导航"
			>
				<div class="pah-group-pages">
					<div class="pah-group-pages__title">
						<div>
							<small>PHOENIX WORKSPACE</small>
							<strong>分组导航</strong>
						</div>
						<button type="button" @click="expandAllNavigation">全部展开</button>
					</div>
					<div class="pah-navigation-tree" role="tree" aria-label="Phoenix 分组模块导航">
						<section
							v-for="moduleGroup in moduleGroups"
							:key="moduleGroup.id"
							class="pah-navigation-tree__root"
							role="treeitem"
							:aria-expanded="groupedNavigation.isExpanded(moduleGroup.id)"
						>
							<button
								type="button"
								class="pah-navigation-tree__root-toggle"
								:class="{ active: moduleGroup.id === activeRibbonTab }"
								@click="groupedNavigation.toggle(moduleGroup.id)"
							>
								<el-icon
									:class="{ open: groupedNavigation.isExpanded(moduleGroup.id) }"
								>
									<ArrowRightBold />
								</el-icon>
								<strong>{{ moduleGroup.label }}</strong>
								<small>{{ moduleGroup.modules.length }}</small>
							</button>
							<div
								v-show="groupedNavigation.isExpanded(moduleGroup.id)"
								class="pah-navigation-tree__root-children"
								role="group"
							>
								<section
									v-for="module in moduleGroup.modules"
									:key="module.id"
									class="pah-navigation-tree__module"
									role="treeitem"
									:aria-expanded="groupedNavigation.isExpanded(module.id)"
								>
									<button
										type="button"
										class="pah-navigation-tree__module-toggle"
										:class="{ active: module.id === activeModuleId }"
										@click="groupedNavigation.toggle(module.id)"
									>
										<el-icon
											:class="{
												open: groupedNavigation.isExpanded(module.id)
											}"
										>
											<ArrowRightBold />
										</el-icon>
										<strong>{{ module.label }}</strong>
										<small>{{ moduleItems(module).length }}</small>
									</button>
									<div
										v-show="groupedNavigation.isExpanded(module.id)"
										class="pah-navigation-tree__children"
										role="group"
									>
										<button
											v-for="item in moduleItems(module)"
											:key="item.pageId"
											type="button"
											role="treeitem"
											:class="{ active: route.path === item.path }"
											@click="openRibbonPage(item.pageId)"
										>
											<span class="pah-tree-joint" aria-hidden="true"></span>
											<span>{{ item.label }}</span>
										</button>
									</div>
								</section>
							</div>
						</section>
					</div>
				</div>
			</aside>

			<aside v-else-if="primaryOpen" class="pah-side-panel pah-primary" aria-label="Primary">
				<h3>Primary · 大分组</h3>
				<button
					v-for="moduleGroup in moduleGroups"
					:key="moduleGroup.id"
					type="button"
					:class="{ active: moduleGroup.id === activeRibbonTab }"
					@click="activeRibbonTab = moduleGroup.id"
				>
					{{ moduleGroup.label }}
				</button>
			</aside>

			<main class="pah-workbench-main">
				<PnwWorkbenchTabBar
					:tabs="workbenchTabs"
					:active-tab-id="activeProcessTabId"
					:can-close-all="workbenchTabs.length > 0"
					@select="selectProcessTab"
					@close="closeProcessTab"
					@close-all="closeAllProcessTabs"
				/>
				<div class="pah-workbench-view">
					<slot />
				</div>
			</main>

			<aside
				v-if="propertiesOpen"
				class="pah-side-panel pah-properties"
				aria-label="Properties"
			>
				<h3>Properties</h3>
				<dl>
					<dt>页面</dt>
					<dd>{{ currentTitle }}</dd>
					<dt>路径</dt>
					<dd>{{ route.fullPath }}</dd>
					<dt>壳模式</dt>
					<dd>{{ configuredMode }}</dd>
					<dt>导航样式</dt>
					<dd>{{ navigationStyleLabel }}</dd>
				</dl>
			</aside>
		</div>

		<div v-if="logOpen" class="pah-log-panel">
			<PnwShellLogPanel
				:log-text="logText"
				source-label="Phoenix Admin Host"
				@clear="logLines = []"
				@close="logOpen = false"
			/>
		</div>

		<footer class="pah-workbench-footer">
			<div class="pah-footer-context">
				<span>Phoenix Admin Host · {{ navigationStyleLabel }} · {{ configuredMode }}</span>
				<nav v-if="footerBreadcrumb.length" aria-label="当前路径">
					<template v-for="(item, index) in footerBreadcrumb" :key="item.id">
						<b v-if="index > 0" aria-hidden="true">/</b>
						<span>{{ item.label }}</span>
					</template>
				</nav>
			</div>
			<div>
				<button type="button" @click="primaryOpen = !primaryOpen">Primary</button>
				<button type="button" @click="propertiesOpen = !propertiesOpen">Properties</button>
				<button type="button" @click="logOpen = !logOpen">Log</button>
			</div>
		</footer>
	</section>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'PahWorkbenchShell'
});

import { computed, ref, watch } from 'vue';
import { ArrowRightBold, Collection, Grid, Setting } from '@element-plus/icons-vue';
import PnwRibbonGroup from 'phoenix-wing/layout/PnwRibbonGroup.vue';
import PnwRibbonShell from 'phoenix-wing/layout/PnwRibbonShell.vue';
import PnwRibbonTabBar from 'phoenix-wing/layout/PnwRibbonTabBar.vue';
import PnwShellLogPanel from 'phoenix-wing/layout/PnwShellLogPanel.vue';
import PnwWorkbenchTabBar from 'phoenix-wing/layout/PnwWorkbenchTabBar.vue';
import { useBase } from '/$/base';
import { useCool } from '/@/cool';
import { storage } from '/@/cool/utils';
import {
	pahBuildRibbonTabs,
	pahFindMenuTrail,
	type PahRibbonGroup,
	type PahRibbonItem,
	type PahRibbonTab
} from './PahRibbonMenuAdapter';
import { pahBuildModuleGroups } from './PahModuleGroupAdapter';
import type { PahShellMode } from './PahShellMode';
import {
	PAH_NAVIGATION_STYLE_KEY,
	pahNavigationStyleLabel,
	pahNormalizeNavigationStyle,
	type PahNavigationStyle
} from './PahNavigationStyle';
import {
	PAH_DEFAULT_WORKBENCH_PREFERENCES,
	PAH_WORKBENCH_PREFERENCES_KEY,
	pahNormalizeWorkbenchPreferences,
	type PahRibbonLayout
} from './PahWorkbenchPreferences';
import { usePahGroupedNavigationStore } from './PahGroupedNavigationStore';

const props = defineProps<{
	configuredMode: PahShellMode;
}>();

const { menu, process } = useBase();
const { route, router } = useCool();
const groupedNavigation = usePahGroupedNavigationStore();
const ribbonTabs = computed(() => pahBuildRibbonTabs(menu.group));
const moduleGroups = computed(() => pahBuildModuleGroups(ribbonTabs.value));
const activeRibbonTab = ref('');
const initialWorkbenchPreferences = pahNormalizeWorkbenchPreferences(
	storage.get(PAH_WORKBENCH_PREFERENCES_KEY)
);
const ribbonLayout = ref<PahRibbonLayout>(initialWorkbenchPreferences.ribbonLayout);
const primaryOpen = ref(initialWorkbenchPreferences.primaryOpen);
const propertiesOpen = ref(initialWorkbenchPreferences.propertiesOpen);
const logOpen = ref(initialWorkbenchPreferences.logOpen);
const logLines = ref<string[]>([]);
const navigationStyle = ref(
	pahNormalizeNavigationStyle(
		storage.get(PAH_NAVIGATION_STYLE_KEY) || import.meta.env.VITE_PAH_NAVIGATION_STYLE
	)
);

const configuredMode = computed(() => props.configuredMode);
const ribbonTabOptions = computed(() =>
	moduleGroups.value.map(group => ({ id: group.id, label: group.label }))
);
const activeRibbonGroups = computed(() =>
	(moduleGroups.value.find(group => group.id === activeRibbonTab.value)?.modules || []).flatMap(
		module =>
			module.groups.map(group => ({
				...group,
				id: `${module.id}-${group.id}`,
				label: `${module.label} · ${group.label}`
			}))
	)
);
const activeRibbonTabLabel = computed(
	() => moduleGroups.value.find(group => group.id === activeRibbonTab.value)?.label || ''
);
const activeModuleId = computed(
	() =>
		ribbonTabs.value.find(module =>
			module.groups.some(group => group.items.some(item => item.path === route.path))
		)?.id || ''
);
const navigationStyleLabel = computed(() => pahNavigationStyleLabel(navigationStyle.value));
const footerBreadcrumb = computed(() => pahFindMenuTrail(menu.group, route.path));
const workbenchTabs = computed(() =>
	process.list.map(item => ({
		id: item.path,
		pageId: item.path,
		title: item.meta?.label || item.name || item.path,
		dirty: false,
		subtitle: item.fullPath
	}))
);
const activeProcessTabId = computed(() => process.list.find(item => item.active)?.path || '');
const currentTitle = computed(
	() =>
		process.list.find(item => item.active)?.meta?.label ||
		String(route.meta?.label || route.name || 'Phoenix Admin')
);
const logText = computed(() => logLines.value.join('\n'));

function record(message: string) {
	logLines.value = [...logLines.value.slice(-49), message];
}

function goHome() {
	void router.push('/');
}

function setNavigationStyle(style: PahNavigationStyle) {
	navigationStyle.value = style;
	storage.set(PAH_NAVIGATION_STYLE_KEY, style);
	record(`切换宿主导航：${pahNavigationStyleLabel(style)}`);
}

function allNavigationNodeIds() {
	return moduleGroups.value.flatMap(group => [
		group.id,
		...group.modules.map(module => module.id)
	]);
}

function expandAllNavigation() {
	groupedNavigation.expandAll(allNavigationNodeIds());
}

function persistWorkbenchPreferences() {
	storage.set(PAH_WORKBENCH_PREFERENCES_KEY, {
		version: 1,
		ribbonLayout: ribbonLayout.value,
		primaryOpen: primaryOpen.value,
		propertiesOpen: propertiesOpen.value,
		logOpen: logOpen.value
	});
}

function toggleRibbonLayout(event: Event) {
	ribbonLayout.value = (event.target as HTMLInputElement).checked ? 'inline' : 'stacked';
}

function resetHostPreferences() {
	const defaults = PAH_DEFAULT_WORKBENCH_PREFERENCES;
	ribbonLayout.value = defaults.ribbonLayout;
	primaryOpen.value = defaults.primaryOpen;
	propertiesOpen.value = defaults.propertiesOpen;
	logOpen.value = defaults.logOpen;
	groupedNavigation.expandAll(allNavigationNodeIds());
	setNavigationStyle(pahNormalizeNavigationStyle(import.meta.env.VITE_PAH_NAVIGATION_STYLE));
	record('恢复宿主默认布局');
}

function findRibbonItem(pageId: string): PahRibbonItem | undefined {
	return ribbonTabs.value
		.flatMap(tab => tab.groups)
		.flatMap(group => group.items)
		.find(item => item.pageId === pageId);
}

function moduleItems(module: PahRibbonTab): PahRibbonItem[] {
	return module.groups.flatMap(group => group.items);
}

function ribbonGroupItems(group: PahRibbonGroup) {
	return group.items.map(item => ({
		pageId: item.pageId,
		label: item.label,
		icon: Grid,
		active: route.path === item.path,
		disabled: false,
		title: item.label
	}));
}

function openRibbonPage(pageId: string) {
	const item = findRibbonItem(pageId);
	if (!item) return;
	record(`打开 ${item.label} · ${item.path}`);
	void router.push(item.path);
}

function selectProcessTab(tabId: string) {
	const item = process.list.find(entry => entry.path === tabId);
	if (item) void router.push(item.fullPath);
}

function closeProcessTab(tabId: string) {
	const index = process.list.findIndex(entry => entry.path === tabId);
	if (index < 0) return;
	const wasActive = process.list[index].active;
	const title = process.list[index].meta?.label || process.list[index].path;
	process.remove(index);
	record(`关闭 ${title}`);

	if (wasActive) {
		const next = process.list[Math.max(0, index - 1)] || process.list[0];
		void router.push(next?.fullPath || '/');
	}
}

function closeAllProcessTabs() {
	process.clear();
	record('关闭全部工作台页签');
	void router.push('/');
}

watch(
	moduleGroups,
	groups => {
		groupedNavigation.ensureGroups(allNavigationNodeIds());
		if (!groups.some(group => group.id === activeRibbonTab.value)) {
			activeRibbonTab.value = groups[0]?.id || '';
		}
	},
	{ immediate: true }
);

watch(
	() => route.fullPath,
	path => {
		const routeGroup = moduleGroups.value.find(group =>
			group.modules.some(module =>
				module.groups.some(ribbonGroup =>
					ribbonGroup.items.some(item => item.path === route.path)
				)
			)
		);
		if (routeGroup) activeRibbonTab.value = routeGroup.id;
		record(`导航 ${path}`);
	},
	{ immediate: true }
);

watch([ribbonLayout, primaryOpen, propertiesOpen, logOpen], persistWorkbenchPreferences);
</script>

<style lang="scss" scoped>
.pah-workbench-shell {
	--border: var(--el-border-color, #e2e8f0);
	--border-strong: var(--el-border-color-dark, #cbd5e1);
	--text: var(--el-text-color-primary, #0f172a);
	--muted: var(--el-text-color-secondary, #64748b);
	--page-bg: var(--el-bg-color, #fff);
	--shell-bg: var(--el-fill-color-light, #f1f5f9);
	--ribbon-group-divider: var(--el-border-color-light, #e2e8f0);
	--ribbon-btn-hover: var(--el-fill-color, #f5f7fa);
	display: flex;
	flex-direction: column;
	height: 100%;
	width: 100%;
	overflow: hidden;
	background: var(--shell-bg);
}

.pah-host-header {
	display: flex;
	flex: 0 0 46px;
	align-items: stretch;
	min-width: 0;
	padding: 0 8px;
	background: linear-gradient(180deg, var(--page-bg) 0%, var(--shell-bg) 100%);
	border-bottom: 1px solid var(--border-strong);
	box-shadow: 0 1px 3px rgb(15 23 42 / 8%);
}

.pah-brand {
	display: flex;
	flex: 0 0 auto;
	align-items: center;
	gap: 9px;
	max-width: 220px;
	padding: 4px 12px 4px 4px;
	border: 0;
	background: transparent;
	color: var(--text);
	text-align: left;
	cursor: pointer;

	img {
		width: 34px;
		height: 34px;
		filter: drop-shadow(0 3px 5px rgb(255 91 33 / 24%));
		transition: transform 180ms ease;
	}

	&:hover img {
		transform: translateY(-1px) scale(1.04);
	}
}

.pah-brand-copy {
	display: flex;
	flex-direction: column;
	min-width: 0;
	line-height: 1.15;

	strong {
		font-size: 13px;
		letter-spacing: 0.01em;
		white-space: nowrap;
	}

	small {
		overflow: hidden;
		margin-top: 2px;
		color: var(--muted);
		font-size: 10px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
}

.pah-header-tabs {
	display: flex;
	flex: 0 1 auto;
	align-items: center;
	min-width: 120px;
	max-width: 42vw;
	padding: 6px 8px;
	border-left: 1px solid var(--border);
	border-right: 1px solid var(--border);

	:deep(.pnw-ribbon-tab-bar) {
		width: 100%;
	}
}

.pah-header-context {
	display: flex;
	flex: 0 1 180px;
	flex-direction: column;
	justify-content: center;
	min-width: 100px;
	padding: 0 14px;
	border-left: 1px solid var(--border);
	border-right: 1px solid var(--border);

	span {
		color: var(--muted);
		font-size: 9px;
		letter-spacing: 0.08em;
	}

	strong {
		overflow: hidden;
		font-size: 12px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
}

.pah-workbench-topbar {
	flex: 1;
	min-width: 0;
	overflow: hidden;

	:deep(.app-topbar) {
		height: 45px;
		padding: 0 6px;
		border: 0;
		background: transparent;
	}

	:deep(.app-topbar > .cl-comm__icon) {
		display: none;
	}

	:deep(.route-nav),
	:deep(.a-menu) {
		display: none;
	}
}

.pah-settings-button {
	display: grid;
	place-items: center;
	align-self: center;
	width: 34px;
	height: 34px;
	margin-left: 4px;
	border: 1px solid transparent;
	border-radius: 8px;
	background: transparent;
	color: var(--muted);
	cursor: pointer;

	&:hover,
	&:focus-visible {
		border-color: var(--border);
		background: var(--page-bg);
		color: var(--el-color-primary);
	}
}

:global(.pah-settings-panel) {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

:global(.pah-settings-panel > strong) {
	font-size: 13px;
}

:global(.pah-settings-panel > p) {
	margin: -2px 0 4px;
	color: var(--el-text-color-secondary);
	font-size: 11px;
}

:global(.pah-settings-panel > button) {
	display: flex;
	align-items: center;
	gap: 10px;
	width: 100%;
	padding: 10px;
	border: 1px solid var(--el-border-color);
	border-radius: 8px;
	background: var(--el-bg-color);
	color: var(--el-text-color-primary);
	text-align: left;
	cursor: pointer;
}

:global(.pah-settings-panel > button.active) {
	border-color: var(--el-color-primary);
	background: var(--el-color-primary-light-9);
	color: var(--el-color-primary);
}

:global(.pah-settings-panel > button span) {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

:global(.pah-settings-panel > button small) {
	color: var(--el-text-color-secondary);
}

:global(.pah-settings-layout) {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 8px;
	margin-top: 4px;
	padding-top: 12px;
	border-top: 1px solid var(--el-border-color-lighter);
}

:global(.pah-settings-layout > strong) {
	grid-column: 1 / -1;
	font-size: 11px;
}

:global(.pah-settings-layout label) {
	display: flex;
	align-items: center;
	gap: 6px;
	color: var(--el-text-color-regular);
	font-size: 11px;
	cursor: pointer;
}

:global(.pah-settings-layout input) {
	accent-color: var(--el-color-primary);
}

:global(.pah-settings-panel > button.pah-settings-reset) {
	justify-content: center;
	padding: 7px;
	border-style: dashed;
	color: var(--el-text-color-secondary);
	font-size: 11px;
	text-align: center;
}

.pah-ribbon-group {
	display: flex;
	flex: 0 0 auto;
	flex-direction: column;
	min-width: 0;
	border-right: 1px solid var(--ribbon-group-divider);

	:deep(.pnw-ribbon-group) {
		flex: 1;
		border-right: 0;
	}
}

.pah-ribbon-group-label {
	padding: 1px 8px 3px;
	overflow: hidden;
	color: var(--muted);
	font-size: 10px;
	line-height: 14px;
	text-align: center;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.pah-workbench-body {
	display: flex;
	flex: 1;
	min-height: 0;
	overflow: hidden;
}

.pah-grouped-sidebar {
	display: block;
	flex: 0 0 270px;
	min-width: 0;
	background: var(--page-bg);
	border-right: 1px solid var(--border-strong);
}

.pah-group-pages {
	flex: 1;
	min-width: 0;
	padding: 12px 10px;
	overflow-y: auto;

	&__title {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 8px;
		padding: 0 4px 12px;
		border-bottom: 1px solid var(--border);

		div {
			display: flex;
			flex-direction: column;
			gap: 2px;
			min-width: 0;
		}

		small {
			color: var(--muted);
			font-size: 9px;
			letter-spacing: 0.1em;
		}

		strong {
			overflow: hidden;
			font-size: 16px;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		button {
			flex: 0 0 auto;
			padding: 3px 5px;
			border: 0;
			background: transparent;
			color: var(--el-color-primary);
			font-size: 10px;
			cursor: pointer;
		}
	}
}

.pah-navigation-tree {
	padding-top: 8px;
}

.pah-navigation-tree__root {
	padding: 3px 0;
}

.pah-navigation-tree__root-toggle {
	display: flex;
	align-items: center;
	gap: 7px;
	width: 100%;
	padding: 9px 7px;
	border: 0;
	border-radius: 7px;
	background: transparent;
	color: var(--text);
	font-size: 13px;
	text-align: left;
	cursor: pointer;

	.el-icon {
		flex: 0 0 auto;
		color: var(--muted);
		font-size: 11px;
		transition: transform 140ms ease;

		&.open {
			transform: rotate(90deg);
		}
	}

	strong {
		flex: 1;
		font-weight: 700;
	}

	small {
		color: var(--muted);
		font-size: 9px;
	}

	&.active,
	&:hover {
		background: var(--el-color-primary-light-9);
		color: var(--el-color-primary);
	}
}

.pah-navigation-tree__root-children {
	margin-left: 12px;
	padding-left: 9px;
	border-left: 1px solid var(--border-strong);
}

.pah-navigation-tree__module {
	padding: 3px 0;
}

.pah-navigation-tree__module-toggle {
	display: flex;
	align-items: center;
	gap: 6px;
	width: 100%;
	padding: 7px 6px;
	border: 0;
	border-radius: 6px;
	background: transparent;
	color: var(--text);
	font-size: 11px;
	text-align: left;
	cursor: pointer;

	.el-icon {
		flex: 0 0 auto;
		color: var(--muted);
		font-size: 10px;
		transition: transform 140ms ease;

		&.open {
			transform: rotate(90deg);
		}
	}

	strong {
		flex: 1;
		overflow: hidden;
		font-weight: 650;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	small {
		color: var(--muted);
		font-size: 9px;
	}

	&.active,
	&:hover {
		background: var(--el-fill-color-light);
		color: var(--el-color-primary);
	}
}

.pah-navigation-tree__children {
	position: relative;
	margin-left: 11px;
	padding-left: 12px;
	border-left: 1px solid var(--border);

	button {
		position: relative;
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		margin: 2px 0;
		padding: 8px 7px;
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: var(--text);
		font-size: 12px;
		text-align: left;
		cursor: pointer;

		&.active,
		&:hover {
			background: var(--el-color-primary-light-9);
			color: var(--el-color-primary);
		}
	}
}

.pah-tree-joint {
	position: absolute;
	left: -12px;
	width: 9px;
	height: 1px;
	background: var(--border);
}

.pah-workbench-main {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
	min-height: 0;
}

.pah-workbench-view {
	display: flex;
	flex: 1;
	min-height: 0;
	overflow: hidden;
}

.pah-workbench-view :deep(.app-views) {
	margin-top: 10px;
}

.pah-side-panel {
	flex: 0 0 220px;
	padding: 12px;
	overflow: auto;
	background: var(--page-bg);
	border-color: var(--border);
	border-style: solid;
	border-width: 0;

	h3 {
		margin: 0 0 12px;
		font-size: 13px;
	}
}

.pah-primary {
	border-right-width: 1px;

	button {
		display: block;
		width: 100%;
		margin-bottom: 4px;
		padding: 7px 8px;
		border: 0;
		border-radius: 4px;
		background: transparent;
		color: var(--muted);
		text-align: left;
		cursor: pointer;

		&.active,
		&:hover {
			background: var(--ribbon-btn-hover);
			color: var(--text);
		}
	}
}

.pah-properties {
	border-left-width: 1px;

	dl {
		margin: 0;
	}

	dt {
		margin-top: 10px;
		color: var(--muted);
		font-size: 11px;
	}

	dd {
		margin: 3px 0 0;
		font-size: 12px;
		word-break: break-all;
	}
}

.pah-log-panel {
	height: 150px;
	min-height: 0;
	background: var(--page-bg);
}

.pah-log-panel :deep(.pnw-log-panel) {
	height: 100%;
}

.pah-workbench-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 28px;
	padding: 0 10px;
	border-top: 1px solid var(--border);
	background: var(--page-bg);
	color: var(--muted);
	font-size: 11px;

	.pah-footer-context {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
		overflow: hidden;

		> span {
			flex: 0 0 auto;
		}

		nav {
			display: flex;
			align-items: center;
			gap: 5px;
			min-width: 0;
			overflow: hidden;
			padding-left: 12px;
			border-left: 1px solid var(--border);
			color: var(--text);
		}

		nav span {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		nav b {
			color: var(--muted);
			font-weight: 400;
		}
	}

	button {
		margin-left: 4px;
		padding: 2px 7px;
		border: 1px solid var(--border);
		border-radius: 4px;
		background: transparent;
		color: inherit;
		cursor: pointer;
	}
}

@media only screen and (max-width: 900px) {
	.pah-brand-copy,
	.pah-header-context,
	.pah-header-tabs {
		display: none;
	}

	.pah-side-panel {
		display: none;
	}

	.pah-grouped-sidebar {
		flex-basis: 230px;
	}
}
</style>

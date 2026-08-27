<template>
	<section class="pah-workbench-shell">
		<PnwWorkbenchShellLayout
			:nodes="navigationNodes"
			:active-node-id="activeNavigationNodeId"
			:expanded-node-ids="expandedNavigationNodeIds"
			:presentation="displayPreferences.presentation"
			:ribbon-appearance="displayPreferences.ribbonAppearance"
			:tree-collapsed="displayPreferences.treeCollapsed"
			:tree-appearance="displayPreferences.treeAppearance"
			:tab-bar-placement="displayPreferences.tabBarPlacement"
			:color-scheme="workbenchColorScheme"
			:layout-state="displayPreferences.layoutState"
			:visibility="displayPreferences.layoutState.visibility"
			:display-settings-positions="displayPreferences.settingsPositions"
			:view-blocks="activeViewBlocks"
			:default-bottom-block="workbenchBottomBlock"
			:active-bottom-tab-id="activeBottomTabId"
			:tabs="workbenchTabs"
			:active-tab-id="activeProcessTabId"
			:page-icon="workbenchPageIcon"
			:editor-maximized="app.isFull"
			:locale="workbenchLocale"
			:can-refresh-active-tab="Boolean(activeProcessTabId)"
			:can-close-other-tabs="Boolean(activeProcessTabId) && workbenchTabs.length > 1"
			:can-close-all-tabs="workbenchTabs.length > 0"
			brand-title="Phoenix Admin"
			:brand-subtitle="currentTitle"
			header-aria-label="Phoenix Admin 工作台页眉"
			activity-aria-label="Phoenix Admin 全局导航"
			tree-header-label="功能目录"
			@activate="activateNavigationNode"
			@select-module="selectNavigationRoot"
			@update:expanded-node-ids="updateExpandedNavigationNodeIds"
			@update:presentation="updateDisplayPreference('presentation', $event)"
			@update:ribbon-appearance="updateDisplayPreference('ribbonAppearance', $event)"
			@update:tree-collapsed="updateDisplayPreference('treeCollapsed', $event)"
			@update:tree-appearance="updateDisplayPreference('treeAppearance', $event)"
			@update:tab-bar-placement="updateDisplayPreference('tabBarPlacement', $event)"
			@update:color-scheme="updateWorkbenchColorScheme"
			@update:display-settings-positions="
				updateDisplayPreference('settingsPositions', $event)
			"
			@update:visibility="updateLayoutVisibility"
			@update:layout-state="updateDisplayPreference('layoutState', $event)"
			@update:active-bottom-tab-id="activeBottomTabId = $event"
			@select-tab="selectProcessTab"
			@close-tab="closeProcessTab"
			@close-all-tabs="closeAllProcessTabs"
			@refresh-active-tab="refreshActiveProcessTab"
			@close-other-tabs="closeOtherProcessTabs"
			@update:editor-maximized="app.setFull"
			@display-settings-action="handleDisplaySettingsAction"
		>
			<template #brand>
				<button type="button" class="pah-brand" title="Phoenix Admin 首页" @click="goHome">
					<PnwPhoenixWingMark class="pah-brand__mark" decorative />
					<span>
						<strong>Phoenix Admin</strong>
						<small>{{ currentTitle }}</small>
					</span>
				</button>
			</template>

			<template #header-actions>
				<div class="pah-workbench-topbar">
					<slot name="topbar" />
				</div>
			</template>

			<template #display-settings-actions="{ emitAction }">
				<button
					type="button"
					class="pah-display-settings-action"
					@click="emitAction('pah.open-navigation-management')"
				>
					管理大分组与模块归属
				</button>
				<div v-if="hostToolbarComponents.length" class="pah-display-settings-tools">
					<strong>常用工具</strong>
					<div>
						<component
							v-for="item in hostToolbarComponents"
							:key="item.name"
							:is="item.component"
						/>
					</div>
				</div>
				<button
					type="button"
					class="pah-display-settings-action pah-display-settings-action--reset"
					@click="emitAction('pah.reset-display-preferences')"
				>
					恢复 Admin 默认显示
				</button>
			</template>

			<template #footer>
				<div class="pah-footer-context">
					<span>Phoenix Admin · {{ presentationLabel }} · {{ configuredMode }}</span>
					<nav v-if="footerBreadcrumb.length" aria-label="当前路径">
						<template v-for="(item, index) in footerBreadcrumb" :key="item.id">
							<b v-if="index > 0" aria-hidden="true">/</b>
							<span>{{ item.label }}</span>
						</template>
					</nav>
				</div>
			</template>

			<slot />
		</PnwWorkbenchShellLayout>
	</section>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'PahWorkbenchShell'
});

import {
	computed,
	markRaw,
	onBeforeUnmount,
	onMounted,
	reactive,
	ref,
	shallowRef,
	watch
} from 'vue';
import { storeToRefs } from 'pinia';
import { isFunction, last, orderBy } from 'lodash-es';
import {
	PnwPhoenixWingMark,
	PnwWorkbenchShell as PnwWorkbenchShellLayout,
	pnwApplyColorScheme,
	pnwCreateOutputBuffer,
	usePnwRegisteredViewContribution,
	type PnwBottomViewBlockComponentContribution,
	type PnwColorScheme,
	type PnwViewBlockVisibility,
	type PnwWorkbenchDisplayPreferences
} from 'phoenix-wing';
import { useBase } from '/$/base';
import { useTheme } from '/#/theme/hooks';
import { module, useCool } from '/@/cool';
import { storage } from '/@/cool/utils';
import { config } from '/@/config';
import {
	pahBuildRibbonTabs,
	pahFindRouteMenuTrail,
	pahRouteTemplatePath
} from './PahRibbonMenuAdapter';
import {
	pahMergeDevelopmentRibbonTabs,
	pahProjectDevelopmentRibbonContributions
} from './PahDevelopmentRibbonContributions';
import {
	pahBuildModuleGroups,
	PAH_DEFAULT_MODULE_GROUPS,
	type PahModuleGroupDefinition
} from './PahModuleGroupAdapter';
import {
	pahBuildNavigationNodes,
	pahFindNavigationItem,
	pahFindNavigationItemByNodeId,
	pahFindNavigationNodeIdByRoute,
	pahNavigationBranchIds
} from './PahNavigationAdapter';
import {
	pahAdminResourceIcon,
	pahLegacyCoolIconName,
	pahRegisterCoolNavigationIcons,
	pahResourceIconComponent,
	pahWingResourceIcon
} from './PahResourceIcon';
import type { PahShellMode } from './PahShellMode';
import { PAH_NAVIGATION_STYLE_KEY } from './PahNavigationStyle';
import {
	PAH_LEGACY_WORKBENCH_PREFERENCES_KEY,
	PAH_WORKBENCH_PREFERENCES_KEY,
	pahNormalizeWorkbenchPreferences
} from './PahWorkbenchPreferences';
import { usePahGroupedNavigationStore } from './PahGroupedNavigationStore';
import {
	pahViewContributionRegistry,
	type PahViewBlockComponentContributions
} from './PahViewContributions';
import { pahWorkbenchSideBlocks } from './PahWorkbenchBlocks';
import PahWorkbenchDefaultBottom from './PahWorkbenchDefaultBottom.vue';
import { pahCreateWorkbenchOutput, pahProvideWorkbenchOutput } from './PahWorkbenchOutput';
import { usePahWorkbenchThemeBridge } from './PahWorkbenchThemeBridge';
import { pahWorkbenchLocale } from './PahWorkbenchLocale';
import { pahProcessEntriesAfterCloseOthers } from './PahWorkbenchProcessActions';

const props = defineProps<{
	configuredMode: PahShellMode;
}>();

type NavigationResponse = {
	groups: Array<{ id: number; label: string; orderNum: number; isEnabled: boolean }>;
	assignments: Array<{ targetKey: string; groupId: number }>;
	modules: Array<{ menuId: number; targetKey: string }>;
};

const EMPTY_VIEW_BLOCKS: PahViewBlockComponentContributions = Object.freeze({});
const navigationGroupIcon = pahWingResourceIcon('folder');
const { menu, process, app } = useBase();
const { browser, route, router, service, mitt } = useCool();

const storedPreferences =
	storage.get(PAH_WORKBENCH_PREFERENCES_KEY) ?? storage.get(PAH_LEGACY_WORKBENCH_PREFERENCES_KEY);
const initialWorkbenchPreferences = pahNormalizeWorkbenchPreferences(
	storedPreferences,
	storage.get(PAH_NAVIGATION_STYLE_KEY) || import.meta.env.VITE_PAH_NAVIGATION_STYLE
);
const displayPreferences = ref<PnwWorkbenchDisplayPreferences>(
	initialWorkbenchPreferences.displayPreferences
);

const themeStore = useTheme();
const { isDark: coolIsDark } = storeToRefs(themeStore);
const systemThemeMedia = window.matchMedia('(prefers-color-scheme: dark)');
const systemPrefersDark = ref(systemThemeMedia.matches);
const preferredColorScheme = computed<PnwColorScheme>({
	get: () => displayPreferences.value.colorScheme,
	set: colorScheme => updateDisplayPreference('colorScheme', colorScheme)
});
const { colorScheme: workbenchColorScheme, updateFromWorkbench } = usePahWorkbenchThemeBridge({
	coolIsDark,
	colorScheme: preferredColorScheme,
	setCoolDark: isDark => themeStore.setTheme({ color: themeStore.color, dark: isDark }),
	systemPrefersDark,
	applyHostColorScheme: colorScheme => {
		document.documentElement.classList.toggle('dark', colorScheme === 'dark');
		pnwApplyColorScheme(colorScheme);
	}
});
const groupedNavigation = usePahGroupedNavigationStore();
const navigationResponse = ref<NavigationResponse | null>(null);
const browsedNavigationRootId = ref('');
const activeBottomTabId = ref('output');
const workbenchOutputBuffer = pnwCreateOutputBuffer({
	maxCharacters: 200_000,
	initialText: '[Runtime] Phoenix Admin 工作台已就绪\n'
});
const workbenchOutputSnapshot = shallowRef(workbenchOutputBuffer.getSnapshot());
const unsubscribeWorkbenchOutput = workbenchOutputBuffer.subscribe(snapshot => {
	workbenchOutputSnapshot.value = snapshot;
});
const workbenchOutput = pahCreateWorkbenchOutput(workbenchOutputBuffer);
pahProvideWorkbenchOutput(workbenchOutput);
const workbenchBottomProps = computed(() => ({
	text: workbenchOutputSnapshot.value.text
}));
const workbenchBottomTabs = Object.freeze([{ id: 'output', label: '输出' }]);
const workbenchBottomBlock: PnwBottomViewBlockComponentContribution = {
	component: markRaw(PahWorkbenchDefaultBottom),
	props: workbenchBottomProps,
	tabs: workbenchBottomTabs
};

const configuredMode = computed(() => props.configuredMode);
const navigationTargetKeysByMenuId = computed(() =>
	Object.fromEntries(
		(navigationResponse.value?.modules || []).map(item => [item.menuId, item.targetKey])
	)
);
const developmentRibbonProjection = computed(() =>
	pahProjectDevelopmentRibbonContributions(module.list, import.meta.env.DEV)
);
const navigationDefinitions = computed<PahModuleGroupDefinition[]>(() => {
	const definitions = !navigationResponse.value
		? PAH_DEFAULT_MODULE_GROUPS
		: navigationResponse.value.groups
				.filter(group => group.isEnabled)
				.map(group => ({
					id: `pah-group-${group.id}`,
					label: group.label,
					orderNum: group.orderNum,
					moduleTargetKeys: navigationResponse
						.value!.assignments.filter(assignment => assignment.groupId === group.id)
						.map(assignment => assignment.targetKey)
				}));
	return definitions.map(definition => ({
		...definition,
		moduleTargetKeys: [
			...(definition.moduleTargetKeys || []),
			...(developmentRibbonProjection.value.targetKeysByGroupLabel[definition.label] || [])
		]
	}));
});
const persistedRibbonTabs = computed(() =>
	pahBuildRibbonTabs(menu.group, undefined, navigationTargetKeysByMenuId.value)
);
const ribbonTabs = computed(() =>
	pahMergeDevelopmentRibbonTabs(persistedRibbonTabs.value, developmentRibbonProjection.value.tabs)
);
const moduleGroups = computed(() =>
	pahBuildModuleGroups(ribbonTabs.value, navigationDefinitions.value)
);
const coolNavigationIconNames = computed(() =>
	Array.from(
		new Set(
			moduleGroups.value
				.flatMap(group => group.modules)
				.flatMap(module => [
					module.icon,
					...module.groups.flatMap(group => group.items.map(item => item.icon))
				])
				.map(pahLegacyCoolIconName)
				.filter((name): name is string => Boolean(name))
		)
	).sort()
);
const navigationNodes = computed(() =>
	pahBuildNavigationNodes(moduleGroups.value, {
		group: () => navigationGroupIcon,
		module: module => pahAdminResourceIcon(module.icon, 'folder'),
		item: item => pahAdminResourceIcon(item.icon)
	})
);
const navigationBranchIds = computed(() => pahNavigationBranchIds(navigationNodes.value));
const routeTemplatePath = computed(() => pahRouteTemplatePath(route.path, route.matched));
const routeNavigationNodeId = computed(() =>
	pahFindNavigationNodeIdByRoute(moduleGroups.value, menu.group, routeTemplatePath.value)
);
const activeNavigationNodeId = computed(
	() => browsedNavigationRootId.value || routeNavigationNodeId.value
);
const expandedNavigationNodeIds = computed(() =>
	groupedNavigation.expandedNodeIds(navigationBranchIds.value)
);
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
const workbenchLocale = computed(() => pahWorkbenchLocale(config.i18n.locale));
const activeViewId = computed(() => activeProcessTabId.value || route.path);
const registeredViewBlocks = usePnwRegisteredViewContribution(
	pahViewContributionRegistry,
	activeViewId,
	EMPTY_VIEW_BLOCKS
);
const activeViewBlocks = computed(() => pahWorkbenchSideBlocks(registeredViewBlocks.value));
const currentTitle = computed(
	() =>
		process.list.find(item => item.active)?.meta?.label ||
		String(route.meta?.label || route.name || 'Host 工作台')
);
const footerBreadcrumb = computed(() => pahFindRouteMenuTrail(menu.group, routeTemplatePath.value));
const presentationLabel = computed(() =>
	displayPreferences.value.presentation === 'tree' ? '侧面目录树' : '顶部 Ribbon'
);

function workbenchPageIcon(pageId: string) {
	const item = pahFindNavigationItem(moduleGroups.value, candidate => candidate.path === pageId);
	return pahResourceIconComponent(
		item ? pahAdminResourceIcon(item.icon) : pahWingResourceIcon('document')
	);
}

const hostToolbar = reactive({
	list: [] as Array<{ name: string; component: unknown; h5?: boolean; pc?: boolean }>,
	async load() {
		const entries = orderBy(
			module.list
				.filter(item => item.enable !== false && !!item.toolbar)
				.map(item => item.toolbar),
			'order'
		);
		const toolbarEntries = entries.filter(
			(item): item is { order?: number; pc?: boolean; h5?: boolean; component: any } =>
				Boolean(item?.component)
		);
		this.list = await Promise.all(
			toolbarEntries.map(async (item, index) => {
				const loaded = await (isFunction(item.component)
					? item.component()
					: item.component);
				return {
					...item,
					name: `toolbar-${item.order || index}`,
					component: markRaw(loaded.default || loaded)
				};
			})
		);
	}
});
const hostToolbarComponents = computed(() =>
	hostToolbar.list.filter(item => (browser.isMini ? item.h5 !== false : item.pc !== false))
);

function updateDisplayPreference<K extends keyof PnwWorkbenchDisplayPreferences>(
	key: K,
	value: PnwWorkbenchDisplayPreferences[K]
) {
	displayPreferences.value = { ...displayPreferences.value, [key]: value };
}

function updateLayoutVisibility(visibility: PnwViewBlockVisibility) {
	updateDisplayPreference('layoutState', {
		...displayPreferences.value.layoutState,
		visibility
	});
}

function updateWorkbenchColorScheme(colorScheme: PnwColorScheme) {
	updateFromWorkbench(colorScheme);
}

function updateSystemColorScheme(event: MediaQueryListEvent) {
	systemPrefersDark.value = event.matches;
}

function updateExpandedNavigationNodeIds(nodeIds: readonly string[]) {
	groupedNavigation.setExpandedNodeIds(navigationBranchIds.value, nodeIds);
}

function selectNavigationRoot(nodeId: string) {
	if (navigationNodes.value.some(node => node.id === nodeId)) {
		// 这里只切换 Ribbon 的大分组筛选，不猜测默认路由；活动 View 仍由 Router 决定。
		browsedNavigationRootId.value = nodeId;
	}
}

function activateNavigationNode(nodeId: string) {
	const item = pahFindNavigationItemByNodeId(moduleGroups.value, nodeId);
	if (item) {
		browsedNavigationRootId.value = '';
		void router.push(item.path);
	}
}

function goHome() {
	void router.push('/');
}

function goNavigationManagement() {
	void router.push('/phoenix/navigation');
}

function resetDisplayPreferences() {
	const resetPreferences = pahNormalizeWorkbenchPreferences(
		undefined,
		import.meta.env.VITE_PAH_NAVIGATION_STYLE
	).displayPreferences;
	displayPreferences.value = {
		...resetPreferences,
		colorScheme: workbenchColorScheme.value
	};
	groupedNavigation.expandAll(navigationBranchIds.value);
}

function handleDisplaySettingsAction(actionId: string) {
	if (actionId === 'pah.open-navigation-management') goNavigationManagement();
	else if (actionId === 'pah.reset-display-preferences') resetDisplayPreferences();
}

async function loadNavigationGroups() {
	try {
		navigationResponse.value = await service.request({
			url: '/admin/phoenix/navigation/read',
			method: 'GET'
		});
	} catch {
		// Host 分组服务不可用时保持内置规则，不能阻塞已有权限菜单导航。
		navigationResponse.value = null;
	}
}

function selectProcessTab(tabId: string) {
	const item = process.list.find(entry => entry.path === tabId);
	if (item) void router.push(item.fullPath);
}

function navigateToProcessFallback() {
	if (process.list.some(item => item.active)) return;
	const next = last(process.list);
	void router.push(next?.fullPath || '/');
}

function closeProcessTab(tabId: string) {
	const index = process.list.findIndex(entry => entry.path === tabId);
	if (index < 0) return;
	process.remove(index);
	navigateToProcessFallback();
}

function closeAllProcessTabs() {
	process.clear();
	navigateToProcessFallback();
}

function refreshActiveProcessTab() {
	if (activeProcessTabId.value) mitt.emit('view.refresh');
}

function closeOtherProcessTabs() {
	const remaining = pahProcessEntriesAfterCloseOthers(process.list);
	if (!remaining) return;
	process.set(remaining);
	void router.push(remaining[0].fullPath);
}

watch(navigationBranchIds, branchIds => groupedNavigation.ensureGroups(branchIds), {
	immediate: true
});

let unregisterCoolNavigationIcons: () => void = () => undefined;
watch(
	coolNavigationIconNames,
	iconNames => {
		unregisterCoolNavigationIcons();
		unregisterCoolNavigationIcons = pahRegisterCoolNavigationIcons(iconNames);
	},
	{ immediate: true }
);

onBeforeUnmount(() => {
	unregisterCoolNavigationIcons();
	unsubscribeWorkbenchOutput();
});

watch(
	() => route.fullPath,
	() => {
		// Router/Process/KeepAlive 是活动 View 唯一真源；新的路由导航结束 Ribbon 浏览态。
		browsedNavigationRootId.value = '';
	}
);

watch(
	displayPreferences,
	preferences => {
		storage.set(PAH_WORKBENCH_PREFERENCES_KEY, {
			version: 3,
			displayPreferences: preferences
		});
	},
	{ deep: true, immediate: true }
);

onMounted(() => {
	systemThemeMedia.addEventListener('change', updateSystemColorScheme);
	void hostToolbar.load();
	void loadNavigationGroups();
});

onBeforeUnmount(() => systemThemeMedia.removeEventListener('change', updateSystemColorScheme));
</script>

<style lang="scss" scoped>
.pah-workbench-shell {
	--pnw-activity-tree-width: 280px;
	width: 100%;
	height: 100%;
	min-width: 0;
	min-height: 0;
	overflow: hidden;
}

:deep(.pnw-workbench-layout[data-pnw-color-scheme='light']) {
	--pnw-ribbon-tool-muted: #475569;
}

:deep(.pnw-workbench-layout[data-pnw-color-scheme='dark']) {
	--pnw-ribbon-tool-muted: #cbd5e1;
}

.pah-brand {
	display: flex;
	align-items: center;
	gap: 9px;
	min-width: 188px;
	height: 100%;
	padding: 0 12px 0 8px;
	border: 0;
	background: transparent;
	color: inherit;
	font: inherit;
	text-align: left;
	cursor: pointer;

	&__mark {
		--pnw-phoenix-wing-mark-size: 32px;
		filter: drop-shadow(0 3px 5px rgb(37 99 235 / 22%));
	}

	> span {
		display: grid;
		min-width: 0;
		gap: 2px;
	}

	strong,
	small {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	strong {
		font-size: 13px;
	}

	small {
		color: var(--pnw-workbench-muted, #64748b);
		font-size: 9px;
	}

	&:focus-visible {
		outline: 2px solid var(--pnw-focus-ring, #3b82f6);
		outline-offset: -2px;
	}
}

.pah-workbench-topbar {
	height: 100%;
	min-width: 120px;
	overflow: hidden;

	:deep(.app-topbar) {
		height: 100%;
		padding: 0 6px;
		border: 0;
		background: transparent;
	}

	:deep(.app-topbar > .cl-comm__icon),
	:deep(.route-nav),
	:deep(.a-menu) {
		display: none;
	}
}

.pah-footer-context {
	display: flex;
	align-items: center;
	gap: 12px;
	min-width: 0;
	overflow: hidden;
	font-size: 11px;

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
		border-left: 1px solid var(--pnw-workbench-border, #dbe3ed);
	}

	nav span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	nav b {
		font-weight: 400;
		opacity: 0.55;
	}
}

:deep(.pnw-workbench-editor > .app-views) {
	width: 100%;
	height: 100%;
	min-height: 0;
	margin: 0;
	overflow: auto;
	overscroll-behavior: contain;
	border-radius: 0;
}

:global(.pah-display-settings-action) {
	display: flex;
	align-items: center;
	width: 100%;
	min-height: 30px;
	padding: 6px 10px;
	border: 0;
	background: transparent;
	color: inherit;
	font: inherit;
	text-align: left;
	cursor: pointer;
}

:global(.pah-display-settings-action:hover),
:global(.pah-display-settings-action:focus-visible) {
	background: var(--pnw-control-hover-bg, rgb(59 130 246 / 9%));
	outline: 0;
}

:global(.pah-display-settings-action--reset) {
	color: var(--pnw-workbench-muted, #64748b);
}

:global(.pah-display-settings-tools) {
	position: relative;
	display: grid;
	gap: 6px;
	padding: 8px 10px;
	border-top: 1px solid var(--pnw-workbench-border, #dbe3ed);
}

:global(.pah-display-settings-tools > strong) {
	display: flex;
	align-items: center;
	min-height: 26px;
	padding-right: 100px;
	font-size: 11px;
}

:global(.pah-display-settings-tools > div) {
	display: flex;
	flex-wrap: nowrap;
	align-items: center;
	gap: 4px;
}

:global(.pah-display-settings-tools .ai-coding-toolbar) {
	position: absolute;
	top: 8px;
	right: 10px;
}

:global(.pah-display-settings-tools button.gitee-link) {
	box-sizing: border-box;
	flex: 0 0 26px;
	width: 26px !important;
	min-width: 26px;
	max-width: 26px;
	height: 26px;
	min-height: 26px;
	max-height: 26px;
	padding: 0 !important;
}

:global(.pah-display-settings-tools .ml-\[10px\]) {
	margin-left: 0;
}

@media only screen and (max-width: 700px) {
	.pah-brand {
		min-width: auto;
		padding-right: 6px;

		> span {
			display: none;
		}
	}
}
</style>

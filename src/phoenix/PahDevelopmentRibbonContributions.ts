import type { PahRibbonTab } from './PahRibbonMenuAdapter';

export const PAH_DEVELOPMENT_RIBBON_OPTION_KEY = 'pahDevelopmentRibbon';

interface PahDevelopmentModuleConfig {
	name?: string;
	enable?: boolean;
	options?: Record<string, unknown>;
}

interface PahDevelopmentRibbonItemDocument {
	id: string;
	label: string;
	path: string;
	icon?: string;
}

interface PahDevelopmentRibbonGroupDocument {
	id: string;
	label: string;
	items: PahDevelopmentRibbonItemDocument[];
}

interface PahDevelopmentRibbonModuleDocument {
	id: string;
	label: string;
	icon?: string;
	groups: PahDevelopmentRibbonGroupDocument[];
}

interface PahDevelopmentRibbonDocument {
	schemaVersion: 1;
	developmentOnly: true;
	moduleId: string;
	preferredGroupLabel: string;
	modules: PahDevelopmentRibbonModuleDocument[];
}

export interface PahDevelopmentRibbonProjection {
	tabs: PahRibbonTab[];
	modules: PahDevelopmentRibbonModuleRegistration[];
	targetKeysByGroupLabel: Record<string, string[]>;
	issues: string[];
}

/** Host 启动时从健康开发挂载投影出的临时模块注册，不代表正式安装记录。 */
export interface PahDevelopmentRibbonModuleRegistration {
	targetKey: string;
	moduleId: string;
	label: string;
	preferredGroupLabel: string;
	lifecycle: 'development-mounted';
}

const PAH_DEVELOPMENT_ID_PATTERN = /^[a-z][a-z0-9-]*$/;

function pahDevelopmentRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function pahDevelopmentString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function pahDevelopmentDocument(
	value: unknown,
	moduleName: string,
	issues: string[]
): PahDevelopmentRibbonDocument | undefined {
	const document = pahDevelopmentRecord(value);
	if (!document) return undefined;
	if (document.schemaVersion !== 1 || document.developmentOnly !== true) {
		issues.push(`${moduleName}: 开发 Ribbon 必须声明 schemaVersion=1 与 developmentOnly=true`);
		return undefined;
	}
	const moduleId = pahDevelopmentString(document.moduleId);
	const preferredGroupLabel = pahDevelopmentString(document.preferredGroupLabel);
	if (!moduleId || !PAH_DEVELOPMENT_ID_PATTERN.test(moduleId) || moduleId !== moduleName) {
		issues.push(`${moduleName}: 开发 Ribbon moduleId 必须与挂载模块名一致`);
		return undefined;
	}
	if (!preferredGroupLabel || !Array.isArray(document.modules)) {
		issues.push(`${moduleName}: 开发 Ribbon 缺少目标分组或模块清单`);
		return undefined;
	}

	const modules: PahDevelopmentRibbonModuleDocument[] = [];
	for (const [moduleIndex, rawModule] of document.modules.entries()) {
		const candidate = pahDevelopmentRecord(rawModule);
		const id = pahDevelopmentString(candidate?.id);
		const label = pahDevelopmentString(candidate?.label);
		if (
			!candidate ||
			!id ||
			!PAH_DEVELOPMENT_ID_PATTERN.test(id) ||
			!label ||
			!Array.isArray(candidate.groups)
		) {
			issues.push(`${moduleName}: 第 ${moduleIndex + 1} 个开发 Ribbon 模块无效`);
			continue;
		}
		const groups: PahDevelopmentRibbonGroupDocument[] = [];
		for (const [groupIndex, rawGroup] of candidate.groups.entries()) {
			const group = pahDevelopmentRecord(rawGroup);
			const groupId = pahDevelopmentString(group?.id);
			const groupLabel = pahDevelopmentString(group?.label);
			if (!group || !groupId || !groupLabel || !Array.isArray(group.items)) {
				issues.push(`${moduleName}/${id}: 第 ${groupIndex + 1} 个 Ribbon Group 无效`);
				continue;
			}
			const items: PahDevelopmentRibbonItemDocument[] = [];
			for (const [itemIndex, rawItem] of group.items.entries()) {
				const item = pahDevelopmentRecord(rawItem);
				const itemId = pahDevelopmentString(item?.id);
				const itemLabel = pahDevelopmentString(item?.label);
				const itemPath = pahDevelopmentString(item?.path);
				if (!item || !itemId || !itemLabel || !itemPath || !itemPath.startsWith('/')) {
					issues.push(
						`${moduleName}/${id}/${groupId}: 第 ${itemIndex + 1} 个 Ribbon Item 无效`
					);
					continue;
				}
				items.push({
					id: itemId,
					label: itemLabel,
					path: itemPath,
					...(pahDevelopmentString(item.icon)
						? { icon: pahDevelopmentString(item.icon) }
						: {})
				});
			}
			if (items.length > 0) groups.push({ id: groupId, label: groupLabel, items });
		}
		if (groups.length > 0) {
			modules.push({
				id,
				label,
				groups,
				...(pahDevelopmentString(candidate.icon)
					? { icon: pahDevelopmentString(candidate.icon) }
					: {})
			});
		}
	}
	if (modules.length === 0) return undefined;
	return { schemaVersion: 1, developmentOnly: true, moduleId, preferredGroupLabel, modules };
}

/**
 * 把开发挂载模块的只读声明投影到 Host 顶部 Ribbon。
 *
 * 正式环境必须传 false；正式导航仍只来自权限菜单与 Pah 物化结果。
 */
export function pahProjectDevelopmentRibbonContributions(
	moduleConfigs: readonly PahDevelopmentModuleConfig[],
	developmentEnabled: boolean
): PahDevelopmentRibbonProjection {
	const projection: PahDevelopmentRibbonProjection = {
		tabs: [],
		modules: [],
		targetKeysByGroupLabel: {},
		issues: []
	};
	if (!developmentEnabled) return projection;

	const targetKeys = new Set<string>();
	const pageIds = new Set<string>();
	for (const moduleConfig of moduleConfigs) {
		if (moduleConfig.enable === false) continue;
		const moduleName = pahDevelopmentString(moduleConfig.name);
		if (!moduleName) continue;
		const document = pahDevelopmentDocument(
			moduleConfig.options?.[PAH_DEVELOPMENT_RIBBON_OPTION_KEY],
			moduleName,
			projection.issues
		);
		if (!document) continue;

		for (const [moduleIndex, ribbonModule] of document.modules.entries()) {
			const targetKey = `plugin:${document.moduleId}:${ribbonModule.id}`;
			if (targetKeys.has(targetKey)) {
				projection.issues.push(`${moduleName}: 重复的开发 Ribbon targetKey ${targetKey}`);
				continue;
			}
			targetKeys.add(targetKey);
			const groups = ribbonModule.groups
				.map((group, groupIndex) => ({
					id: `pah-dev-${document.moduleId}-${group.id}`,
					label: group.label,
					items: group.items.flatMap((item, itemIndex) => {
						const pageId = `pah-dev-${document.moduleId}-${item.id}`;
						if (pageIds.has(pageId)) {
							projection.issues.push(
								`${moduleName}: 重复的开发 Ribbon pageId ${pageId}`
							);
							return [];
						}
						pageIds.add(pageId);
						return [
							{
								pageId,
								label: item.label,
								path: item.path,
								menuId: -(
									(moduleIndex + 1) * 10_000 +
									(groupIndex + 1) * 100 +
									itemIndex +
									1
								),
								icon: item.icon
							}
						];
					})
				}))
				.filter(group => group.items.length > 0);
			if (groups.length === 0) continue;
			projection.tabs.push({
				id: `pah-dev-tab-${document.moduleId}-${ribbonModule.id}`,
				label: ribbonModule.label,
				icon: ribbonModule.icon,
				targetKey,
				groups
			});
			projection.modules.push({
				targetKey,
				moduleId: document.moduleId,
				label: ribbonModule.label,
				preferredGroupLabel: document.preferredGroupLabel,
				lifecycle: 'development-mounted'
			});
			(projection.targetKeysByGroupLabel[document.preferredGroupLabel] ||= []).push(
				targetKey
			);
		}
	}
	return projection;
}

/** 已物化的正式菜单优先；同 stable target 或重叠 route 的开发投影自动退场。 */
export function pahMergeDevelopmentRibbonTabs(
	persistedTabs: readonly PahRibbonTab[],
	developmentTabs: readonly PahRibbonTab[]
): PahRibbonTab[] {
	const persistedTargetKeys = new Set(persistedTabs.map(tab => tab.targetKey).filter(Boolean));
	const persistedPaths = new Set(
		persistedTabs.flatMap(tab =>
			tab.groups.flatMap(group => group.items.map(item => item.path))
		)
	);
	return [
		...persistedTabs,
		...developmentTabs.filter(
			tab =>
				!persistedTargetKeys.has(tab.targetKey) &&
				!tab.groups.some(group => group.items.some(item => persistedPaths.has(item.path)))
		)
	];
}

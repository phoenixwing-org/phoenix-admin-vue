import type { PnwNavigationNode } from 'phoenix-wing';
import type { PahModuleGroup } from './PahModuleGroupAdapter';
import { pahFindRouteMenuTrail, type PahRibbonItem } from './PahRibbonMenuAdapter';

export interface PahNavigationIconResolvers {
	group?: (group: PahModuleGroup) => unknown;
	module?: (module: PahModuleGroup['modules'][number]) => unknown;
	item?: (item: PahRibbonItem) => unknown;
}

function pahNavigationIcon(icon: unknown): { icon?: unknown } {
	return icon === undefined ? {} : { icon };
}

/**
 * 将权限过滤后的 Pah 大分组/模块投影成唯一一棵 Wing 导航树。
 * Ribbon 与 Tree 只消费这个返回值；路径和激活动作仍留在 Pah adapter。
 */
export function pahBuildNavigationNodes(
	groups: readonly PahModuleGroup[],
	icons: PahNavigationIconResolvers = {}
): readonly PnwNavigationNode[] {
	return groups.map((group, groupIndex) => ({
		id: group.id,
		label: group.label,
		order: groupIndex,
		...pahNavigationIcon(icons.group?.(group)),
		children: group.modules.map((module, moduleIndex) => ({
			id: module.id,
			label: module.label,
			order: moduleIndex,
			...pahNavigationIcon(icons.module?.(module)),
			children: module.groups.flatMap(ribbonGroup =>
				ribbonGroup.items.map((item, itemIndex) => {
					return {
						id: item.pageId,
						label: item.label,
						order: itemIndex,
						...pahNavigationIcon(icons.item?.(item))
					};
				})
			)
		}))
	}));
}

export function pahFindNavigationItem(
	groups: readonly PahModuleGroup[],
	predicate: (item: PahRibbonItem) => boolean
): PahRibbonItem | undefined {
	return groups
		.flatMap(group => group.modules)
		.flatMap(module => module.groups)
		.flatMap(group => group.items)
		.find(predicate);
}

export function pahFindNavigationItemByNodeId(
	groups: readonly PahModuleGroup[],
	nodeId: string
): PahRibbonItem | undefined {
	return pahFindNavigationItem(groups, item => item.pageId === nodeId);
}

export function pahFindNavigationNodeIdByPath(
	groups: readonly PahModuleGroup[],
	path: string
): string {
	return pahFindNavigationItem(groups, item => item.path === path)?.pageId || '';
}

/**
 * 可见页面返回叶子节点；hidden 深链返回其可见根模块节点。
 * 归属只来自同一权限菜单父链，不按 URL、标题或产品 ID 猜测。
 */
export function pahFindNavigationNodeIdByRoute(
	groups: readonly PahModuleGroup[],
	menuRoots: Menu.List,
	path: string
): string {
	const visibleNodeId = pahFindNavigationNodeIdByPath(groups, path);
	if (visibleNodeId) return visibleNodeId;

	const rootMenuId = pahFindRouteMenuTrail(menuRoots, path)[0]?.id;
	if (rootMenuId === undefined) return '';

	return (
		groups.flatMap(group => group.modules).find(module => module.menuId === rootMenuId)?.id ||
		''
	);
}

export function pahNavigationBranchIds(nodes: readonly PnwNavigationNode[]): string[] {
	return nodes.flatMap(node => [
		...(node.children?.length ? [node.id] : []),
		...pahNavigationBranchIds(node.children || [])
	]);
}

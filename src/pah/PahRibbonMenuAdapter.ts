export const PAH_RIBBON_GROUP_SIZE = 5;
export const PAH_MENU_TYPE = {
	DIRECTORY: 0,
	PAGE: 1,
	PERMISSION: 2
} as const;

export interface PahRibbonItem {
	pageId: string;
	label: string;
	path: string;
	menuId: number;
	icon?: string;
}

export interface PahRibbonGroup {
	id: string;
	label: string;
	items: PahRibbonItem[];
}

export interface PahRibbonTab {
	id: string;
	label: string;
	groups: PahRibbonGroup[];
	/** Phoenix Admin 菜单资源图标；由 Pah 适配成 Wing 可渲染组件。 */
	icon?: string;
	/** 可配置大分组使用的稳定目标；普通菜单默认是 menu:<id>。 */
	targetKey?: string;
	menuId?: number;
}

export interface PahMenuTrailItem {
	id: number;
	label: string;
	path: string;
}

function pahIsVisible(item: Menu.Item): boolean {
	return item.isShow !== false && item.isShow !== 0;
}

function pahOrdered(items: Menu.List = []): Menu.List {
	return [...items].sort((left, right) => {
		const order = (left.orderNum ?? 0) - (right.orderNum ?? 0);
		return order === 0 ? left.id - right.id : order;
	});
}

function pahToRibbonItem(item: Menu.Item): PahRibbonItem {
	return {
		pageId: `pah-menu-${item.id}`,
		label: item.meta?.label || item.name,
		path: item.path,
		menuId: item.id,
		icon: item.icon
	};
}

function pahCollectLeaves(items: Menu.List = []): PahRibbonItem[] {
	return pahOrdered(items)
		.filter(pahIsVisible)
		.flatMap(item => {
			if (item.type === PAH_MENU_TYPE.PAGE) {
				return [pahToRibbonItem(item)];
			}
			if (item.type === PAH_MENU_TYPE.DIRECTORY) {
				return pahCollectLeaves(item.children || []);
			}
			return [];
		});
}

function pahFindMenuTrailInternal(
	menuRoots: Menu.List,
	path: string,
	includeHidden: boolean
): PahMenuTrailItem[] {
	for (const item of pahOrdered(menuRoots)) {
		if (item.type === PAH_MENU_TYPE.PERMISSION) continue;
		if (!includeHidden && !pahIsVisible(item)) continue;

		const current = {
			id: item.id,
			label: item.meta?.label || item.name,
			path: item.path
		};

		if (item.path === path) return [current];

		const children = pahFindMenuTrailInternal(item.children || [], path, includeHidden);
		if (children.length > 0) return [current, ...children];
	}

	return [];
}

/** 只从可见导航项生成普通菜单路径。 */
export function pahFindMenuTrail(menuRoots: Menu.List, path: string): PahMenuTrailItem[] {
	return pahFindMenuTrailInternal(menuRoots, path, false);
}

/** hidden View 仍可沿权限菜单父链找到所属模块，但不会因此进入 Ribbon/Tree。 */
export function pahFindRouteMenuTrail(menuRoots: Menu.List, path: string): PahMenuTrailItem[] {
	return pahFindMenuTrailInternal(menuRoots, path, true);
}

/**
 * Vue Router 的 route.path 是实际 URL；权限菜单保存的是 /items/:id 这类模板。
 * hidden 页归属必须使用最后一个 matched record 的模板，不能猜 URL 前缀。
 */
export function pahRouteTemplatePath(
	actualPath: string,
	matched: ReadonlyArray<{ path: string }>
): string {
	return [...matched].reverse().find(record => record.path)?.path || actualPath;
}

export function pahChunkRibbonItems(
	items: PahRibbonItem[],
	groupSize = PAH_RIBBON_GROUP_SIZE
): PahRibbonItem[][] {
	const size = Math.max(1, Math.floor(groupSize));
	const chunks: PahRibbonItem[][] = [];

	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size));
	}

	return chunks;
}

function pahCreateGroups(
	tabId: string,
	label: string,
	items: PahRibbonItem[],
	groupSize: number
): PahRibbonGroup[] {
	return pahChunkRibbonItems(items, groupSize).map((chunk, index) => ({
		id: `${tabId}-group-${index + 1}`,
		label: index === 0 ? label : `${label} ${index + 1}`,
		items: chunk
	}));
}

export function pahBuildRibbonTabs(
	menuRoots: Menu.List,
	groupSize = PAH_RIBBON_GROUP_SIZE,
	targetKeysByMenuId: Record<number, string> = {}
): PahRibbonTab[] {
	return pahOrdered(menuRoots)
		.filter(pahIsVisible)
		.map(root => {
			const tabId = `pah-tab-${root.id}`;

			if (root.type === PAH_MENU_TYPE.PAGE) {
				return {
					id: tabId,
					label: root.meta?.label || root.name,
					icon: root.icon,
					menuId: root.id,
					targetKey: targetKeysByMenuId[root.id] || `menu:${root.id}`,
					groups: pahCreateGroups(
						tabId,
						root.meta?.label || root.name,
						[pahToRibbonItem(root)],
						groupSize
					)
				};
			}

			const children = pahOrdered(root.children || []).filter(pahIsVisible);
			const directLeaves = children
				.filter(item => item.type === PAH_MENU_TYPE.PAGE)
				.map(pahToRibbonItem);
			const groups = pahCreateGroups(tabId, '常用', directLeaves, groupSize);

			children
				.filter(item => item.type === PAH_MENU_TYPE.DIRECTORY)
				.forEach(directory => {
					groups.push(
						...pahCreateGroups(
							`${tabId}-${directory.id}`,
							directory.meta?.label || directory.name,
							pahCollectLeaves(directory.children || []),
							groupSize
						)
					);
				});

			return {
				id: tabId,
				label: root.meta?.label || root.name,
				icon: root.icon,
				menuId: root.id,
				targetKey: targetKeysByMenuId[root.id] || `menu:${root.id}`,
				groups
			};
		})
		.filter(tab => tab.groups.some(group => group.items.length > 0));
}

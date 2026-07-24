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

export function pahFindMenuTrail(menuRoots: Menu.List, path: string): PahMenuTrailItem[] {
	for (const item of pahOrdered(menuRoots).filter(pahIsVisible)) {
		if (item.type === PAH_MENU_TYPE.PERMISSION) continue;

		const current = {
			id: item.id,
			label: item.meta?.label || item.name,
			path: item.path
		};

		if (item.path === path) return [current];

		const children = pahFindMenuTrail(item.children || [], path);
		if (children.length > 0) return [current, ...children];
	}

	return [];
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
	groupSize = PAH_RIBBON_GROUP_SIZE
): PahRibbonTab[] {
	return pahOrdered(menuRoots)
		.filter(pahIsVisible)
		.map(root => {
			const tabId = `pah-tab-${root.id}`;

			if (root.type === PAH_MENU_TYPE.PAGE) {
				return {
					id: tabId,
					label: root.meta?.label || root.name,
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
				groups
			};
		})
		.filter(tab => tab.groups.some(group => group.items.length > 0));
}

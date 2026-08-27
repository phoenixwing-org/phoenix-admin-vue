export const PAH_GROUPED_NAVIGATION_KEY = 'pah.groupedNavigation.v1';

export interface PahGroupedNavigationSnapshot {
	version: 1;
	expanded: Record<string, boolean>;
}

export function pahNormalizeGroupedNavigationSnapshot(
	value: unknown
): PahGroupedNavigationSnapshot {
	const expanded: Record<string, boolean> = {};

	if (value && typeof value === 'object') {
		const candidate = (value as Partial<PahGroupedNavigationSnapshot>).expanded;
		if (candidate && typeof candidate === 'object') {
			Object.entries(candidate).forEach(([groupId, state]) => {
				if (groupId && typeof state === 'boolean') expanded[groupId] = state;
			});
		}
	}

	return { version: 1, expanded };
}

export function pahExpandedNavigationNodeIds(
	snapshot: PahGroupedNavigationSnapshot,
	nodeIds: readonly string[]
): string[] {
	return nodeIds.filter(nodeId => snapshot.expanded[nodeId] ?? true);
}

export function pahSetExpandedNavigationNodeIds(
	snapshot: PahGroupedNavigationSnapshot,
	nodeIds: readonly string[],
	expandedNodeIds: readonly string[]
): PahGroupedNavigationSnapshot {
	const expanded = { ...snapshot.expanded };
	const selected = new Set(expandedNodeIds);
	nodeIds.forEach(nodeId => (expanded[nodeId] = selected.has(nodeId)));
	return { version: 1, expanded };
}

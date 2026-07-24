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

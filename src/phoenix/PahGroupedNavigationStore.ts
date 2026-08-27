import { defineStore } from 'pinia';
import { ref } from 'vue';
import { storage } from '/@/cool/utils';
import {
	PAH_GROUPED_NAVIGATION_KEY,
	pahExpandedNavigationNodeIds,
	pahNormalizeGroupedNavigationSnapshot,
	pahSetExpandedNavigationNodeIds
} from './PahGroupedNavigationState';

export const usePahGroupedNavigationStore = defineStore('pahGroupedNavigation', () => {
	const snapshot = ref(
		pahNormalizeGroupedNavigationSnapshot(storage.get(PAH_GROUPED_NAVIGATION_KEY))
	);

	function persist() {
		storage.set(PAH_GROUPED_NAVIGATION_KEY, snapshot.value);
	}

	function ensureGroups(groupIds: string[]) {
		let changed = false;
		const expanded = { ...snapshot.value.expanded };

		groupIds.forEach(groupId => {
			if (!(groupId in expanded)) {
				expanded[groupId] = true;
				changed = true;
			}
		});

		if (changed) {
			snapshot.value = { version: 1, expanded };
			persist();
		}
	}

	function isExpanded(groupId: string): boolean {
		return snapshot.value.expanded[groupId] ?? true;
	}

	function setExpanded(groupId: string, expanded: boolean) {
		snapshot.value = {
			version: 1,
			expanded: { ...snapshot.value.expanded, [groupId]: expanded }
		};
		persist();
	}

	function toggle(groupId: string) {
		setExpanded(groupId, !isExpanded(groupId));
	}

	function expandAll(groupIds: string[]) {
		const expanded = { ...snapshot.value.expanded };
		groupIds.forEach(groupId => (expanded[groupId] = true));
		snapshot.value = { version: 1, expanded };
		persist();
	}

	function expandedNodeIds(groupIds: readonly string[]) {
		return pahExpandedNavigationNodeIds(snapshot.value, groupIds);
	}

	function setExpandedNodeIds(groupIds: readonly string[], nodeIds: readonly string[]) {
		snapshot.value = pahSetExpandedNavigationNodeIds(snapshot.value, groupIds, nodeIds);
		persist();
	}

	return {
		snapshot,
		ensureGroups,
		isExpanded,
		setExpanded,
		toggle,
		expandAll,
		expandedNodeIds,
		setExpandedNodeIds
	};
});

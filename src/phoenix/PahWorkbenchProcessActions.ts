export interface PahWorkbenchProcessEntry {
	path: string;
	fullPath: string;
	active?: boolean;
}

/** 关闭其他标签只保留 Cool Process 唯一活动项；没有活动项时不猜测。 */
export function pahProcessEntriesAfterCloseOthers<T extends PahWorkbenchProcessEntry>(
	entries: readonly T[]
): T[] | null {
	const active = entries.find(entry => entry.active);
	return active ? [active] : null;
}

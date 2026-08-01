import { describe, expect, it } from 'vitest';
import {
	pahExpandedNavigationNodeIds,
	pahNormalizeGroupedNavigationSnapshot,
	pahSetExpandedNavigationNodeIds
} from './PahGroupedNavigationState';

describe('PahGroupedNavigationState', () => {
	it('首次使用没有分组状态', () => {
		expect(pahNormalizeGroupedNavigationSnapshot(undefined)).toEqual({
			version: 1,
			expanded: {}
		});
	});

	it('保留每个分组的展开与折叠状态', () => {
		expect(
			pahNormalizeGroupedNavigationSnapshot({
				version: 1,
				expanded: { permissions: true, audit: false }
			})
		).toEqual({
			version: 1,
			expanded: { permissions: true, audit: false }
		});
	});

	it('过滤损坏的分组状态并升级快照版本', () => {
		expect(
			pahNormalizeGroupedNavigationSnapshot({
				version: 99,
				expanded: { valid: true, invalid: 'yes', empty: null }
			})
		).toEqual({
			version: 1,
			expanded: { valid: true }
		});
	});

	it('把 Wing 受控展开 ID 写回完整分支状态', () => {
		const snapshot = pahSetExpandedNavigationNodeIds(
			{ version: 1, expanded: { stale: false } },
			['management', 'system'],
			['system']
		);

		expect(snapshot).toEqual({
			version: 1,
			expanded: { stale: false, management: false, system: true }
		});
		expect(pahExpandedNavigationNodeIds(snapshot, ['management', 'system', 'new'])).toEqual([
			'system',
			'new'
		]);
	});
});

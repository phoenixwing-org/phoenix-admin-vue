import { describe, expect, it } from 'vitest';
import { pahProcessEntriesAfterCloseOthers } from './PahWorkbenchProcessActions';

describe('PahWorkbenchProcessActions', () => {
	it('关闭其他只保留原 Process 活动对象', () => {
		const inactive = { path: '/a', fullPath: '/a' };
		const active = { path: '/b', fullPath: '/b?tab=1', active: true };
		expect(pahProcessEntriesAfterCloseOthers([inactive, active])).toEqual([active]);
	});

	it('没有活动项时不猜测要保留的路由', () => {
		expect(pahProcessEntriesAfterCloseOthers([{ path: '/a', fullPath: '/a' }])).toBeNull();
	});
});

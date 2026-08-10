import { describe, expect, it } from 'vitest';
import { pahPathBelongsToPlugin } from './PahPluginLifecycleCleanup';

describe('Phoenix 插件生命周期路由清理', () => {
	it('使用 manifest routePrefix 清理插件根路径、详情路径与查询地址', () => {
		const plugin = { moduleId: 'phoenix-open-issue', routePrefix: '/open-issue/' };

		expect(pahPathBelongsToPlugin('/open-issue', plugin)).toBe(true);
		expect(pahPathBelongsToPlugin('/open-issue/issue/42?tab=detail', plugin)).toBe(true);
		expect(pahPathBelongsToPlugin('/open-issue-archive', plugin)).toBe(false);
		expect(pahPathBelongsToPlugin('/phoenix/plugins', plugin)).toBe(false);
	});

	it('未声明 routePrefix 时使用 moduleId 且接受缺少前导斜杠的输入', () => {
		const plugin = { moduleId: 'example-plugin' };

		expect(pahPathBelongsToPlugin('/example-plugin', plugin)).toBe(true);
		expect(pahPathBelongsToPlugin('/example-plugin/items/1', plugin)).toBe(true);
		expect(pahPathBelongsToPlugin('/example', plugin)).toBe(false);
	});
});

import { describe, expect, expectTypeOf, it } from 'vitest';
import { pnwViewBlockComponentAvailability } from 'phoenix-wing/composables/pnwViewBlockComponents';
import {
	pahCreateViewContributionRegistry,
	type PahViewBlockComponentContributions
} from './PahViewContributions';

describe('PahViewContributions', () => {
	it('未显式注册的业务 View 不贡献任何 View 专属 Block', () => {
		const registry = pahCreateViewContributionRegistry();
		const contributions = registry.get('/example-plugin/items') || {};

		expect(pnwViewBlockComponentAvailability(contributions)).toEqual({
			primary: false,
			bottom: false,
			secondary: false
		});
	});

	it('按活动 View ID 隔离显式贡献', () => {
		const registry = pahCreateViewContributionRegistry();
		const primary = { component: {} };
		registry.set('/pah/example-with-primary', { primary });

		expect(registry.get('/pah/example-with-primary')).toEqual({ primary });
		expect(registry.get('/example-plugin/items')).toBeUndefined();
	});

	it('类型契约只允许 View 贡献 Primary/Secondary', () => {
		expectTypeOf<keyof PahViewBlockComponentContributions>().toEqualTypeOf<
			'primary' | 'secondary'
		>();
	});
});

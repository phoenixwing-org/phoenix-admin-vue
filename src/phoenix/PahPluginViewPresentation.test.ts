import { defineComponent } from 'vue';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./PahPluginViewPresentationHost.vue', () => ({ default: {} }));
import { pahWrapPhoenixPluginRouteView } from './PahPluginViewPresentation';
import {
	pahMarkPhoenixPluginModuleRoutes,
	pahPhoenixPluginRouteModuleId
} from './PahPluginViewPresentationPolicy';

describe('Phoenix 插件 View presentation Host', () => {
	it('只识别虚拟插件路由表中的业务 View', () => {
		const routes = {
			'/src/modules/example-plugin/views/items.vue': async () => ({})
		};
		expect(
			pahPhoenixPluginRouteModuleId('modules/example-plugin/views/items.vue', routes)
		).toBe('example-plugin');
		expect(
			pahPhoenixPluginRouteModuleId('modules/phoenix/views/plugins.vue', routes)
		).toBeUndefined();
	});

	it('默认包装插件 View，并允许旧页面短期声明 self-managed', () => {
		const plain = defineComponent({ name: 'PlainPluginView' });
		const managed = defineComponent({ name: 'ManagedPluginView' });
		Object.assign(managed, { phoenixViewPresentation: 'self-managed' });

		expect(
			pahWrapPhoenixPluginRouteView(
				plain,
				'example-plugin',
				'modules/example-plugin/views/items.vue'
			)
		).not.toBe(plain);
		expect(
			pahWrapPhoenixPluginRouteView(
				managed,
				'example-plugin',
				'modules/example-plugin/views/editor.vue'
			)
		).toBe(managed);
	});

	it('把运行时插件 config 的显式 component 路由标记为 Phoenix View', () => {
		const config: {
			views: Array<{ meta?: Record<string, unknown> }>;
			pages: Array<{ meta?: Record<string, unknown> }>;
		} = {
			views: [{ meta: { label: '报告' } }],
			pages: [{}]
		};
		pahMarkPhoenixPluginModuleRoutes(config, 'example-plugin');

		expect(config.views[0].meta).toMatchObject({
			label: '报告',
			phoenixPluginModuleId: 'example-plugin'
		});
		expect(config.pages[0].meta).toMatchObject({
			phoenixPluginModuleId: 'example-plugin'
		});
	});
});

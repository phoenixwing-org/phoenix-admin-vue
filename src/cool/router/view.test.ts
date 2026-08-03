import { defineComponent, h, type Component, type VNode } from 'vue';
import { describe, expect, it } from 'vitest';
import { coolWrapRouteView, coolWrapRouteViewLoader } from './view';

const FragmentView = defineComponent({
	name: 'fragment-view',
	setup: () => () => [h('header', '标题'), h('main', '内容')]
});

describe('cool route view host', () => {
	it('为 fragment View 提供可动画的唯一 element root', async () => {
		const wrapped = coolWrapRouteView(FragmentView) as Component & {
			name?: string;
			setup: (_: unknown, context: { attrs: Record<string, unknown> }) => () => VNode;
		};
		const vnode = wrapped.setup({}, { attrs: { routeId: 'example-route' } })();
		const child = (vnode.children as VNode[])[0];

		expect(wrapped.name).toBe('fragment-view');
		expect(vnode.type).toBe('div');
		expect(vnode.props?.class).toBe('app-view-transition-host');
		expect(child.type).toBe(FragmentView);
		expect(child.props?.routeId).toBe('example-route');
	});

	it('兼容 Vite 动态模块 loader', async () => {
		const wrapped = await coolWrapRouteViewLoader(async () => ({ default: FragmentView }))();

		expect((wrapped as Component & { name?: string }).name).toBe('fragment-view');
	});
});

import { defineComponent, h, type Component } from 'vue';
import { coolWrapRouteView } from '/@/cool/router/view';
import PahPluginViewPresentationHost from './PahPluginViewPresentationHost.vue';

export { pahPhoenixPluginRouteModuleId } from './PahPluginViewPresentationPolicy';

type PahSelfManagedPluginView = Component & {
	readonly phoenixViewPresentation?: 'self-managed';
};

function pahViewComponentName(view: Component): string | undefined {
	return typeof view === 'object' && view && 'name' in view && typeof view.name === 'string'
		? view.name
		: undefined;
}

/**
 * Phoenix 插件 View 默认由 Host 接入 Wing presentation。旧页面若已经完整自管 Portal，
 * 可用静态 self-managed 标记做短期兼容，避免形成双层浮窗。
 */
export function pahWrapPhoenixPluginRouteView(
	view: Component,
	moduleId: string,
	viewPath: string
): Component {
	if ((view as PahSelfManagedPluginView).phoenixViewPresentation === 'self-managed') {
		return view;
	}
	const cacheName = pahViewComponentName(view) || `pah-${moduleId}-view`;
	return defineComponent({
		name: cacheName,
		inheritAttrs: false,
		setup(_, { attrs }) {
			return () =>
				h(PahPluginViewPresentationHost, {
					...attrs,
					view,
					moduleId,
					viewPath,
					cacheName
				});
		}
	});
}

function pahPluginRouteViewComponent(value: unknown): Component {
	if (value && typeof value === 'object' && 'default' in value) {
		return (value as { default: Component }).default;
	}
	return value as Component;
}

export function pahWrapPhoenixPluginRouteViewLoader(
	loader: () => Promise<unknown>,
	moduleId: string,
	viewPath: string
) {
	return async () =>
		coolWrapRouteView(
			pahWrapPhoenixPluginRouteView(
				pahPluginRouteViewComponent(await loader()),
				moduleId,
				viewPath
			)
		);
}

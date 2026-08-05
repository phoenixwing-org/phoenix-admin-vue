import { defineComponent, h, type Component } from 'vue';

interface CoolRouteViewModule {
	default: Component;
}

function coolRouteViewComponent(value: unknown): Component {
	if (value && typeof value === 'object' && 'default' in value) {
		return (value as CoolRouteViewModule).default;
	}

	return value as Component;
}

function coolRouteViewName(view: Component): string | undefined {
	return typeof view === 'object' && view && 'name' in view && typeof view.name === 'string'
		? view.name
		: undefined;
}

/**
 * Transition 只能动画单一 element root；插件 View 可以合法返回 fragment。
 * Host 在路由装载边界统一提供根元素，同时把 route props/attrs 继续交给真实 View。
 */
export function coolWrapRouteView(view: Component): Component {
	return defineComponent({
		name: coolRouteViewName(view),
		inheritAttrs: false,
		setup(_, { attrs }) {
			return () =>
				h('div', { class: 'app-view-transition-host' }, [h(view, attrs)]);
		}
	});
}

export function coolWrapRouteViewLoader(loader: () => Promise<unknown>) {
	return async () => coolWrapRouteView(coolRouteViewComponent(await loader()));
}

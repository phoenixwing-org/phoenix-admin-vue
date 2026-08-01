import { defineComponent, h, markRaw, type Component } from 'vue';
import { PnwIcon, type PnwIconName } from 'phoenix-wing';
import ClSvg from '/$/base/components/icon/svg.vue';

const pahResourceIconCache = new Map<string, Component>();

function pahCachedResourceIcon(key: string, render: () => ReturnType<typeof h>): Component {
	const cached = pahResourceIconCache.get(key);
	if (cached) return cached;

	const component = markRaw(
		defineComponent({
			name: 'PahResourceIcon',
			setup: () => render
		})
	);
	pahResourceIconCache.set(key, component);
	return component;
}

/** 使用 Wing 自带的无产品语义资源图标。 */
export function pahWingResourceIcon(name: PnwIconName): Component {
	return pahCachedResourceIcon(`wing:${name}`, () => h(PnwIcon, { name, decorative: true }));
}

/**
 * 将权限菜单保存的 Phoenix Admin SVG 名称适配成 Wing navigation icon component。
 * 菜单没有配置图标时才回退 Wing 公共资源，避免建立第二套功能图标映射。
 */
export function pahAdminResourceIcon(
	name: string | null | undefined,
	fallback: PnwIconName = 'document'
): Component {
	const normalized = name?.trim();
	if (!normalized) return pahWingResourceIcon(fallback);

	return pahCachedResourceIcon(`admin:${normalized}`, () =>
		h(ClSvg, { name: normalized, class: 'pah-resource-icon', 'aria-hidden': 'true' })
	);
}

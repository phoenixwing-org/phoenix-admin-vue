import { defineComponent, h, markRaw, type Component } from 'vue';
import {
	PnwIconRenderer,
	pnwBuiltinIconId,
	pnwCreateIconId,
	pnwRegisterIconNamespace,
	type PnwBuiltinIconId,
	type PnwIconId,
	type PnwIconName
} from 'phoenix-wing';
import ClSvg from '/$/base/components/icon/svg.vue';

const PAH_COOL_NAVIGATION_ICON_NAMES = new Set([
	'home',
	'icon-app',
	'icon-auth',
	'icon-common',
	'icon-component',
	'icon-data',
	'icon-delete',
	'icon-dept',
	'icon-dict',
	'icon-doc',
	'icon-favor',
	'icon-file',
	'icon-folder',
	'icon-home',
	'icon-list',
	'icon-log',
	'icon-menu',
	'icon-monitor',
	'icon-params',
	'icon-search',
	'icon-set',
	'icon-task',
	'icon-tutorial',
	'icon-user',
	'icon-workbench',
	'search'
]);

const pahCoolIconComponentCache = new Map<string, Component>();
const pahRendererComponentCache = new Map<string, Component>();

function pahCoolIconComponent(name: string): Component {
	const cached = pahCoolIconComponentCache.get(name);
	if (cached) return cached;

	const component = markRaw(
		defineComponent({
			name: 'PahCoolResourceIcon',
			setup: () => () => h(ClSvg, { name, class: 'pah-resource-icon', 'aria-hidden': 'true' })
		})
	);
	pahCoolIconComponentCache.set(name, component);
	return component;
}

/** 使用 Wing 自带图标时也返回可序列化的显式 namespace ID。 */
export function pahWingResourceIcon(name: PnwIconName): PnwBuiltinIconId {
	return pnwBuiltinIconId(name);
}

/** 历史 COOL 裸名称只能解释为 Host 资源，不能按 PnwIconName 猜来源。 */
export function pahLegacyCoolIconName(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const normalized = value.trim();
	return normalized && !normalized.includes(':') ? normalized : null;
}

/**
 * 把菜单/manifest 图标投影成 Wing 的规范 ID。
 * 已带 namespace 的 Pah 值原样透传；历史 COOL 裸值显式进入 cool namespace。
 */
export function pahAdminResourceIcon(
	name: string | null | undefined,
	fallback: PnwIconName = 'document'
): PnwIconId | string {
	const normalized = name?.trim();
	if (!normalized) return pahWingResourceIcon(fallback);
	if (normalized.includes(':')) return normalized;
	return pnwCreateIconId('cool', normalized);
}

/** 兼容 Wing TabBar 仍以 Vue Component 接收页面图标的旧边界。 */
export function pahResourceIconComponent(icon: PnwIconId | string): Component {
	const cached = pahRendererComponentCache.get(icon);
	if (cached) return cached;

	const component = markRaw(
		defineComponent({
			name: 'PahResourceIconRenderer',
			setup: () => () => h(PnwIconRenderer, { icon, decorative: true })
		})
	);
	pahRendererComponentCache.set(icon, component);
	return component;
}

/** 只注册当前导航真实使用且经 Host 白名单确认存在的 COOL SVG。 */
export function pahRegisterCoolNavigationIcons(iconNames: readonly unknown[]): () => void {
	const icons: Record<string, Component> = {};
	for (const value of iconNames) {
		const name = pahLegacyCoolIconName(value);
		if (name && PAH_COOL_NAVIGATION_ICON_NAMES.has(name)) {
			icons[name] = pahCoolIconComponent(name);
		}
	}
	return pnwRegisterIconNamespace('cool', icons);
}

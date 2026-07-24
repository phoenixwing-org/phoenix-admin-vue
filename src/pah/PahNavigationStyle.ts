export const PAH_NAVIGATION_STYLE_KEY = 'pah.navigationStyle';

export type PahNavigationStyle = 'ribbon' | 'grouped-sidebar';

const PAH_NAVIGATION_STYLES: readonly PahNavigationStyle[] = ['ribbon', 'grouped-sidebar'];

export function pahNormalizeNavigationStyle(value: unknown): PahNavigationStyle {
	return PAH_NAVIGATION_STYLES.includes(value as PahNavigationStyle)
		? (value as PahNavigationStyle)
		: 'ribbon';
}

export function pahNavigationStyleLabel(value: PahNavigationStyle): string {
	return value === 'grouped-sidebar' ? '大分组侧栏' : 'Ribbon 工作台';
}

import { describe, expect, it } from 'vitest';
import { pnwResolveIcon } from 'phoenix-wing';
import {
	pahAdminResourceIcon,
	pahLegacyCoolIconName,
	pahRegisterCoolNavigationIcons,
	pahWingResourceIcon
} from './PahResourceIcon';

describe('PahResourceIcon', () => {
	it('Wing 与 Pah 新图标使用显式 namespace', () => {
		expect(pahWingResourceIcon('folder')).toBe('pnw:folder');
		expect(pahAdminResourceIcon('pnw:dashboard')).toBe('pnw:dashboard');
		expect(pahAdminResourceIcon('vendor:custom')).toBe('vendor:custom');
	});

	it('历史 COOL 裸值不按 Wing 同名图标猜来源', () => {
		expect(pahAdminResourceIcon('home')).toBe('cool:home');
		expect(pahAdminResourceIcon('icon-user')).toBe('cool:icon-user');
		expect(pahAdminResourceIcon(undefined)).toBe('pnw:document');
		expect(pahLegacyCoolIconName('pnw:list')).toBeNull();
	});

	it('只注册当前使用且在 Host 白名单中的 COOL 图标', () => {
		const unregister = pahRegisterCoolNavigationIcons([
			'icon-user',
			'icon-favor',
			'folder',
			'folder-opened',
			'pnw:list'
		]);
		try {
			expect(pnwResolveIcon('cool:icon-user')).toMatchObject({
				kind: 'component',
				fallback: false
			});
			expect(pnwResolveIcon('cool:icon-favor')).toMatchObject({
				kind: 'component',
				fallback: false
			});
			expect(pnwResolveIcon('cool:folder-opened')).toMatchObject({
				kind: 'pnw',
				name: 'unknown',
				fallback: true
			});
			expect(pnwResolveIcon('cool:folder')).toMatchObject({
				kind: 'pnw',
				name: 'unknown',
				fallback: true
			});
		} finally {
			unregister();
		}
	});
});

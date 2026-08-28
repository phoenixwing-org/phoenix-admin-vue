import { describe, expect, it, vi } from 'vitest';
import type { RouteRecordRaw } from 'vue-router';
import {
	coolFindNotFoundRoute,
	coolIsCatchAllRoute,
	coolNotFoundLocation,
	coolReadableNotFoundPath,
	coolResolveDynamicRouteWithRefresh
} from '/@/cool/router/resolve';

describe('Pah dynamic route resolution', () => {
	it('catch-all 不冒充已注册的业务贡献', () => {
		expect(coolIsCatchAllRoute({ path: '/:catchAll(.*)' })).toBe(true);
		expect(coolIsCatchAllRoute({ path: '/:pathMatch(.*)*' })).toBe(true);
		expect(coolIsCatchAllRoute({ path: '/items/:id' })).toBe(false);
	});

	it('真实未知地址只在显式 /404 时落到 catch-all，不形成 /404 自循环', () => {
		const catchAll = { path: '/:pathMatch(.*)*', name: '404' } as RouteRecordRaw;

		expect(coolFindNotFoundRoute('/missing', [catchAll])).toBeUndefined();
		expect(coolFindNotFoundRoute('/404', [catchAll])).toBe(catchAll);
	});

	it('404 只保留净化后的请求 path，不携带 query 或外部 URL', () => {
		expect(coolNotFoundLocation('/pah/dictionary-maintenance?token=secret')).toEqual({
			path: '/404',
			query: { from: '/pah/dictionary-maintenance' },
			replace: true
		});
		expect(coolReadableNotFoundPath(['/missing', '/ignored'])).toBe('/missing');
		expect(coolReadableNotFoundPath('https://example.com/path')).toBe('');
		expect(coolReadableNotFoundPath('//example.com/path')).toBe('');
	});

	it('冷深链只刷新一次权限菜单后重新匹配动态路由', async () => {
		let route: RouteRecordRaw | undefined;
		const find = vi.fn(() => ({ route, isReg: false }));
		const refresh = vi.fn(async () => {
			route = { path: '/items/:id', name: 'item-detail' } as RouteRecordRaw;
		});

		await expect(coolResolveDynamicRouteWithRefresh(find, refresh)).resolves.toEqual({
			route: { path: '/items/:id', name: 'item-detail' },
			isReg: false
		});
		expect(refresh).toHaveBeenCalledTimes(1);
		expect(find).toHaveBeenCalledTimes(2);
	});

	it('已有动态路由时不重复刷新菜单', async () => {
		const match = { route: { path: '/items' } as RouteRecordRaw, isReg: true };
		const refresh = vi.fn(async () => undefined);

		await expect(coolResolveDynamicRouteWithRefresh(() => match, refresh)).resolves.toBe(match);
		expect(refresh).not.toHaveBeenCalled();
	});

	it('菜单刷新失败时只尝试一次并保留未命中结果', async () => {
		const find = vi.fn(() => ({ route: undefined, isReg: false }));
		const refresh = vi.fn(async () => {
			throw new Error('offline');
		});

		await expect(coolResolveDynamicRouteWithRefresh(find, refresh)).resolves.toEqual({
			route: undefined,
			isReg: false
		});
		expect(refresh).toHaveBeenCalledTimes(1);
		expect(find).toHaveBeenCalledTimes(2);
	});
});

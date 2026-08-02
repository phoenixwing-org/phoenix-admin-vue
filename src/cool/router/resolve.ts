import type { RouteRecordRaw } from 'vue-router';

export interface CoolDynamicRouteMatch {
	route?: RouteRecordRaw;
	isReg: boolean;
}

/** catch-all 只负责最终兜底，不能伪装成已注册的业务贡献。 */
export function coolIsCatchAllRoute(route: Pick<RouteRecordRaw, 'path'>): boolean {
	return /:\w+\(\.\*\)/u.test(route.path);
}

/**
 * catch-all 不参与业务贡献匹配，但显式 /404 必须能落到它，避免再次重定向 /404。
 */
export function coolFindNotFoundRoute<T extends Pick<RouteRecordRaw, 'path'>>(
	path: string,
	routes: readonly T[]
): T | undefined {
	if (path !== '/404') return undefined;
	return routes.find(coolIsCatchAllRoute);
}

/**
 * 首次没有找到动态路由时，只刷新一次 Host 权限菜单并重新查找。
 * refresh 失败时保留 Router 的正常 404 语义，不形成循环导航。
 */
export async function coolResolveDynamicRouteWithRefresh(
	find: () => CoolDynamicRouteMatch,
	refresh: () => Promise<unknown>
): Promise<CoolDynamicRouteMatch> {
	const initial = find();
	if (initial.route) return initial;

	try {
		await refresh();
	} catch {
		// 后续再次 find，允许 refresh 在失败前已完成的安全状态更新生效。
	}

	return find();
}

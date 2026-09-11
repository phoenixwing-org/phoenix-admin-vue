export interface PahPluginRouteBoundary {
	moduleId: string;
	routePrefix?: string;
}

function normalizeRoutePrefix(value: string) {
	const prefixed = value.startsWith('/') ? value : `/${value}`;
	return prefixed.length > 1 ? prefixed.replace(/\/+$/u, '') : prefixed;
}

/**
 * 判断当前 Host 路径是否属于某个插件。
 *
 * 生命周期清理只依赖 manifest 的公共 routePrefix；没有声明时回退到 moduleId，
 * 不把 Open Issue 等产品路径写进 Host。
 */
export function pahPathBelongsToPlugin(path: string, plugin: PahPluginRouteBoundary) {
	const routePath = path.split(/[?#]/u, 1)[0] || '/';
	const prefix = normalizeRoutePrefix(plugin.routePrefix || plugin.moduleId);
	return routePath === prefix || routePath.startsWith(`${prefix}/`);
}

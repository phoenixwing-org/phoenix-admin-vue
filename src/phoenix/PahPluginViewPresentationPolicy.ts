interface PahPluginModuleRoutes {
	views?: Array<{ meta?: Record<string, unknown> }>;
	pages?: Array<{ meta?: Record<string, unknown> }>;
}

export function pahPhoenixPluginRouteModuleId(
	viewPath: string,
	pluginRouteFiles: Readonly<Record<string, unknown>>
): string | undefined {
	const normalized = viewPath.replace(/^cool\//, '');
	const routeFile = `/src/${normalized}`;
	if (!Object.prototype.hasOwnProperty.call(pluginRouteFiles, routeFile)) return undefined;
	return /^modules\/([a-z][a-z0-9-]*)\/(?:views|pages)\//.exec(normalized)?.[1];
}

/** 标记由受控 Phoenix 插件运行入口声明的路由，不依赖业务 URL 或产品特例判断。 */
export function pahMarkPhoenixPluginModuleRoutes(
	config: PahPluginModuleRoutes,
	moduleId: string
): void {
	for (const route of [...(config.views || []), ...(config.pages || [])]) {
		route.meta = {
			...(route.meta || {}),
			phoenixPluginModuleId: moduleId
		};
	}
}

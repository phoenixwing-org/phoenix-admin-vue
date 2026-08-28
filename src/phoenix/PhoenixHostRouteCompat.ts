/**
 * 已发布的 Pah Host 深链只在进入 Router 前映射到 Phoenix 新入口。
 *
 * 不接受任意 /pah/* 重写，避免把旧插件或未知页面误导到不存在的路由。
 */
const legacyRoutes: Readonly<Record<string, string>> = Object.freeze({
	'/pah/identity': '/phoenix/identity',
	'/pah/navigation': '/phoenix/navigation'
});

export function phoenixCanonicalHostRoute(path: string): string {
	return legacyRoutes[path] || path;
}

/** Phoenix Admin Host 接受的业务插件清单结构。 */
export interface PahPluginManifest {
	formatVersion: number;
	moduleId: string;
	name: string;
	version: string;
	publisher: string;
	license: string;
	hostCompatibility: string;
	wingCompatibility?: string;
	activationMode: 'restart';
	/** 面向用户的短路由前缀；省略时默认 /{moduleId}。 */
	routePrefix?: string;
	entrypoints: { web: string; node: string };
	routes: Array<{
		id: string;
		path: string;
		title: string;
		moduleId: string;
		capability: string;
		viewPath: string;
		isShow?: boolean;
	}>;
	navigation: {
		preferredGroupId: string;
		preferredGroupLabel: string;
		modules: Array<{ id: string; label: string; routeIds: string[] }>;
	};
	apiPrefix: string;
	capabilities: Array<{
		id: string;
		description: string;
		risk: 'read' | 'write' | 'admin';
	}>;
	resourcePolicies: string[];
	auditCategories: Array<{ id: string; description: string }>;
	migrations: Array<{ id: string; version: number; checksum: string; description: string }>;
	healthChecks: Array<{ id: string; path: string }>;
	hostReuse: Array<
		| 'identity'
		| 'users'
		| 'departments'
		| 'roles'
		| 'menus'
		| 'dictionary'
		| 'files'
		| 'tasks'
		| 'audit'
		| 'parameters'
		| 'backup'
	>;
	dataOwnership: { tables: string[]; retainedOnUninstall: boolean };
	uninstall: {
		retainDataByDefault: boolean;
		requiresBackup: boolean;
		purgeCapability: string;
	};
}

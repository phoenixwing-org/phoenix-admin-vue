/** Phoenix Admin Host 接受的业务插件清单结构。 */
export const PAH_PLUGIN_FORMAT_VERSION = 2 as const;
export type PahSha256 = `sha256:${string}`;
export type PahCapabilityHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface PahCapabilityEndpoint {
	method: PahCapabilityHttpMethod;
	path: string;
}

export type PahDictionaryItemClass = 'core' | 'default' | 'transitional';

export interface PahDictionaryContribution {
	id: string;
	typeKey: string;
	typeName: string;
	policyVersion: number;
	retainOnUninstall: true;
	installPresets?: string[];
	items: Array<{
		value: string;
		name: string;
		orderNum: number;
		itemClass: PahDictionaryItemClass;
		presets?: string[];
		tags?: string[];
		enabled?: boolean;
		customizable?: Array<'name' | 'orderNum' | 'enabled' | 'tags'>;
	}>;
}

export interface PahPluginMigrationDeclaration {
	id: string;
	version: number;
	checksum: PahSha256;
	description: string;
	artifact: {
		format: 'sql';
		path: string;
	};
}

export interface PahMigrationDryRunItem {
	id: string;
	version: number;
	checksum: PahSha256;
	description: string;
	artifactPath: string;
	state: 'pending' | 'applied';
}

/** Node 是计划的权威生成者；Vue 仅做只读展示，不持有执行入口。 */
export interface PahMigrationDryRunPlan {
	dryRun: true;
	planId: string;
	expiresAt: string;
	moduleId: string;
	pluginVersion: string;
	artifactsVerified: true;
	transaction: 'required';
	backupRequired: boolean;
	items: PahMigrationDryRunItem[];
}

export interface PahPluginManifest {
	formatVersion: typeof PAH_PLUGIN_FORMAT_VERSION;
	pluginType?: 'phoenix.admin.branding';
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
		icon?: string;
		moduleId: string;
		capability: string;
		viewPath: string;
		isShow?: boolean;
	}>;
	navigation: {
		preferredGroupId: string;
		preferredGroupLabel: string;
		modules: Array<{ id: string; label: string; icon?: string; routeIds: string[] }>;
	};
	apiPrefix: string;
	capabilities: Array<{
		id: string;
		description: string;
		risk: 'read' | 'write' | 'admin';
		endpoints?: PahCapabilityEndpoint[];
	}>;
	resourcePolicies: string[];
	auditCategories: Array<{ id: string; description: string }>;
	dictionaryContributions?: PahDictionaryContribution[];
	migrations: PahPluginMigrationDeclaration[];
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

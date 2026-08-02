import { describe, expect, it } from 'vitest';
import {
	PAH_PLUGIN_FORMAT_VERSION,
	type PahPluginManifest,
	type PahSha256
} from '/$/pah/manifest/PahPluginManifest';
import {
	pahAssertDirectInstallAllowed,
	pahCanDirectInstall,
	parsePahPluginManifest
} from '/$/pah/manifest/PahPluginPolicy';

const checksum = `sha256:${'a'.repeat(64)}` as PahSha256;

function createManifest(migrations: PahPluginManifest['migrations'] = []): PahPluginManifest {
	return {
		formatVersion: PAH_PLUGIN_FORMAT_VERSION,
		moduleId: 'example-plugin',
		name: '示例插件',
		version: '0.1.0',
		publisher: 'example',
		license: 'Apache-2.0',
		hostCompatibility: '^0.1.0',
		activationMode: 'restart',
		entrypoints: { web: 'dist/web.js', node: 'dist/node.js' },
		routes: [
			{
				id: 'example-items',
				path: '/example/items',
				title: '示例列表',
				icon: 'pnw:list',
				moduleId: 'example-workbench',
				capability: 'example:read',
				viewPath: 'modules/example-plugin/views/items.vue'
			}
		],
		navigation: {
			preferredGroupId: 'pah-group-business',
			preferredGroupLabel: '业务',
			modules: [
				{
					id: 'example-workbench',
					label: '示例工作台',
					icon: 'pnw:folder',
					routeIds: ['example-items']
				}
			]
		},
		apiPrefix: '/admin/example-plugin/',
		capabilities: [{ id: 'example:read', description: '读取示例', risk: 'read' }],
		resourcePolicies: [],
		auditCategories: [],
		migrations,
		healthChecks: [],
		hostReuse: ['identity', 'menus'],
		dataOwnership: { tables: ['example_item'], retainedOnUninstall: true },
		uninstall: {
			retainDataByDefault: true,
			requiresBackup: true,
			purgeCapability: 'example:purge'
		}
	};
}

const sqlMigration: PahPluginManifest['migrations'][number] = {
	id: 'example-plugin-init',
	version: 1,
	checksum,
	description: '初始化示例表',
	artifact: { format: 'sql', path: 'migrations/001-example-init.sql' }
};

describe('PahPluginManifest', () => {
	it('与 Host formatVersion 2 的 SQL 制品声明保持一致', () => {
		const manifest = createManifest([sqlMigration]);

		expect(parsePahPluginManifest(JSON.stringify(manifest))).toEqual(manifest);
		expect(manifest.migrations[0].artifact).toEqual({
			format: 'sql',
			path: 'migrations/001-example-init.sql'
		});
	});

	it('轻量门禁拒绝旧 format、错误 checksum 和不安全 SQL 路径', () => {
		expect(() =>
			parsePahPluginManifest(JSON.stringify({ ...createManifest(), formatVersion: 1 }))
		).toThrow('只接受 formatVersion 2');

		expect(() =>
			parsePahPluginManifest(
				JSON.stringify(
					createManifest([{ ...sqlMigration, checksum: 'a'.repeat(64) as PahSha256 }])
				)
			)
		).toThrow('checksum 必须是 sha256:');

		expect(() =>
			parsePahPluginManifest(
				JSON.stringify(
					createManifest([
						{ ...sqlMigration, artifact: { format: 'sql', path: '../escape.sql' } }
					])
				)
			)
		).toThrow('artifact.path 必须是安全的 migrations/*.sql');
	});

	it('含 DDL 的插件绝不进入普通安装 handler', () => {
		expect(pahCanDirectInstall(createManifest())).toBe(true);
		expect(pahCanDirectInstall(createManifest([sqlMigration]))).toBe(false);
		expect(() => pahAssertDirectInstallAllowed(createManifest())).not.toThrow();
		expect(() => pahAssertDirectInstallAllowed(createManifest([sqlMigration]))).toThrow(
			'只能生成 dry-run 计划'
		);
	});
});

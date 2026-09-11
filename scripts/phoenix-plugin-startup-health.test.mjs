import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
	lstatSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	symlinkSync,
	writeFileSync
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
	inspectPhoenixWebPlugins,
	phoenixPluginVirtualModules
} from './phoenix-plugin-startup-health.mjs';

const roots = [];

function sha256(value) {
	return createHash('sha256').update(value).digest('hex');
}

function canonicalJson(value) {
	if (Array.isArray(value)) return `[${value.map(item => canonicalJson(item)).join(',')}]`;
	if (value && typeof value === 'object') {
		return `{${Object.entries(value)
			.filter(([, item]) => item !== undefined)
			.sort(([left], [right]) => left.localeCompare(right, 'en'))
			.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
			.join(',')}}`;
	}
	return JSON.stringify(value);
}

function payloadFiles(root, relative = '') {
	const files = [];
	for (const name of readdirSync(path.join(root, relative)).sort((left, right) =>
		left.localeCompare(right, 'en')
	)) {
		const next = relative ? `${relative}/${name}` : name;
		const absolute = path.join(root, next);
		const current = lstatSync(absolute);
		if (current.isDirectory()) files.push(...payloadFiles(root, next));
		else if (current.isFile()) {
			files.push({ path: next, size: current.size, sha256: sha256(readFileSync(absolute)) });
		}
	}
	return files;
}

function activateRelease(host, moduleId, moduleRoot, pluginType = null) {
	const files = payloadFiles(moduleRoot);
	const digest = {
		fileCount: files.length,
		size: files.reduce((total, item) => total + item.size, 0),
		sha256: sha256(canonicalJson(files))
	};
	const directory = path.join(host, '.runtime', 'phoenix-plugin-activation', 'receipts');
	mkdirSync(directory, { recursive: true });
	writeFileSync(
		path.join(directory, `${moduleId}.json`),
		JSON.stringify({
			formatVersion: 1,
			moduleId,
			version: '1.0.0',
			pluginType,
			packageSha256: 'a'.repeat(64),
			manifestSha256: sha256(moduleId),
			payloads: { node: digest, vue: digest }
		})
	);
}

function fixture({ branding = false, dirty = false } = {}) {
	const root = mkdtempSync(path.join(os.tmpdir(), 'phoenix-web-plugin-'));
	roots.push(root);
	const product = path.join(root, 'product');
	const pluginRoot = path.join(product, 'packages', 'admin-plugin');
	const moduleId = branding ? 'example-branding' : 'example-plugin';
	const web = path.join(pluginRoot, 'vue', moduleId);
	const node = path.join(pluginRoot, 'midway', moduleId);
	const host = path.join(root, 'host');
	mkdirSync(path.join(web, 'views'), { recursive: true });
	mkdirSync(node, { recursive: true });
	mkdirSync(path.join(host, 'src', 'modules'), { recursive: true });
	writeFileSync(path.join(web, 'config.ts'), 'export default () => ({ order: 1 });\n');
	writeFileSync(path.join(web, 'views', 'home.vue'), '<template><div>home</div></template>\n');
	writeFileSync(path.join(node, 'config.ts'), 'export default () => ({ order: 1 });\n');
	writeFileSync(
		path.join(pluginRoot, 'manifest.json'),
		JSON.stringify({
			formatVersion: 2,
			...(branding ? { pluginType: 'phoenix.admin.branding' } : {}),
			moduleId,
			version: '1.0.0',
			activationMode: 'restart',
			entrypoints: {
				web: `vue/${moduleId}/config.ts`,
				node: `midway/${moduleId}/config.ts`
			},
			...(branding
				? {
						uiContributions: {
							login: { id: 'login', mode: 'host-auth-shell', presentation: 'split' },
							brand: {
								id: 'brand',
								...Object.fromEntries(
									[
										'logo',
										'logoDark',
										'compactLogo',
										'compactLogoDark',
										'favicon'
									].map(name => [
										name,
										{
											path: `vue/${moduleId}/assets/${name}.svg`,
											sha256: 'a'.repeat(64),
											size: 1
										}
									])
								)
							}
						},
						migrations: [],
						healthChecks: [],
						dataOwnership: { tables: [] },
						capabilities: []
					}
				: {})
		})
	);
	execFileSync('git', ['init', '-q'], { cwd: product });
	execFileSync('git', ['add', '.'], { cwd: product });
	execFileSync(
		'git',
		[
			'-c',
			'user.name=Test',
			'-c',
			'user.email=test@example.invalid',
			'commit',
			'-qm',
			'fixture'
		],
		{
			cwd: product
		}
	);
	if (dirty) writeFileSync(path.join(web, 'config.ts'), 'export default () => ({ order: 2 });\n');
	symlinkSync(web, path.join(host, 'src', 'modules', moduleId), 'dir');
	return { host, moduleId, manifestFile: path.join(pluginRoot, 'manifest.json'), product };
}

afterEach(() => {
	for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('Phoenix Web 插件启动点检', () => {
	it('业务开发挂载通过 Git/manifest/双端入口后生成隔离动态入口', () => {
		const { host, moduleId } = fixture();
		const report = inspectPhoenixWebPlugins({ hostRoot: host });
		expect(report.plugins).toMatchObject([
			{ moduleId, state: 'inspected', runtimePolicy: 'module-runtime' }
		]);
		const virtual = phoenixPluginVirtualModules(report);
		expect(virtual.runtime).toContain(`/src/modules/${moduleId}/config.ts`);
		expect(virtual.routes).toContain(`/src/modules/${moduleId}/views/home.vue`);
	});

	it('品牌插件登录前不生成全局 runtime import，只保留登录后 route view', () => {
		const { host, moduleId } = fixture({ branding: true });
		const virtual = phoenixPluginVirtualModules(inspectPhoenixWebPlugins({ hostRoot: host }));
		expect(virtual.runtime).not.toContain(moduleId);
		expect(virtual.routes).toContain(`/src/modules/${moduleId}/views/home.vue`);
	});

	it('品牌插件声明 API 或 DDL 时在 Vite 展开前隔离', () => {
		const { host, moduleId, manifestFile, product } = fixture({ branding: true });
		const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
		manifest.capabilities = [
			{ id: 'unsafe', endpoints: [{ method: 'GET', path: '/admin/x' }] }
		];
		writeFileSync(manifestFile, JSON.stringify(manifest));
		execFileSync('git', ['add', '.'], { cwd: product });
		execFileSync(
			'git',
			[
				'-c',
				'user.name=Test',
				'-c',
				'user.email=test@example.invalid',
				'commit',
				'-qm',
				'unsafe'
			],
			{ cwd: product }
		);
		const report = inspectPhoenixWebPlugins({ hostRoot: host });
		expect(report.plugins[0]).toMatchObject({ state: 'quarantined' });
		expect(phoenixPluginVirtualModules(report).routes).not.toContain(moduleId);
	});

	it('dirty 开发挂载与普通正式目录均在 Vite 展开前隔离', () => {
		const dirty = fixture({ dirty: true });
		const dirtyReport = inspectPhoenixWebPlugins({ hostRoot: dirty.host });
		expect(dirtyReport.plugins[0]).toMatchObject({ state: 'quarantined' });
		expect(phoenixPluginVirtualModules(dirtyReport).runtime).not.toContain(dirty.moduleId);

		const root = mkdtempSync(path.join(os.tmpdir(), 'phoenix-web-release-'));
		roots.push(root);
		mkdirSync(path.join(root, 'src', 'modules', 'release-plugin'), { recursive: true });
		const release = inspectPhoenixWebPlugins({ hostRoot: root });
		expect(release.plugins[0]).toMatchObject({ state: 'quarantined' });
	});

	it('正式 Web payload 仅在激活收据与当前字节一致时生成动态入口', () => {
		const root = mkdtempSync(path.join(os.tmpdir(), 'phoenix-web-release-'));
		roots.push(root);
		const host = path.join(root, 'host');
		const moduleId = 'release-plugin';
		const moduleRoot = path.join(host, 'src', 'modules', moduleId);
		mkdirSync(path.join(moduleRoot, 'views'), { recursive: true });
		writeFileSync(path.join(moduleRoot, 'config.ts'), 'export default () => ({});\n');
		writeFileSync(
			path.join(moduleRoot, 'views', 'home.vue'),
			'<template><div>release</div></template>\n'
		);
		activateRelease(host, moduleId, moduleRoot);

		const ready = inspectPhoenixWebPlugins({ hostRoot: host });
		expect(ready.plugins[0]).toMatchObject({ state: 'inspected', moduleId });
		expect(phoenixPluginVirtualModules(ready).runtime).toContain(moduleId);

		writeFileSync(
			path.join(moduleRoot, 'config.ts'),
			'export default () => ({ tampered: true });\n'
		);
		const tampered = inspectPhoenixWebPlugins({ hostRoot: host });
		expect(tampered.plugins[0]).toMatchObject({ state: 'quarantined' });
		expect(phoenixPluginVirtualModules(tampered).runtime).not.toContain(moduleId);
	});

	it('正式品牌收据只开放登录后 route，不执行插件全局 runtime', () => {
		const root = mkdtempSync(path.join(os.tmpdir(), 'phoenix-web-brand-release-'));
		roots.push(root);
		const host = path.join(root, 'host');
		const moduleId = 'release-branding';
		const moduleRoot = path.join(host, 'src', 'modules', moduleId);
		mkdirSync(path.join(moduleRoot, 'views'), { recursive: true });
		writeFileSync(path.join(moduleRoot, 'config.ts'), 'export default () => ({});\n');
		writeFileSync(
			path.join(moduleRoot, 'views', 'home.vue'),
			'<template><div>brand home</div></template>\n'
		);
		activateRelease(host, moduleId, moduleRoot, 'phoenix.admin.branding');

		const report = inspectPhoenixWebPlugins({ hostRoot: host });
		expect(report.plugins[0]).toMatchObject({
			state: 'inspected',
			runtimePolicy: 'route-only'
		});
		const virtual = phoenixPluginVirtualModules(report);
		expect(virtual.runtime).not.toContain(moduleId);
		expect(virtual.routes).toContain(moduleId);
	});

	it('扫描期间卸载模块时只隔离该模块，不阻断纯 Host 启动', () => {
		const root = mkdtempSync(path.join(os.tmpdir(), 'phoenix-web-race-'));
		roots.push(root);
		const modulePath = path.join(root, 'src', 'modules', 'racing-plugin');
		mkdirSync(modulePath, { recursive: true });
		const report = inspectPhoenixWebPlugins({
			hostRoot: root,
			beforeInspectModule({ moduleId }) {
				if (moduleId === 'racing-plugin')
					rmSync(modulePath, { recursive: true, force: true });
			}
		});
		expect(report).toMatchObject({
			state: 'quarantined',
			plugins: [
				{
					moduleId: 'racing-plugin',
					state: 'quarantined',
					detail: expect.stringContaining('启动扫描期间发生变化')
				}
			]
		});
	});
});

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
	existsSync,
	lstatSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	realpathSync,
	renameSync,
	statSync,
	writeFileSync
} from 'node:fs';
import path from 'node:path';

const MODULE_ID_PATTERN = /^[a-z][a-z0-9-]{1,63}$/;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/;
const HOST_MODULE_IDS = new Set([
	'base',
	'demo',
	'dict',
	'helper',
	// `phoenix` is canonical; retain `pah` solely for frozen pre-rename fixtures.
	'pah',
	'phoenix',
	'recycle',
	'space',
	'task',
	'user'
]);

function sha256(value) {
	return createHash('sha256').update(value).digest('hex');
}

function inside(root, candidate) {
	const relative = path.relative(root, candidate);
	return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function realDirectory(value) {
	try {
		const resolved = realpathSync(value);
		return statSync(resolved).isDirectory() ? resolved : null;
	} catch {
		return null;
	}
}

function gitValue(root, args) {
	try {
		return execFileSync('git', args, {
			cwd: root,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
			timeout: 3000
		}).trim();
	} catch {
		return null;
	}
}

function listFiles(root, relative = '') {
	const files = [];
	for (const entry of readdirSync(path.join(root, relative), { withFileTypes: true }).sort(
		(a, b) => a.name.localeCompare(b.name, 'en')
	)) {
		const next = relative ? `${relative}/${entry.name}` : entry.name;
		const absolute = path.join(root, next);
		const current = lstatSync(absolute);
		if (current.isSymbolicLink()) throw new Error(`插件目录内部不得包含 symlink：${next}`);
		if (current.isDirectory()) files.push(...listFiles(root, next));
		else if (current.isFile()) files.push(next);
	}
	return files;
}

function runtimeFiles(moduleRoot) {
	return listFiles(moduleRoot).filter(
		file =>
			file === 'config.ts' || file.startsWith('service/') || file.startsWith('directives/')
	);
}

function routeFiles(moduleRoot) {
	return listFiles(moduleRoot).filter(
		file =>
			(file.startsWith('views/') || file.startsWith('pages/')) &&
			file.endsWith('.vue') &&
			!file.split('/').includes('components')
	);
}

function brandingContractIsHostSafe(manifest) {
	const login = manifest.uiContributions?.login;
	const brand = manifest.uiContributions?.brand;
	const assets = brand
		? [brand.logo, brand.logoDark, brand.compactLogo, brand.compactLogoDark, brand.favicon]
		: [];
	return (
		login?.mode === 'host-auth-shell' &&
		['split', 'centered', 'hero-image'].includes(login.presentation) &&
		assets.every(
			asset =>
				asset &&
				typeof asset.path === 'string' &&
				asset.path.startsWith(`vue/${manifest.moduleId}/assets/`) &&
				/^[a-f0-9]{64}$/.test(asset.sha256 || '') &&
				Number.isSafeInteger(asset.size) &&
				asset.size > 0
		) &&
		Array.isArray(manifest.migrations) &&
		manifest.migrations.length === 0 &&
		Array.isArray(manifest.healthChecks) &&
		manifest.healthChecks.length === 0 &&
		Array.isArray(manifest.dataOwnership?.tables) &&
		manifest.dataOwnership.tables.length === 0 &&
		Array.isArray(manifest.capabilities) &&
		manifest.capabilities.every(capability => capability.endpoints === undefined)
	);
}

function inspectDevelopmentPlugin(moduleId, modulePath) {
	const failure = detail => ({ moduleId, state: 'quarantined', detail });
	try {
		const webSource = realDirectory(modulePath);
		if (!webSource) return failure('Web symlink 目标不存在');
		const productRootValue = gitValue(webSource, ['rev-parse', '--show-toplevel']);
		const productRoot = productRootValue ? realDirectory(productRootValue) : null;
		if (!productRoot) return failure('开发挂载不属于可验证的 Git 产品仓');
		const sourceCommit = gitValue(productRoot, ['rev-parse', 'HEAD']);
		if (!sourceCommit || !COMMIT_PATTERN.test(sourceCommit))
			return failure('产品 HEAD 无法验证');

		const packageRoot = path.resolve(webSource, '..', '..');
		const manifestFile = path.join(packageRoot, 'manifest.json');
		const nodeSource = realDirectory(path.join(packageRoot, 'midway', moduleId));
		if (
			!inside(productRoot, packageRoot) ||
			!inside(productRoot, webSource) ||
			!nodeSource ||
			!inside(productRoot, nodeSource)
		) {
			return failure('开发挂载双端 payload 越出同一产品 Git 根');
		}
		const manifestBytes = readFileSync(manifestFile);
		const manifest = JSON.parse(manifestBytes.toString('utf8'));
		if (
			manifest?.formatVersion !== 2 ||
			manifest?.moduleId !== moduleId ||
			typeof manifest?.version !== 'string' ||
			manifest?.activationMode !== 'restart' ||
			manifest?.entrypoints?.web !== `vue/${moduleId}/config.ts` ||
			manifest?.entrypoints?.node !== `midway/${moduleId}/config.ts`
		) {
			return failure('manifest 身份、版本、激活方式或双端入口不匹配');
		}
		if (
			!existsSync(path.join(webSource, 'config.ts')) ||
			!existsSync(path.join(nodeSource, 'config.ts'))
		) {
			return failure('开发挂载缺少 Node/Vue config.ts 入口');
		}
		const relativePaths = [manifestFile, webSource, nodeSource].map(item =>
			path.relative(productRoot, item)
		);
		const dirty = gitValue(productRoot, ['status', '--porcelain', '--', ...relativePaths]);
		if (dirty === null || dirty.length > 0)
			return failure('manifest 或双端 payload 存在未归档修改');

		const pluginType = manifest.pluginType;
		if (pluginType !== undefined && pluginType !== 'phoenix.admin.branding') {
			return failure(`pluginType 不受支持：${String(pluginType)}`);
		}
		const isBranding = pluginType === 'phoenix.admin.branding';
		if (isBranding && !brandingContractIsHostSafe(manifest)) {
			return failure('品牌插件越出 Host 声明式登录壳边界');
		}
		const identity = sha256(
			JSON.stringify({
				sourceCommit,
				manifestSha256: sha256(manifestBytes),
				pluginType: pluginType || null
			})
		);
		return {
			moduleId,
			state: 'inspected',
			detail: isBranding
				? '品牌入口采用 route-only；登录前只消费 Host 安全快照'
				: '开发挂载身份与双端入口通过快速检查',
			pluginType,
			version: manifest.version,
			sourceCommit,
			sourceIdentitySha256: identity,
			webSource,
			runtimePolicy: isBranding ? 'route-only' : 'module-runtime',
			runtimeFiles: isBranding ? [] : runtimeFiles(webSource),
			routeFiles: routeFiles(webSource)
		};
	} catch (error) {
		return failure(
			`开发挂载快速检查失败：${error instanceof Error ? error.message : String(error)}`
		);
	}
}

function atomicWrite(file, value) {
	mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
	const temporary = `${file}.${process.pid}.tmp`;
	writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
	renameSync(temporary, file);
}

export function inspectPhoenixWebPlugins(options = {}) {
	const hostRoot = realpathSync(options.hostRoot ?? process.cwd());
	const modulesRoot = path.join(hostRoot, 'src', 'modules');
	const plugins = [];
	for (const moduleId of readdirSync(modulesRoot).sort()) {
		if (HOST_MODULE_IDS.has(moduleId) || !MODULE_ID_PATTERN.test(moduleId)) continue;
		const modulePath = path.join(modulesRoot, moduleId);
		let current;
		try {
			options.beforeInspectModule?.({ moduleId, modulePath });
			current = lstatSync(modulePath);
		} catch (error) {
			plugins.push({
				moduleId,
				state: 'quarantined',
				detail: `模块在启动扫描期间发生变化，已隔离：${
					error instanceof Error ? error.message : String(error)
				}`
			});
			continue;
		}
		if (current.isSymbolicLink()) plugins.push(inspectDevelopmentPlugin(moduleId, modulePath));
		else if (current.isDirectory()) {
			plugins.push({
				moduleId,
				state: 'quarantined',
				detail: '正式 Web payload 缺少启动前可信激活收据，默认隔离'
			});
		}
	}
	const branding = plugins.filter(
		plugin => plugin.state === 'inspected' && plugin.pluginType === 'phoenix.admin.branding'
	);
	if (branding.length > 1) {
		for (const plugin of branding) {
			plugin.state = 'quarantined';
			plugin.detail = '同时发现多个开发品牌插件，拒绝隐式选择';
			plugin.runtimeFiles = [];
			plugin.routeFiles = [];
		}
	}
	const report = {
		formatVersion: 1,
		checkedAt: new Date().toISOString(),
		state: plugins.some(plugin => plugin.state === 'quarantined') ? 'quarantined' : 'ready',
		plugins
	};
	atomicWrite(path.join(hostRoot, '.runtime', 'pah-plugin-health.web.json'), report);
	return report;
}

function importExpression(moduleId, relative) {
	return `/src/modules/${moduleId}/${relative}`;
}

export function phoenixPluginVirtualModules(report) {
	const inspected = report.plugins.filter(plugin => plugin.state === 'inspected');
	const runtimeItems = inspected
		.filter(plugin => plugin.runtimePolicy === 'module-runtime')
		.map((plugin, index) => {
			const imports = plugin.runtimeFiles
				.map(
					(file, fileIndex) =>
						`import(${JSON.stringify(importExpression(plugin.moduleId, file))}).then(m=>[${JSON.stringify(
							importExpression(plugin.moduleId, file)
						)},m.default],e=>{throw new Error(${JSON.stringify(file)}+': '+(e&&e.message||e))})`
				)
				.join(',');
			return `{moduleId:${JSON.stringify(plugin.moduleId)},version:${JSON.stringify(
				plugin.version
			)},load:()=>Promise.all([${imports}])}`;
		});
	const routeItems = inspected.flatMap(plugin =>
		plugin.routeFiles.map(
			file =>
				`${JSON.stringify(importExpression(plugin.moduleId, file))}:()=>import(${JSON.stringify(
					importExpression(plugin.moduleId, file)
				)})`
		)
	);
	return {
		runtime: `export default [${runtimeItems.join(',')}];`,
		routes: `export default {${routeItems.join(',')}};`
	};
}

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const PAH_REQUIRED_WING_EXPORTS = [
	'PnwPageLayout',
	'pnwCreateViewDialogHost',
	'pnwProvideViewDialogHost',
	'pnwProvideViewPresentationContext'
];

function pahReadJson(filePath) {
	return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function pahExpectedWingVersion(adminRoot) {
	const manifestPath = path.join(adminRoot, 'package.json');
	const manifest = pahReadJson(manifestPath);
	const expected = manifest.dependencies?.['phoenix-wing'];

	if (typeof expected !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(expected)) {
		throw new Error(`Admin 必须精确锁定 phoenix-wing Registry 版本：${expected || '未声明'}`);
	}

	return expected;
}

export function pahAssertWingVersionAlignment(expected, actual, source) {
	if (actual !== expected) {
		throw new Error(
			`Phoenix Wing 版本未对齐：Admin=${expected}，${source}=${actual || '未知'}；请重新安装依赖或切换正确的 Wing 源码`
		);
	}
}

export function pahExecutableForPlatform(command, platform = process.platform) {
	return platform === 'win32' && command === 'pnpm' ? 'pnpm.cmd' : command;
}

function pahGitOutput(worktreeRoot, args) {
	return execFileSync('git', args, {
		cwd: worktreeRoot,
		encoding: 'utf8'
	}).trim();
}

export function pahResolveLocalWing(worktreeRoot, env = process.env) {
	const checkoutRoot = pahGitOutput(worktreeRoot, ['rev-parse', '--show-toplevel']);
	const commonGitDirectory = path.resolve(
		checkoutRoot,
		pahGitOutput(worktreeRoot, ['rev-parse', '--git-common-dir'])
	);
	const canonicalAdminRoot = path.dirname(commonGitDirectory);
	const wingRoot = path.resolve(
		env.PHOENIX_WING_ROOT || path.join(canonicalAdminRoot, '..', 'phoenix-wing')
	);
	const manifestPath = path.join(wingRoot, 'package.json');

	if (path.basename(canonicalAdminRoot) !== 'phoenix-admin-vue') {
		throw new Error(`Admin 标准仓库目录必须为 phoenix-admin-vue：${canonicalAdminRoot}`);
	}
	if (path.basename(wingRoot) !== 'phoenix-wing' || !fs.existsSync(manifestPath)) {
		throw new Error(`本地 Wing 必须位于 Admin 标准并列目录 ../phoenix-wing：${wingRoot}`);
	}

	const manifest = pahReadJson(manifestPath);
	const expectedVersion = pahExpectedWingVersion(canonicalAdminRoot);
	pahAssertWingVersionAlignment(expectedVersion, manifest.version, '本地源码');
	const commit = pahGitOutput(wingRoot, ['rev-parse', 'HEAD']);

	return {
		worktreeRoot,
		checkoutRoot,
		canonicalAdminRoot,
		root: wingRoot,
		expectedVersion,
		version: manifest.version,
		commit
	};
}

export function pahResolveRegistryWing(adminRoot) {
	const expectedVersion = pahExpectedWingVersion(adminRoot);
	const packageRoot = path.join(adminRoot, 'node_modules', 'phoenix-wing');
	const manifestPath = path.join(packageRoot, 'package.json');
	const entryPath = path.join(packageRoot, 'dist', 'index.js');
	const declarationPath = path.join(packageRoot, 'dist', 'index.d.ts');

	if (!fs.existsSync(manifestPath)) {
		throw new Error(
			`未安装 phoenix-wing@${expectedVersion}；请执行 pnpm install --frozen-lockfile`
		);
	}

	const manifest = pahReadJson(manifestPath);
	pahAssertWingVersionAlignment(expectedVersion, manifest.version, 'node_modules');

	if (!fs.existsSync(entryPath) || !fs.existsSync(declarationPath)) {
		throw new Error(`phoenix-wing@${expectedVersion} 发布制品不完整；请重新安装依赖`);
	}

	const declarations = fs.readFileSync(declarationPath, 'utf8');
	const missingExports = PAH_REQUIRED_WING_EXPORTS.filter(name => !declarations.includes(name));
	if (missingExports.length > 0) {
		throw new Error(
			`phoenix-wing@${expectedVersion} 缺少 Admin 启动所需 API：${missingExports.join(', ')}`
		);
	}

	return {
		root: fs.realpathSync(packageRoot),
		expectedVersion,
		version: manifest.version,
		entryPath: fs.realpathSync(entryPath)
	};
}

export function pahLocalWingAliases(env = process.env) {
	if (env.PHOENIX_WING_MODE !== 'local') return [];

	const wingRoot = env.PHOENIX_WING_ROOT;
	if (!wingRoot) {
		throw new Error('PHOENIX_WING_MODE=local 时必须设置 PHOENIX_WING_ROOT');
	}

	const distRoot = path.join(wingRoot, 'dist');
	return [
		{ find: /^phoenix-wing$/u, replacement: path.join(distRoot, 'index.js') },
		{ find: /^phoenix-wing\/style\.css$/u, replacement: path.join(distRoot, 'style.css') },
		{
			find: /^phoenix-wing\/fixtures\/(.+)$/u,
			replacement: path.join(wingRoot, 'fixtures', '$1')
		},
		{ find: /^phoenix-wing\/(.+)\.vue$/u, replacement: path.join(distRoot, '$1.js') },
		{ find: /^phoenix-wing\/(.+)$/u, replacement: path.join(distRoot, '$1.js') }
	];
}

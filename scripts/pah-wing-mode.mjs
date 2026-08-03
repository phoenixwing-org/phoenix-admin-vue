import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const PAH_LOCAL_WING_VERSION = '0.6.2';
export const PAH_LOCAL_WING_COMMIT = 'dbdd70d4a95a2771b41fbec9ae17f979715ff076';

function pahGitOutput(worktreeRoot, args) {
	return execFileSync('git', args, {
		cwd: worktreeRoot,
		encoding: 'utf8'
	}).trim();
}

export function pahResolveLocalWing(worktreeRoot, env = process.env) {
	const canonicalAdminRoot = pahGitOutput(worktreeRoot, ['rev-parse', '--show-toplevel']);
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

	const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
	if (manifest.name !== 'phoenix-wing') {
		throw new Error(`PHOENIX_WING_ROOT 不是 phoenix-wing 仓库：${wingRoot}`);
	}
	if (manifest.version !== PAH_LOCAL_WING_VERSION) {
		throw new Error(
			`Admin 本地联调只接受 Wing ${PAH_LOCAL_WING_VERSION}，实际为 ${manifest.version}`
		);
	}

	const commit = pahGitOutput(wingRoot, ['rev-parse', 'HEAD']);
	if (commit !== PAH_LOCAL_WING_COMMIT) {
		throw new Error(
			`Admin 本地联调只接受 Wing 候选 ${PAH_LOCAL_WING_COMMIT}，实际为 ${commit}`
		);
	}

	return {
		worktreeRoot,
		canonicalAdminRoot,
		root: wingRoot,
		version: manifest.version,
		commit
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

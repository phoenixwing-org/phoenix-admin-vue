import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pahResolveLocalWing } from './pah-wing-mode.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const worktreeRoot = path.resolve(scriptDirectory, '..');
const separator = process.argv.indexOf('--');
const checkOnly = process.argv.includes('--check');
const wing = pahResolveLocalWing(worktreeRoot);

console.log(`[Wing][LOCAL] ${wing.root} (${wing.version}@${wing.commit.slice(0, 12)})`);

function run(command, args, options = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, { stdio: 'inherit', ...options });
		child.on('error', reject);
		child.on('exit', (code, signal) => {
			if (signal) reject(new Error(`${command} 被信号 ${signal} 中止`));
			else if (code === 0) resolve();
			else reject(new Error(`${command} 退出码 ${code}`));
		});
	});
}

try {
	if (checkOnly) process.exit(0);
	if (separator < 0 || !process.argv[separator + 1]) {
		throw new Error(
			'用法：node scripts/run-with-phoenix-wing.mjs [--check] -- <command> [...args]'
		);
	}

	await run('pnpm', ['build'], { cwd: wing.root, env: process.env });

	const command = process.argv[separator + 1];
	const args = process.argv.slice(separator + 2);
	await run(command, args, {
		cwd: worktreeRoot,
		env: {
			...process.env,
			PHOENIX_WING_MODE: 'local',
			PHOENIX_WING_ROOT: wing.root
		}
	});
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
}

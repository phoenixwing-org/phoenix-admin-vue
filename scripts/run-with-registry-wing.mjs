import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pahExecutableForPlatform, pahResolveRegistryWing } from './pah-wing-mode.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const adminRoot = path.resolve(scriptDirectory, '..');
const separator = process.argv.indexOf('--');
const checkOnly = process.argv.includes('--check');

function run(command, args, options = {}) {
	return new Promise((resolve, reject) => {
		const executable = pahExecutableForPlatform(command);
		const child = spawn(executable, args, { stdio: 'inherit', ...options });
		child.on('error', reject);
		child.on('exit', (code, signal) => {
			if (signal) reject(new Error(`${executable} 被信号 ${signal} 中止`));
			else if (code === 0) resolve();
			else reject(new Error(`${executable} 退出码 ${code}`));
		});
	});
}

try {
	const wing = pahResolveRegistryWing(adminRoot);
	console.log(`[Wing][REGISTRY] ${wing.version} (${wing.entryPath})`);

	if (!checkOnly) {
		if (separator < 0 || !process.argv[separator + 1]) {
			throw new Error(
				'用法：node scripts/run-with-registry-wing.mjs [--check] -- <command> [...args]'
			);
		}

		const command = process.argv[separator + 1];
		const args = process.argv.slice(separator + 2);
		await run(command, args, { cwd: adminRoot, env: process.env });
	}
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
}

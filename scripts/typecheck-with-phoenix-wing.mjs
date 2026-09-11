import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import ts from 'typescript';
import { pahExecutableForPlatform, pahResolveLocalWing } from './pah-wing-mode.mjs';

const adminRoot = path.resolve(import.meta.dirname, '..');
const projectArgumentIndex = process.argv.indexOf('--project');
const projectPath = path.resolve(
	projectArgumentIndex >= 0 && process.argv[projectArgumentIndex + 1]
		? process.argv[projectArgumentIndex + 1]
		: path.join(adminRoot, 'tsconfig.json')
);
const buildMode = process.argv.includes('--build');
const wing = pahResolveLocalWing(adminRoot);

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

function absolutePathMappings(configPath) {
	const readResult = ts.readConfigFile(configPath, ts.sys.readFile);
	if (readResult.error) {
		throw new Error(ts.flattenDiagnosticMessageText(readResult.error.messageText, '\n'));
	}

	const parsed = ts.parseJsonConfigFileContent(
		readResult.config,
		ts.sys,
		path.dirname(configPath)
	);
	const pathsBase =
		parsed.options.pathsBasePath || parsed.options.baseUrl || path.dirname(configPath);
	return Object.fromEntries(
		Object.entries(parsed.options.paths || {}).map(([name, targets]) => [
			name,
			targets.map(target =>
				path.isAbsolute(target) ? target : path.resolve(pathsBase, target)
			)
		])
	);
}

// vue-tsc 会相对入口 tsconfig 解析 compilerOptions.types。临时配置文件直接
// 留在 Admin 根目录，既复用 Host 的相对类型入口，也会在命令结束时精确删除。
const generatedConfigPath = path.join(adminRoot, `.tsconfig.wing-local-${process.pid}.json`);
const distRoot = path.join(wing.root, 'dist');

try {
	await run('pnpm', ['build'], { cwd: wing.root, env: process.env });

	const paths = {
		...absolutePathMappings(projectPath),
		vue: [path.join(adminRoot, 'node_modules', 'vue')],
		'vue-router': [path.join(adminRoot, 'node_modules', 'vue-router')],
		pinia: [path.join(adminRoot, 'node_modules', 'pinia')],
		'element-plus': [path.join(adminRoot, 'node_modules', 'element-plus')],
		'@element-plus/icons-vue': [
			path.join(adminRoot, 'node_modules', '@element-plus', 'icons-vue')
		],
		'phoenix-wing': [path.join(distRoot, 'index.d.ts')],
		'phoenix-wing/components/*.vue': [path.join(distRoot, 'components', '*.vue.d.ts')],
		'phoenix-wing/layout/*.vue': [path.join(distRoot, 'layout', '*.vue.d.ts')],
		'phoenix-wing/*': [path.join(distRoot, '*')]
	};

	fs.writeFileSync(
		generatedConfigPath,
		`${JSON.stringify(
			{
				extends: projectPath,
				compilerOptions: {
					baseUrl: path.dirname(projectPath),
					paths
				}
			},
			null,
			2
		)}\n`,
		{ flag: 'wx' }
	);

	console.log(
		`[Wing][LOCAL][types] ${wing.root} (${wing.version}@${wing.commit.slice(0, 12)}) -> ${projectPath}`
	);
	const argumentsForVueTsc = buildMode
		? ['exec', 'vue-tsc', '--build', generatedConfigPath, '--force']
		: ['exec', 'vue-tsc', '-p', generatedConfigPath, '--noEmit', '--pretty', 'false'];
	await run('pnpm', argumentsForVueTsc, { cwd: adminRoot, env: process.env });
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
} finally {
	fs.rmSync(generatedConfigPath, { force: true });
}

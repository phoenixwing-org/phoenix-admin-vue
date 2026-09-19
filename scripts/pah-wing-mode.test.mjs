import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
	pahAssertWingVersionAlignment,
	pahAssertLocalWingCompatibility,
	pahExecutableForPlatform,
	pahResolveRegistryWing
} from './pah-wing-mode.mjs';

const temporaryRoots = [];

function createRegistryFixture({ expected = '0.7.2', actual = expected, declarations = '' } = {}) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phoenix-admin-wing-'));
	temporaryRoots.push(root);
	const wingRoot = path.join(root, 'node_modules', 'phoenix-wing');
	fs.mkdirSync(path.join(wingRoot, 'dist'), { recursive: true });
	fs.writeFileSync(
		path.join(root, 'package.json'),
		JSON.stringify({ dependencies: { 'phoenix-wing': expected } })
	);
	fs.writeFileSync(path.join(wingRoot, 'package.json'), JSON.stringify({ version: actual }));
	fs.writeFileSync(path.join(wingRoot, 'dist', 'index.js'), 'export {};\n');
	fs.writeFileSync(
		path.join(wingRoot, 'dist', 'index.d.ts'),
		declarations ||
			'export { PnwPageLayout, pnwCreateViewDialogHost, pnwProvideViewDialogHost, pnwProvideViewPresentationContext };\n'
	);
	return root;
}

afterEach(() => {
	for (const root of temporaryRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe('Phoenix Wing 开发启动对齐', () => {
	it('接受精确 Registry 0.7.2 制品及登录启动 API', () => {
		const resolved = pahResolveRegistryWing(createRegistryFixture());
		expect(resolved.version).toBe('0.7.2');
		expect(resolved.expectedVersion).toBe('0.7.2');
	});

	it('node_modules 版本落后时在 Vite 启动前失败', () => {
		expect(() => pahResolveRegistryWing(createRegistryFixture({ actual: '0.7.1' }))).toThrow(
			'Phoenix Wing 版本未对齐'
		);
	});

	it('发布制品缺少登录启动 API 时失败', () => {
		expect(() =>
			pahResolveRegistryWing(createRegistryFixture({ declarations: 'export {};\n' }))
		).toThrow('缺少 Admin 启动所需 API');
	});

	it('本地源码允许同一开发线上的更高 patch', () => {
		expect(() => pahAssertLocalWingCompatibility('0.7.2', '0.7.4')).not.toThrow();
		expect(() => pahAssertLocalWingCompatibility('0.7.2', '0.7.1')).toThrow('不兼容');
		expect(() => pahAssertLocalWingCompatibility('0.7.2', '0.8.0')).toThrow('不兼容');
	});

	it('Windows 使用 pnpm.cmd，其他平台保持 pnpm', () => {
		expect(pahExecutableForPlatform('pnpm', 'win32')).toBe('pnpm.cmd');
		expect(pahExecutableForPlatform('pnpm', 'darwin')).toBe('pnpm');
	});
});

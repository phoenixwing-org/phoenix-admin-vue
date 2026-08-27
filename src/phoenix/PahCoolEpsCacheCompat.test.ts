import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
	coolEpsCountLegacyPublicLoginBrandingRoutes,
	migrateLegacyPublicLoginBrandingEpsCache
} from '../../scripts/cool-eps-cache-compat.mjs';

const temporaryDirectories: string[] = [];

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) {
		fs.rmSync(directory, { force: true, recursive: true });
	}
});

describe('Cool EPS cache compatibility', () => {
	it('只迁移 Host 公开品牌 GET 旧路由并保持其他 .js 路由不变', () => {
		const cache = [
			{
				prefix: '/admin/base/open',
				api: [
					{ method: 'get', path: '/public-login-branding.js' },
					{ method: 'post', path: '/public-login-branding.js' },
					{ method: 'get', path: '/other-script.js' }
				]
			},
			{
				prefix: '/admin/other/open',
				api: [{ method: 'get', path: '/public-login-branding.js' }]
			}
		];
		const cachePath = writeCache(cache);

		expect(migrateLegacyPublicLoginBrandingEpsCache(cachePath)).toEqual({
			status: 'migrated',
			migrated: 1
		});

		const migrated = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
		expect(migrated[0].api).toEqual([
			{ method: 'get', path: '/public-login-branding' },
			{ method: 'post', path: '/public-login-branding.js' },
			{ method: 'get', path: '/other-script.js' }
		]);
		expect(migrated[1].api[0].path).toBe('/public-login-branding.js');
		expect(coolEpsCountLegacyPublicLoginBrandingRoutes(migrated)).toBe(0);
	});

	it('重复启动保持缓存字节稳定，缺失缓存安全跳过', () => {
		const cachePath = writeCache([
			{
				prefix: '/admin/base/open',
				api: [{ method: 'get', path: '/public-login-branding.js' }]
			}
		]);
		migrateLegacyPublicLoginBrandingEpsCache(cachePath);
		const first = fs.readFileSync(cachePath);

		expect(migrateLegacyPublicLoginBrandingEpsCache(cachePath)).toEqual({
			status: 'unchanged',
			migrated: 0
		});
		expect(fs.readFileSync(cachePath)).toEqual(first);
		expect(migrateLegacyPublicLoginBrandingEpsCache(`${cachePath}.missing`)).toEqual({
			status: 'missing',
			migrated: 0
		});
	});

	it('无效 JSON 与非数组缓存直接报错，不吞掉异常', () => {
		const invalidJsonPath = writeRaw('{');
		expect(() => migrateLegacyPublicLoginBrandingEpsCache(invalidJsonPath)).toThrow(
			SyntaxError
		);

		const invalidShapePath = writeRaw('{}');
		expect(() => migrateLegacyPublicLoginBrandingEpsCache(invalidShapePath)).toThrow(
			'Cool EPS cache must be an array'
		);
	});

	it('Vite 配置在 cool 插件初始化前执行兼容迁移', () => {
		const source = fs.readFileSync(new URL('../../vite.config.ts', import.meta.url), 'utf8');
		expect(source.indexOf('migrateLegacyPublicLoginBrandingEpsCache(')).toBeGreaterThan(0);
		expect(source.indexOf('migrateLegacyPublicLoginBrandingEpsCache(')).toBeLessThan(
			source.indexOf('cool({')
		);
	});
});

function writeCache(value: unknown) {
	return writeRaw(JSON.stringify(value));
}

function writeRaw(value: string) {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cool-eps-cache-compat-'));
	temporaryDirectories.push(directory);
	const cachePath = path.join(directory, 'eps.json');
	fs.writeFileSync(cachePath, value);
	return cachePath;
}

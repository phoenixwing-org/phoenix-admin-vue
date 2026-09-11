import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { RouteLocationNormalized } from 'vue-router';
import type { PahPublicLoginBrandingSnapshotV1 } from './PahPublicLoginBranding';
import {
	applyPahRouteDocumentTitle,
	pahRouteDocumentTitle,
	type PahRouteTitleInput
} from './PahRouteDocumentTitle';

function snapshot(
	overrides: Partial<PahPublicLoginBrandingSnapshotV1> = {}
): PahPublicLoginBrandingSnapshotV1 {
	const asset = {
		url: '/favicon.svg',
		sha256: 'a'.repeat(64),
		mime: 'image/svg+xml' as const,
		size: 120
	};
	return {
		schemaVersion: 1,
		revision: 'b'.repeat(64),
		mode: 'host-default',
		plugin: null,
		appName: 'Phoenix Admin',
		titleTemplate: '%s · Phoenix Admin',
		favicon: asset,
		login: {
			eyebrow: 'PHOENIX ADMIN HOST',
			title: 'Phoenix Admin',
			subtitle: '安全管理工作区',
			prompt: '登录 Phoenix Admin Host。',
			presentation: 'split'
		},
		assets: {
			logo: asset,
			logoDark: asset,
			compactLogo: asset,
			compactLogoDark: asset
		},
		...overrides
	};
}

function route(value: Partial<PahRouteTitleInput>): PahRouteTitleInput {
	return {
		path: '/',
		name: undefined,
		meta: {},
		...value
	} as Pick<RouteLocationNormalized, 'path' | 'name' | 'meta'>;
}

describe('Host 路由浏览器标题', () => {
	it('在路由导航完成后挂接 Host 标题同步', () => {
		const routerSource = readFileSync(
			fileURLToPath(new URL('../cool/router/index.ts', import.meta.url)),
			'utf8'
		);
		expect(routerSource).toMatch(
			/router\.afterEach\(\(to, _from, failure\) => \{[\s\S]*if \(failure\) return;[\s\S]*applyPahRouteDocumentTitle\(to, branding\);[\s\S]*\}\);/
		);
	});

	it('在 Host 默认品牌下从登录页同步到首页', () => {
		const branding = snapshot();
		const target = { title: '' };

		applyPahRouteDocumentTitle(route({ path: '/login', name: 'login' }), branding, target);
		expect(target.title).toBe('登录 · Phoenix Admin');

		applyPahRouteDocumentTitle(route({ path: '/', name: 'home' }), branding, target);
		expect(target.title).toBe('首页 · Phoenix Admin');
	});

	it('使用 Acme 标题模板同步首页和普通页面', () => {
		const branding = snapshot({
			mode: 'plugin',
			plugin: {
				moduleId: 'phoenix-branding',
				version: '0.1.0',
				packageSha256: 'c'.repeat(64)
			},
			appName: 'Acme Workspace',
			titleTemplate: '%s · Acme Workspace'
		});

		const target = { title: '' };

		applyPahRouteDocumentTitle(route({ path: '/', meta: { isHome: true } }), branding, target);
		expect(target.title).toBe('首页 · Acme Workspace');

		applyPahRouteDocumentTitle(
			route({ path: '/sys/user', meta: { label: '用户管理' } }),
			branding,
			target
		);
		expect(target.title).toBe('用户管理 · Acme Workspace');
	});

	it('缺失或不安全的页面 label 回退应用名', () => {
		const branding = snapshot();
		expect(pahRouteDocumentTitle(route({ path: '/unknown' }), branding)).toBe('Phoenix Admin');
		expect(
			pahRouteDocumentTitle(
				route({ path: '/unsafe', meta: { label: '<img src=x onerror=alert(1)>' } }),
				branding
			)
		).toBe('Phoenix Admin');
		expect(
			pahRouteDocumentTitle(
				route({ path: '/invalid', meta: { label: { text: 'bad' } } }),
				branding
			)
		).toBe('Phoenix Admin');
	});
});

import { describe, expect, it } from 'vitest';
import type {
	PahPublicLoginBrandingSnapshotV1,
	PahPublicLoginBrandingSnapshotV2
} from './PahPublicLoginBranding';
import { pahResolveWorkbenchBrand, pahWorkbenchBrandLogo } from './PahWorkbenchBrand';

function asset(name: string) {
	return {
		url: `/dev/admin/base/open/public-login-branding/assets/${'a'.repeat(64)}/${name}.svg`,
		sha256: 'a'.repeat(64),
		mime: 'image/svg+xml' as const,
		size: 128
	};
}

function snapshot(mode: 'host-default' | 'plugin'): PahPublicLoginBrandingSnapshotV1 {
	return {
		schemaVersion: 1,
		revision: 'b'.repeat(64),
		mode,
		plugin:
			mode === 'plugin'
				? { moduleId: 'phoenix-branding', version: '0.1.0', packageSha256: 'c'.repeat(64) }
				: null,
		appName: mode === 'plugin' ? 'Acme Workspace' : 'Phoenix Admin',
		titleTemplate: `%s · ${mode === 'plugin' ? 'Acme Workspace' : 'Phoenix Admin'}`,
		favicon: asset('favicon'),
		login: {
			eyebrow: 'Workspace',
			title: '安全登录',
			subtitle: mode === 'plugin' ? '统一工作区' : 'Host 登录',
			prompt: '使用管理员分配的账号登录。',
			presentation: 'split'
		},
		assets: {
			logo: asset('logo'),
			logoDark: asset('logo-dark'),
			compactLogo: asset('logo-compact'),
			compactLogoDark: asset('logo-compact-dark')
		}
	};
}

function snapshotV2(
	subtitle: PahPublicLoginBrandingSnapshotV2['workbench']['subtitle']
): PahPublicLoginBrandingSnapshotV2 {
	return {
		...snapshot('host-default'),
		schemaVersion: 2,
		workbench: {
			title: '自定义工作台',
			subtitle,
			logo: asset('workbench'),
			logoDark: asset('workbench-dark')
		}
	};
}

describe('工作台静态品牌投影', () => {
	it('纯 Host 使用当前 Web 地址且不复用登录文案', () => {
		const brand = pahResolveWorkbenchBrand(snapshot('host-default'), 'http://127.0.0.1:9400');
		expect(brand.title).toBe('Phoenix Admin');
		expect(brand.subtitle).toBe('http://127.0.0.1:9400');
	});

	it('活动品牌整套复用 appName、插件副标题与明暗 compact Logo', () => {
		const brand = pahResolveWorkbenchBrand(snapshot('plugin'), 'http://127.0.0.1:9400');
		expect(brand.title).toBe('Acme Workspace');
		expect(brand.subtitle).toBe('统一工作区');
		expect(pahWorkbenchBrandLogo(brand, 'light').url).toContain('logo-compact.svg');
		expect(pahWorkbenchBrandLogo(brand, 'dark').url).toContain('logo-compact-dark.svg');
	});

	it('v2 严格使用工作台字段，并按配置解析固定文字或 Web 地址', () => {
		const textBrand = pahResolveWorkbenchBrand(
			snapshotV2({ mode: 'text', text: '母版管理 · 开发原型' }),
			'http://127.0.0.1:9400'
		);
		expect(textBrand).toMatchObject({
			title: '自定义工作台',
			subtitle: '母版管理 · 开发原型'
		});
		expect(textBrand.logo.url).toContain('workbench.svg');

		const originBrand = pahResolveWorkbenchBrand(
			snapshotV2({ mode: 'web-origin' }),
			'http://127.0.0.1:9400'
		);
		expect(originBrand.subtitle).toBe('http://127.0.0.1:9400');
	});
});

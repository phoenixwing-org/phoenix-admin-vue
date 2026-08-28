import { describe, expect, it } from 'vitest';
import {
	isPahPublicLoginBrandingSnapshot,
	pahPublicLoginTitle,
	type PahPublicLoginBrandingSnapshotV1,
	type PahPublicLoginBrandingSnapshotV2
} from './PahPublicLoginBranding';

function snapshot(): PahPublicLoginBrandingSnapshotV1 {
	const asset = {
		url: `/dev/admin/base/open/public-login-branding/assets/${'a'.repeat(64)}/logo.svg`,
		sha256: 'a'.repeat(64),
		mime: 'image/svg+xml' as const,
		size: 120
	};
	return {
		schemaVersion: 1,
		revision: 'b'.repeat(64),
		mode: 'plugin',
		plugin: {
			moduleId: 'phoenix-branding',
			version: '0.1.0',
			packageSha256: 'c'.repeat(64)
		},
		appName: 'Acme Workspace',
		titleTemplate: '%s · Acme Workspace',
		favicon: asset,
		login: {
			eyebrow: 'ACME OPERATIONS',
			title: 'Acme Workspace',
			subtitle: '统一工作区',
			prompt: '使用管理员分配的账号安全登录。',
			presentation: 'split'
		},
		assets: {
			logo: asset,
			logoDark: asset,
			compactLogo: asset,
			compactLogoDark: asset
		}
	};
}

function snapshotV2(): PahPublicLoginBrandingSnapshotV2 {
	const legacy = snapshot();
	return {
		...legacy,
		schemaVersion: 2,
		workbench: {
			title: 'Acme Workspace',
			subtitle: { mode: 'text', text: '统一工作区' },
			logo: legacy.assets.compactLogo,
			logoDark: legacy.assets.compactLogoDark
		}
	};
}

describe('Public Login Branding 浏览器契约', () => {
	it('接受严格白名单的同源哈希资源并生成品牌标题', () => {
		const value = snapshot();
		expect(isPahPublicLoginBrandingSnapshot(value)).toBe(true);
		expect(pahPublicLoginTitle(value)).toBe('登录 · Acme Workspace');
	});

	it('拒绝外部 URL、MIME 扩展名错配和额外字段', () => {
		const external = snapshot();
		external.assets.logo = { ...external.assets.logo, url: 'https://example.com/logo.svg' };
		expect(isPahPublicLoginBrandingSnapshot(external)).toBe(false);

		const wrongMime = snapshot();
		wrongMime.favicon = { ...wrongMime.favicon, mime: 'image/png' };
		expect(isPahPublicLoginBrandingSnapshot(wrongMime)).toBe(false);

		const wrongDigestPath = snapshot();
		wrongDigestPath.assets.logo = {
			...wrongDigestPath.assets.logo,
			url: `/dev/admin/base/open/public-login-branding/assets/${'d'.repeat(64)}/logo.svg`
		};
		expect(isPahPublicLoginBrandingSnapshot(wrongDigestPath)).toBe(false);

		const extra = { ...snapshot(), html: '<h1>unsafe</h1>' };
		expect(isPahPublicLoginBrandingSnapshot(extra)).toBe(false);
	});

	it('接受严格工作台字段的 v2，并拒绝缺失或额外字段', () => {
		expect(isPahPublicLoginBrandingSnapshot(snapshotV2())).toBe(true);

		const missing = snapshotV2() as any;
		delete missing.workbench.logo;
		expect(isPahPublicLoginBrandingSnapshot(missing)).toBe(false);

		const extra = snapshotV2() as any;
		extra.workbench.html = '<strong>unsafe</strong>';
		expect(isPahPublicLoginBrandingSnapshot(extra)).toBe(false);
	});
});

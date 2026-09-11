import { describe, expect, it } from 'vitest';
import type { PahPublicLoginBrandingSnapshotV2 } from './PahPublicLoginBranding';
import { pahResolveWorkbenchBrand } from './PahWorkbenchBrand';
import { pahCheckBrandingRuntime } from './PahWorkbenchBrandRuntime';

function asset(name: string) {
	return {
		url: `/dev/admin/base/open/public-login-branding/assets/${'a'.repeat(64)}/${name}.svg`,
		sha256: 'a'.repeat(64),
		mime: 'image/svg+xml' as const,
		size: 128
	};
}

function fixture(): PahPublicLoginBrandingSnapshotV2 {
	return {
		schemaVersion: 2,
		revision: 'b'.repeat(64),
		mode: 'host-default',
		plugin: null,
		appName: 'XYL',
		titleTemplate: '%s · XYL',
		favicon: asset('host'),
		login: {
			eyebrow: 'PHOENIXWING OPEN SOURCE',
			title: 'XYL',
			subtitle: '内部运营',
			prompt: '登录 XYL，继续管理您的工作区。',
			presentation: 'split'
		},
		assets: {
			logo: asset('host'),
			logoDark: asset('host-dark'),
			compactLogo: asset('host'),
			compactLogoDark: asset('host-dark')
		},
		workbench: {
			title: 'XYL',
			subtitle: { mode: 'text', text: '内部运营' },
			logo: asset('host'),
			logoDark: asset('host-dark')
		}
	};
}

describe('工作台品牌运行时点检', () => {
	it('用纯数据点检快照、标题、favicon、工作台与来源并生成输出日志', () => {
		const snapshot = fixture();
		const endpoint = 'http://127.0.0.1:9400/dev/admin/base/open/public-login-branding';
		const result = pahCheckBrandingRuntime({
			status: {
				config: {
					revision: 'c'.repeat(64),
					title: 'XYL',
					subtitle: { mode: 'text', text: '内部运营' },
					logo: asset('host'),
					logoDark: asset('host-dark')
				},
				activeSnapshot: snapshot
			},
			workbenchBrand: pahResolveWorkbenchBrand(snapshot, 'http://127.0.0.1:9400'),
			webOrigin: 'http://127.0.0.1:9400',
			documentTitle: '工作台品牌 · XYL',
			faviconHref: new URL(snapshot.favicon.url, endpoint).href,
			publicBrandingEndpoint: endpoint
		});
		expect(result.ok).toBe(true);
		expect(result.message).toBe('[Runtime] XYL 工作台品牌已就绪');
		expect(result.items).toHaveLength(5);
	});

	it.each([
		['浏览器标题', { documentTitle: '登录 · Phoenix Admin' }, 'VUE-HEAD-01'],
		['favicon', { faviconHref: 'http://127.0.0.1:9400/favicon.svg' }, 'FIELD-FAVICON-01']
	])('%s 不一致时返回稳定测试编号', (_label, override, expectedId) => {
		const snapshot = fixture();
		const endpoint = 'http://127.0.0.1:9400/dev/admin/base/open/public-login-branding';
		const input = {
			status: {
				config: {
					revision: 'c'.repeat(64),
					title: 'XYL',
					subtitle: { mode: 'text' as const, text: '内部运营' },
					logo: asset('host'),
					logoDark: asset('host-dark')
				},
				activeSnapshot: snapshot
			},
			workbenchBrand: pahResolveWorkbenchBrand(snapshot, 'http://127.0.0.1:9400'),
			webOrigin: 'http://127.0.0.1:9400',
			documentTitle: '工作台品牌 · XYL',
			faviconHref: new URL(snapshot.favicon.url, endpoint).href,
			publicBrandingEndpoint: endpoint,
			...override
		};
		const result = pahCheckBrandingRuntime(input);
		expect(result.ok).toBe(false);
		expect(result.items.find(item => item.id === expectedId)?.ok).toBe(false);
	});

	it('损坏的活动快照会明确报告 schema 点检失败', () => {
		const snapshot = fixture();
		(snapshot as any).schemaVersion = 99;
		const endpoint = 'http://127.0.0.1:9400/dev/admin/base/open/public-login-branding';
		const result = pahCheckBrandingRuntime({
			status: {
				config: {
					revision: 'c'.repeat(64),
					title: 'XYL',
					subtitle: { mode: 'text', text: '内部运营' },
					logo: asset('host'),
					logoDark: asset('host-dark')
				},
				activeSnapshot: snapshot
			},
			workbenchBrand: pahResolveWorkbenchBrand(snapshot, 'http://127.0.0.1:9400'),
			webOrigin: 'http://127.0.0.1:9400',
			documentTitle: '工作台品牌 · XYL',
			faviconHref: new URL(snapshot.favicon.url, endpoint).href,
			publicBrandingEndpoint: endpoint
		});
		expect(result.ok).toBe(false);
		expect(result.items.find(item => item.id === 'VUE-SCHEMA-01')?.ok).toBe(false);
	});
});

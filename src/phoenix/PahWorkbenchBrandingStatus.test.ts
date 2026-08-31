import { describe, expect, it } from 'vitest';
import type { PahPublicLoginBrandingSnapshotV2 } from './PahPublicLoginBranding';
import {
	pahHostWorkbenchBrandingState,
	pahWorkbenchBrandingSource,
	type PahHostWorkbenchBrandingConfig
} from './PahWorkbenchBrandingStatus';

function asset(name: string, digest = 'a') {
	return {
		url: '/dev/admin/base/open/public-login-branding/assets/' + digest.repeat(64) + '/' + name + '.svg',
		sha256: digest.repeat(64),
		mime: 'image/svg+xml' as const,
		size: 128
	};
}

function config(): PahHostWorkbenchBrandingConfig {
	return {
		revision: 'b'.repeat(64),
		title: 'XYL',
		subtitle: { mode: 'text', text: '内部运营' },
		logo: asset('host'),
		logoDark: asset('host-dark')
	};
}

function snapshot(mode: 'host-default' | 'plugin'): PahPublicLoginBrandingSnapshotV2 {
	const host = config();
	const plugin = mode === 'plugin';
	const title = plugin ? 'Acme Workspace' : host.title;
	const subtitle = plugin ? '统一工作区' : '内部运营';
	const logo = plugin ? asset('acme', 'e') : host.logo;
	const logoDark = plugin ? asset('acme-dark', 'e') : host.logoDark;
	return {
		schemaVersion: 2,
		revision: 'c'.repeat(64),
		mode,
		plugin: plugin
			? {
					moduleId: 'phoenix-branding',
					version: '0.1.1',
					packageSha256: 'd'.repeat(64)
				}
			: null,
		appName: title,
		titleTemplate: '%s · ' + title,
		favicon: logo,
		login: {
			eyebrow: plugin ? 'ACME OPERATIONS' : 'PHOENIXWING OPEN SOURCE',
			title,
			subtitle,
			prompt: '登录 ' + title + '，继续管理您的工作区。',
			presentation: 'split'
		},
		assets: {
			logo,
			logoDark,
			compactLogo: logo,
			compactLogoDark: logoDark
		},
		workbench: {
			title,
			subtitle: { mode: 'text', text: subtitle },
			logo,
			logoDark
		}
	};
}

describe('工作台品牌完整生效来源', () => {
	it('Host 快照与保存配置一致时报告已应用', () => {
		const status = { config: config(), activeSnapshot: snapshot('host-default') };
		expect(pahHostWorkbenchBrandingState(status)).toBe('applied');
		expect(pahWorkbenchBrandingSource(status)).toMatchObject({
			sourceMode: 'host',
			sourceLabel: 'Host 默认品牌',
			hostState: 'applied'
		});
	});

	it('活动插件整套生效时 Host 配置报告为备用', () => {
		const status = { config: config(), activeSnapshot: snapshot('plugin') };
		expect(pahHostWorkbenchBrandingState(status)).toBe('standby');
		expect(pahWorkbenchBrandingSource(status)).toMatchObject({
			sourceMode: 'plugin',
			sourceLabel: 'phoenix-branding@0.1.1',
			hostState: 'standby'
		});
		expect(pahWorkbenchBrandingSource(status).hostStateLabel).toContain('保存为备用');
	});

	it('Host 模式配置与公开快照不同步时不误报已应用', () => {
		const activeSnapshot = snapshot('host-default');
		activeSnapshot.workbench = { ...activeSnapshot.workbench, title: '旧标题' };
		const status = { config: config(), activeSnapshot };
		expect(pahHostWorkbenchBrandingState(status)).toBe('out-of-sync');
		expect(pahWorkbenchBrandingSource(status).hostStateLabel).toContain('不一致');
	});
});

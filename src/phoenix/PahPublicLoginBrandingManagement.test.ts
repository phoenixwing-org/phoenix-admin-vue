import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(
	new URL('../modules/phoenix/views/plugins.vue', import.meta.url),
	'utf8'
);

describe('公开登录品牌管理员入口', () => {
	it('安装不会自动选择，只有已启用品牌插件显示显式选择操作', () => {
		expect(source).toContain("installation.state === 'enabled'");
		expect(source).toContain("installation.manifest.pluginType === 'phoenix.admin.branding'");
		expect(source).toContain('设为登录品牌');
		expect(source).not.toMatch(/controlledInstall[\s\S]{0,600}selectPublicLoginBranding\(/);
	});

	it('通过 revision CAS 调用选择与恢复默认接口', () => {
		expect(source).toContain("url: '/admin/phoenix/plugin/public-login-branding/status'");
		expect(source).toContain("url: '/admin/phoenix/plugin/public-login-branding/select'");
		expect(source).toContain("url: '/admin/phoenix/plugin/public-login-branding/reset'");
		expect(source).toContain('expectedRevision: brandingStatus.value?.revision');
	});
});

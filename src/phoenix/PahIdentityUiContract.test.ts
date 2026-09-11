import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const loginSource = read('../modules/base/pages/login/index.vue');
const callbackSource = read('../modules/base/pages/login/oauth-callback.vue');
const reviewSource = read('../modules/phoenix/views/identity.vue');

describe('Admin 飞书身份 UI 静态边界', () => {
	it('保留密码登录为默认流程，并仅由 login-policy 开启飞书入口', () => {
		expect(loginSource).toContain('createPasswordLoginPayload(form, captchaRequired.value)');
		expect(loginSource).toContain('pahIdentityApi.loginPolicy()');
		expect(loginSource).toContain("method.id === 'feishu' && method.enabled && method.ready");
		expect(loginSource).toContain('loginPolicy.value?.captchaRequired !== false');
		expect(loginSource).toContain('v-if="captchaRequired"');
	});

	it('callback 在 ticket 兑换前清除浏览器与 Router query', () => {
		const historyIndex = callbackSource.indexOf('window.history.replaceState');
		const routerIndex = callbackSource.indexOf("await router.replace('/oauth/callback')");
		const exchangeIndex = callbackSource.indexOf('pahIdentityApi.exchangeTicket(ticket)');
		expect(historyIndex).toBeGreaterThan(0);
		expect(routerIndex).toBeGreaterThan(historyIndex);
		expect(exchangeIndex).toBeGreaterThan(routerIndex);
		expect(callbackSource).not.toMatch(/storage\.(set|get)\([^\n]*ticket/i);
		expect(callbackSource).not.toMatch(/console\.(log|info|warn|error)/);
	});

	it('审查页只把明确 requestId 绑定到明确 userId', () => {
		const bindSource = reviewSource.slice(
			reviewSource.indexOf('async function bind()'),
			reviewSource.indexOf('async function reject(')
		);
		expect(bindSource).toContain('selectedRequest.value.id');
		expect(bindSource).toContain('selectedUserId.value');
		expect(bindSource).not.toMatch(/email|displayName/);
		expect(reviewSource).toContain('当前账号没有外部身份审查权限');
	});
});

function read(relativePath: string) {
	return fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

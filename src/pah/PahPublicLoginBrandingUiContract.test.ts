import fs from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const html = read('../../index.html');
const login = read('../modules/base/pages/login/index.vue');
const bootstrap = read('../cool/bootstrap/index.ts');
const router = read('../cool/router/index.ts');

describe('Public Login Branding 首帧装配', () => {
	it('在 Vue module 之前同步加载公开快照并在品牌落盘前隐藏 body', () => {
		const snapshotScript = html.indexOf('/admin/base/open/public-login-branding');
		const vueModule = html.indexOf('/src/main.ts');
		expect(snapshotScript).toBeGreaterThan(0);
		expect(snapshotScript).toBeLessThan(vueModule);
		expect(html).not.toContain('/admin/base/open/public-login-branding.js');
		expect(html).toContain('html:not([data-pah-public-login-ready]) body');
		expect(html).toContain('snapshot.assets.logoDark.url');
		expect(html).toContain('snapshot.login.prompt');
		expect(html).not.toContain('初次加载资源可能需要较多时间');
		expect(html).not.toContain('正在加载资源...');
	});

	it('登录页首屏只从 Host Store 取公开品牌，认证表单保持 Host-owned', () => {
		expect(login).toContain(':aria-label="branding.login.title"');
		expect(login).toContain('{{ branding.login.title }}');
		expect(login).toContain('{{ branding.login.prompt }}');
		expect(login).toContain('branding.assets.logoDark.url');
		expect(login).toContain('service.base.open.login(form)');
		expect(login).toContain('pahIdentityApi.loginPolicy()');
	});

	it('Pinia 在动态模块和 Vue mount 前初始化快照', () => {
		const initialize = bootstrap.indexOf('usePahPublicLoginBrandStore(pinia).initialize()');
		const modules = bootstrap.indexOf('createModule(app)');
		expect(initialize).toBeGreaterThan(0);
		expect(initialize).toBeLessThan(modules);
	});

	it('显式 reauth 在 Vue module 前只清理认证状态，普通登录跳转保持原规则', () => {
		const recovery = html.indexOf("reauthUrl.searchParams.get('reauth') !== '1'");
		const vueModule = html.indexOf('/src/main.ts');
		expect(recovery).toBeGreaterThan(0);
		expect(recovery).toBeLessThan(vueModule);
		for (const key of [
			'token',
			'token_deadtime',
			'refreshToken',
			'refreshToken_deadtime',
			'userInfo'
		]) {
			expect(html).toContain(`'${key}'`);
		}
		expect(html).toContain('[window.localStorage, window.sessionStorage]');
		expect(html).toContain("reauthUrl.searchParams.delete('reauth')");
		expect(html).not.toContain("'username',");
		expect(router).toContain("if (to.path.includes('/login'))");
		expect(router).toContain("if (!storage.isExpired('token'))");
		expect(router).toContain("next('/');");
	});

	it('reauth 一次性清理两类存储且保留用户名与其他查询参数', () => {
		const recovery = runReauthScript(
			'http://127.0.0.1:9100/login?reauth=1&returnTo=%2Fphoenix%2Fplugins#form'
		);
		for (const key of [
			'token',
			'token_deadtime',
			'refreshToken',
			'refreshToken_deadtime',
			'userInfo'
		]) {
			expect(recovery.local.has(key)).toBe(false);
			expect(recovery.session.has(key)).toBe(false);
		}
		expect(recovery.local.get('username')).toBe('admin');
		expect(recovery.replaced).toEqual(['/login?returnTo=%2Fphoenix%2Fplugins#form']);

		const ordinary = runReauthScript('http://127.0.0.1:9100/login');
		expect(ordinary.local.get('token')).toBe('local-token');
		expect(ordinary.replaced).toEqual([]);
	});
});

function read(relativePath: string) {
	return fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

function runReauthScript(href: string) {
	const script = html.match(/<script>\s*\(\(\) => \{\s*const reauthUrl[\s\S]*?<\/script>/)?.[0];
	expect(script).toBeTruthy();
	const executable = script!.replace(/^<script>/, '').replace(/<\/script>$/, '');
	const local = new Map<string, string>([
		['token', 'local-token'],
		['token_deadtime', '1'],
		['refreshToken', 'local-refresh'],
		['refreshToken_deadtime', '2'],
		['userInfo', '{}'],
		['username', 'admin']
	]);
	const session = new Map(local);
	const replaced: string[] = [];
	const createStorage = (values: Map<string, string>) => ({
		removeItem(key: string) {
			values.delete(key);
		}
	});

	runInNewContext(executable, {
		URL,
		window: {
			location: { href },
			localStorage: createStorage(local),
			sessionStorage: createStorage(session),
			history: {
				state: null,
				replaceState(_state: unknown, _title: string, url: string) {
					replaced.push(url);
				}
			}
		}
	});

	return { local, session, replaced };
}

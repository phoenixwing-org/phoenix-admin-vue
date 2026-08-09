import { describe, expect, it } from 'vitest';
import {
	pahIsAllowedAuthorizationUrl,
	pahNormalizeIdentityReturnTo,
	pahOAuthCallbackCleanPath,
	pahParseOAuthCallback,
	pahReadAndScrubOAuthCallback
} from './PahIdentityFlow';

describe('Pah 外部身份 callback 状态机', () => {
	it('解析 authenticated 并只接受站内 returnTo', () => {
		expect(
			pahParseOAuthCallback(
				'?provider=feishu&status=authenticated&ticket=one-time&returnTo=%2Fpah%2Fidentity'
			)
		).toEqual({
			kind: 'authenticated',
			provider: 'feishu',
			ticket: 'one-time',
			returnTo: '/pah/identity'
		});
		expect(pahNormalizeIdentityReturnTo('https://evil.example')).toBe('/');
		expect(pahNormalizeIdentityReturnTo('//evil.example')).toBe('/');
		expect(pahNormalizeIdentityReturnTo('/safe\\evil')).toBe('/');
	});

	it('pending 只携带审查编号，不产生自动绑定信息', () => {
		expect(
			pahParseOAuthCallback('?provider=feishu&status=pending&requestId=17&returnTo=%2F')
		).toEqual({
			kind: 'pending',
			provider: 'feishu',
			requestId: 17,
			returnTo: '/'
		});
		expect(
			pahParseOAuthCallback('?provider=feishu&status=pending&requestId=invalid').kind
		).toBe('error');
	});

	it('固定映射 provider 错误且重复 callback 确定失败', () => {
		expect(
			pahParseOAuthCallback('?provider=feishu&error=expired_state&returnTo=%2F')
		).toMatchObject({ kind: 'error', code: 'expired_state' });
		expect(pahParseOAuthCallback('')).toMatchObject({
			kind: 'error',
			code: 'invalid_callback'
		});
		expect(pahOAuthCallbackCleanPath('/unexpected')).toBe('/oauth/callback');
	});

	it('在返回 callback 状态前同步清除地址栏 query', () => {
		const calls: string[] = [];
		const state = pahReadAndScrubOAuthCallback(
			'?provider=feishu&status=authenticated&ticket=secret',
			path => calls.push(path)
		);
		expect(calls).toEqual(['/oauth/callback']);
		expect(state).toMatchObject({ kind: 'authenticated', ticket: 'secret' });
	});

	it('只导航到 HTTPS 或本机 HTTP 的后端授权地址', () => {
		expect(
			pahIsAllowedAuthorizationUrl(
				'https://accounts.feishu.cn/open-apis/authen/v1/authorize?client_id=cli_test'
			)
		).toBe(true);
		expect(pahIsAllowedAuthorizationUrl('http://127.0.0.1:8101/mock')).toBe(false);
		expect(
			pahIsAllowedAuthorizationUrl('http://127.0.0.1:8101/mock', {
				allowLoopback: true
			})
		).toBe(true);
		expect(pahIsAllowedAuthorizationUrl('https://evil.example/oauth')).toBe(false);
		expect(pahIsAllowedAuthorizationUrl('http://evil.example/oauth')).toBe(false);
		expect(pahIsAllowedAuthorizationUrl('https://accounts.feishu.cn/other')).toBe(false);
		expect(
			pahIsAllowedAuthorizationUrl(
				'https://user@accounts.feishu.cn/open-apis/authen/v1/authorize'
			)
		).toBe(false);
		expect(
			pahIsAllowedAuthorizationUrl(
				'https://accounts.feishu.cn/open-apis/authen/v1/authorize#secret'
			)
		).toBe(false);
		expect(pahIsAllowedAuthorizationUrl('not-a-url')).toBe(false);
	});
});

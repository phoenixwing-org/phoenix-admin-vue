import { describe, expect, it, vi } from 'vitest';
import {
	createPahIdentityApi,
	type PahIdentityRequest,
	type PahIdentityTransport
} from './PahIdentityApi';

describe('Pah 外部身份 API 契约', () => {
	it('公开流程使用后端冻结路径且 ticket 只进入一次兑换请求', async () => {
		const transportMock = vi.fn(async request => {
			if (request.path.endsWith('login-policy')) {
				return { enabledMethods: ['password'], methods: [] };
			}
			if (request.path.endsWith('start')) {
				return {
					authorizationUrl: 'https://accounts.feishu.cn/open-apis/authen/v1/authorize'
				};
			}
			return { token: 'jwt', refreshToken: 'refresh' };
		});
		const api = createPahIdentityApi(transportMock as unknown as PahIdentityTransport);

		await api.loginPolicy();
		await api.startFeishu('/');
		await api.exchangeTicket('single-use');

		expect(transportMock).toHaveBeenNthCalledWith(1, {
			path: '/admin/base/open/login-policy',
			method: 'GET'
		});
		expect(transportMock).toHaveBeenNthCalledWith(2, {
			path: '/admin/base/open/oauth/feishu/start',
			method: 'GET',
			params: { returnTo: '/' }
		});
		expect(transportMock).toHaveBeenNthCalledWith(3, {
			path: '/admin/base/open/oauth/exchange-ticket',
			method: 'POST',
			data: { ticket: 'single-use' }
		});
	});

	it('管理动作只使用 Host identity 路径并携带当前 Admin token', async () => {
		const transportMock = vi.fn(async () => []);
		const api = createPahIdentityApi(transportMock as unknown as PahIdentityTransport);

		await api.listBindRequests('admin-token', 'pending');
		await api.bindRequest('admin-token', 7, 9);
		await api.rejectRequest('admin-token', 8, '资料不完整');
		await api.listExternalIdentities('admin-token', 9);
		await api.unlinkIdentity('admin-token', 11);

		const calls = transportMock.mock.calls as unknown as Array<[PahIdentityRequest]>;
		for (const [request] of calls) {
			expect(request.path).toMatch(/^\/admin\/pah\/identity\//);
			expect(request.token).toBe('admin-token');
		}
		expect(transportMock).toHaveBeenCalledWith(
			expect.objectContaining({ data: { requestId: 7, userId: 9 } })
		);
	});
});

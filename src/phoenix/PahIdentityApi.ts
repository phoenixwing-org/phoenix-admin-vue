import axios, { AxiosError } from 'axios';
import type { PahIdentityFlowErrorCode } from './PahIdentityFlow';

export interface PahLoginMethodStatus {
	id: 'password' | 'feishu';
	label: string;
	buttonText?: string;
	enabled: boolean;
	ready: boolean;
	reason?: string;
}

export interface PahLoginPolicy {
	formatVersion: 1;
	scope: 'admin-console';
	captchaRequired: boolean;
	enabledMethods: Array<'password' | 'feishu'>;
	defaultMethod: 'password';
	methods: PahLoginMethodStatus[];
}

export interface PahFeishuStartResult {
	provider: 'feishu';
	authorizationUrl: string;
	expiresAt: string;
}

export interface PahAdminLoginSession {
	token: string;
	expire: number;
	refreshToken: string;
	refreshExpire: number;
	returnTo: string;
}

export interface PahExternalBindRequest {
	id: number;
	provider: 'feishu';
	providerSubject: string;
	tenantKey: string | null;
	openId: string | null;
	unionId: string | null;
	providerUserId: string | null;
	displayName: string | null;
	avatarUrl: string | null;
	email: string | null;
	status: 'pending' | 'bound' | 'rejected';
	boundUserId: number | null;
	handledByUserId: number | null;
	handledAt: string | null;
	note: string | null;
	lastSeenAt: string;
	createTime?: string;
}

export interface PahExternalIdentity {
	id: number;
	provider: 'feishu';
	providerSubject: string;
	userId: number;
	tenantKey: string | null;
	displayName: string | null;
	avatarUrl: string | null;
	email: string | null;
	status: 'active' | 'revoked';
	linkedByUserId: number | null;
	linkedAt: string;
	lastLoginAt: string | null;
	lastSyncedAt: string | null;
	revokedAt: string | null;
}

export interface PahIdentityRequest {
	path: string;
	method: 'GET' | 'POST';
	params?: Record<string, unknown>;
	data?: Record<string, unknown>;
	token?: string;
}

export type PahIdentityTransport = <T>(request: PahIdentityRequest) => Promise<T>;

interface CoolResponse<T> {
	code: number;
	message?: string;
	data: T;
}

interface CoolErrorResponse {
	message?: string;
	data?: { error?: PahIdentityFlowErrorCode };
}

export class PahIdentityApiError extends Error {
	constructor(
		message: string,
		public readonly status?: number,
		public readonly code?: PahIdentityFlowErrorCode
	) {
		super(message);
		this.name = 'PahIdentityApiError';
	}
}

export function createPahIdentityTransport(): PahIdentityTransport {
	const client = axios.create({
		timeout: Number(import.meta.env.VITE_TIMEOUT) || 30_000,
		withCredentials: false
	});

	return async function identityRequest<T>(request) {
		try {
			const response = await client.request<CoolResponse<T>>({
				url: `${pahIdentityApiBaseUrl()}${request.path}`,
				method: request.method,
				params: request.params,
				data: request.data,
				headers: request.token ? { Authorization: request.token } : undefined
			});
			if (response.data.code !== 1000) {
				throw new PahIdentityApiError(response.data.message || '身份服务请求失败');
			}
			return response.data.data;
		} catch (caught) {
			if (caught instanceof PahIdentityApiError) throw caught;
			const error = caught as AxiosError<CoolErrorResponse>;
			throw new PahIdentityApiError(
				error.response?.data?.message || error.message || '身份服务暂时不可用',
				error.response?.status,
				error.response?.data?.data?.error
			);
		}
	};
}

function pahIdentityApiBaseUrl() {
	if (import.meta.env.MODE === 'static') {
		return typeof location === 'undefined' ? '' : location.origin;
	}
	return import.meta.env.DEV ? '/dev' : '/api';
}

export function createPahIdentityApi(transport: PahIdentityTransport) {
	return {
		loginPolicy: () =>
			transport<PahLoginPolicy>({
				path: '/admin/base/open/login-policy',
				method: 'GET'
			}),
		startFeishu: (returnTo: string) =>
			transport<PahFeishuStartResult>({
				path: '/admin/base/open/oauth/feishu/start',
				method: 'GET',
				params: { returnTo }
			}),
		exchangeTicket: (ticket: string) =>
			transport<PahAdminLoginSession>({
				path: '/admin/base/open/oauth/exchange-ticket',
				method: 'POST',
				data: { ticket }
			}),
		listBindRequests: (token: string, status?: 'pending' | 'bound' | 'rejected') =>
			transport<PahExternalBindRequest[]>({
				path: '/admin/phoenix/identity/bind-request/list',
				method: 'GET',
				params: status ? { status } : undefined,
				token
			}),
		bindRequest: (token: string, requestId: number, userId: number) =>
			transport({
				path: '/admin/phoenix/identity/bind-request/bind',
				method: 'POST',
				data: { requestId, userId },
				token
			}),
		rejectRequest: (token: string, requestId: number, note?: string) =>
			transport({
				path: '/admin/phoenix/identity/bind-request/reject',
				method: 'POST',
				data: { requestId, note },
				token
			}),
		listExternalIdentities: (token: string, userId?: number) =>
			transport<PahExternalIdentity[]>({
				path: '/admin/phoenix/identity/external-identity/list',
				method: 'GET',
				params: userId === undefined ? undefined : { userId },
				token
			}),
		unlinkIdentity: (token: string, identityId: number) =>
			transport({
				path: '/admin/phoenix/identity/external-identity/unlink',
				method: 'POST',
				data: { identityId },
				token
			})
	};
}

export const pahIdentityApi = createPahIdentityApi(createPahIdentityTransport());

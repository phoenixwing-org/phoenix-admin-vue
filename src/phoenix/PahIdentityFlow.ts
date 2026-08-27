export type PahIdentityFlowErrorCode =
	| 'provider_disabled'
	| 'provider_misconfigured'
	| 'provider_unavailable'
	| 'provider_response_error'
	| 'rate_limited'
	| 'identity_incomplete'
	| 'tenant_not_allowed'
	| 'invalid_return_to'
	| 'invalid_state'
	| 'expired_state'
	| 'oauth_denied'
	| 'invalid_ticket'
	| 'expired_ticket'
	| 'identity_pending'
	| 'identity_revoked';

export type PahOAuthCallbackState =
	| {
			kind: 'authenticated';
			provider: 'feishu';
			ticket: string;
			returnTo: string;
	  }
	| {
			kind: 'pending';
			provider: 'feishu';
			requestId: number;
			returnTo: string;
	  }
	| {
			kind: 'error';
			provider: 'feishu';
			code: PahIdentityFlowErrorCode | 'invalid_callback';
			message: string;
			returnTo: string;
	  };

const errorMessages: Record<PahIdentityFlowErrorCode | 'invalid_callback', string> = {
	provider_disabled: '飞书登录未启用，请使用账号密码登录',
	provider_misconfigured: '飞书登录配置不完整，请联系管理员',
	provider_unavailable: '飞书认证服务暂时不可用，请稍后重试',
	provider_response_error: '飞书登录未完成，请重新尝试',
	rate_limited: '飞书登录请求过于频繁，请稍后重试',
	identity_incomplete: '飞书身份信息不完整，无法登录',
	tenant_not_allowed: '当前飞书租户不在允许范围内',
	invalid_return_to: '登录返回地址不合法',
	invalid_state: '飞书登录请求无效或已使用，请重新发起',
	expired_state: '飞书登录请求已过期，请重新发起',
	oauth_denied: '飞书授权未完成',
	invalid_ticket: '一次性登录票据无效或已使用',
	expired_ticket: '一次性登录票据已过期，请重新登录',
	identity_pending: '飞书身份正在等待管理员审查',
	identity_revoked: '飞书身份已解除绑定或后台账号不可用',
	invalid_callback: '飞书登录回调信息不完整，请重新发起'
};

const knownErrorCodes = new Set(Object.keys(errorMessages));

export function pahNormalizeIdentityReturnTo(value: unknown) {
	const returnTo = typeof value === 'string' ? value.trim() : '';
	if (
		!returnTo ||
		returnTo.length > 2048 ||
		!returnTo.startsWith('/') ||
		returnTo.startsWith('//') ||
		/[\u0000-\u001f\u007f\\]/.test(returnTo)
	) {
		return '/';
	}
	return returnTo;
}

export function pahParseOAuthCallback(search: string): PahOAuthCallbackState {
	const params = new URLSearchParams(search);
	const returnTo = pahNormalizeIdentityReturnTo(params.get('returnTo'));
	const provider = params.get('provider');

	if (provider !== 'feishu') {
		return callbackError('invalid_callback', returnTo);
	}

	const error = params.get('error');
	if (error) {
		const code = knownErrorCodes.has(error)
			? (error as PahIdentityFlowErrorCode)
			: 'provider_response_error';
		return callbackError(code, returnTo);
	}

	const status = params.get('status');
	if (status === 'authenticated') {
		const ticket = params.get('ticket')?.trim();
		return ticket
			? { kind: 'authenticated', provider, ticket, returnTo }
			: callbackError('invalid_ticket', returnTo);
	}

	if (status === 'pending') {
		const requestId = Number(params.get('requestId'));
		return Number.isInteger(requestId) && requestId > 0
			? { kind: 'pending', provider, requestId, returnTo }
			: callbackError('invalid_callback', returnTo);
	}

	return callbackError('invalid_callback', returnTo);
}

export function pahOAuthCallbackCleanPath(pathname = '/oauth/callback') {
	return pathname === '/oauth/callback' ? pathname : '/oauth/callback';
}

export function pahReadAndScrubOAuthCallback(
	search: string,
	scrub: (cleanPath: string) => void,
	pathname = '/oauth/callback'
) {
	const state = pahParseOAuthCallback(search);
	scrub(pahOAuthCallbackCleanPath(pathname));
	return state;
}

export function pahIdentityErrorMessage(code: PahIdentityFlowErrorCode | 'invalid_callback') {
	return errorMessages[code];
}

export function pahIsAllowedAuthorizationUrl(
	value: string,
	options: { allowLoopback?: boolean } = {}
) {
	try {
		const url = new URL(value);
		if (url.username || url.password || url.hash) return false;
		if (
			url.protocol === 'https:' &&
			url.hostname === 'accounts.feishu.cn' &&
			url.pathname === '/open-apis/authen/v1/authorize'
		) {
			return true;
		}
		return Boolean(
			options.allowLoopback &&
				url.protocol === 'http:' &&
				['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
		);
	} catch {
		return false;
	}
}

function callbackError(
	code: PahIdentityFlowErrorCode | 'invalid_callback',
	returnTo: string
): PahOAuthCallbackState {
	return {
		kind: 'error',
		provider: 'feishu',
		code,
		message: pahIdentityErrorMessage(code),
		returnTo
	};
}

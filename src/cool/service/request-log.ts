const SENSITIVE_FIELD =
	/(?:password|passwd|pwd|token|secret|authorization|captcha|verifycode|ticket|oauthcode|clientsecret|appsecret|state)$/i;

const MAX_DEPTH = 4;
const MAX_ARRAY_ITEMS = 20;

function sensitive(key: string) {
	return SENSITIVE_FIELD.test(key.replace(/[-_\s]/g, ''));
}

/**
 * 生成仅用于开发诊断的请求摘要。
 * 保留字段形状，但不把密码、验证码、Token、OAuth ticket 或文件内容写入 console。
 */
export function sanitizeRequestLogData(value: unknown, depth = 0): unknown {
	if (value == null || typeof value === 'boolean' || typeof value === 'number') return value;
	if (typeof value === 'string') return value.length > 500 ? `${value.slice(0, 500)}…` : value;
	if (depth >= MAX_DEPTH) return '[MAX_DEPTH]';

	if (typeof FormData !== 'undefined' && value instanceof FormData) {
		const summary: Record<string, unknown> = {};
		for (const [key, item] of value.entries()) {
			summary[key] = sensitive(key)
				? '[REDACTED]'
				: typeof item === 'string'
					? sanitizeRequestLogData(item, depth + 1)
					: `[File ${item.name || 'unnamed'} · ${item.type || 'unknown'} · ${item.size} bytes]`;
		}
		return summary;
	}

	if (Array.isArray(value)) {
		const items = value
			.slice(0, MAX_ARRAY_ITEMS)
			.map(item => sanitizeRequestLogData(item, depth + 1));
		if (value.length > MAX_ARRAY_ITEMS) items.push(`[+${value.length - MAX_ARRAY_ITEMS} items]`);
		return items;
	}

	if (typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [
				key,
				sensitive(key) ? '[REDACTED]' : sanitizeRequestLogData(item, depth + 1)
			])
		);
	}

	return String(value);
}

import { describe, expect, it } from 'vitest';
import { sanitizeRequestLogData } from './request-log';

describe('request log sanitizer', () => {
	it('保留普通诊断字段并递归脱敏认证信息', () => {
		expect(
			sanitizeRequestLogData({
				username: 'admin',
				password: '123456',
				nested: {
					accessToken: 'access-token',
					verifyCode: 'abcd',
					query: 'visible'
				}
			})
		).toEqual({
			username: 'admin',
			password: '[REDACTED]',
			nested: {
				accessToken: '[REDACTED]',
				verifyCode: '[REDACTED]',
				query: 'visible'
			}
		});
	});

	it('FormData 只显示安全摘要，不输出文件内容', () => {
		const data = new FormData();
		data.append('moduleId', 'phoenix-open-issue');
		data.append('ticket', 'one-time-ticket');
		data.append('package', new File(['plugin-bytes'], 'plugin.phoenix.cool', { type: 'application/zip' }));

		expect(sanitizeRequestLogData(data)).toEqual({
			moduleId: 'phoenix-open-issue',
			ticket: '[REDACTED]',
			package: '[File plugin.phoenix.cool · application/zip · 12 bytes]'
		});
	});
});

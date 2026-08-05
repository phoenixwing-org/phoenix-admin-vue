import { describe, expect, it } from 'vitest';
import { joinServiceUrl } from './url';

describe('joinServiceUrl', () => {
	it('规范化开发代理与绝对业务路径之间的重复斜杠', () => {
		expect(joinServiceUrl('/dev', '/admin/phoenix/plugin/migration-plan')).toBe(
			'/dev/admin/phoenix/plugin/migration-plan'
		);
	});

	it('规范化命名空间和相对动作路径', () => {
		expect(joinServiceUrl('/admin/phoenix/plugin/', '/list')).toBe(
			'/admin/phoenix/plugin/list'
		);
	});

	it('保留空代理下的根路径语义', () => {
		expect(joinServiceUrl('', '/admin/base/open/eps')).toBe('/admin/base/open/eps');
	});
});

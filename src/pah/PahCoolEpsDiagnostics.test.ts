import { describe, expect, it } from 'vitest';
import { coolEpsClassify, coolEpsSafeTarget } from '../../scripts/cool-eps-diagnostics.mjs';

describe('Cool EPS diagnostics', () => {
	it('输出目标时移除凭据、路径、查询和片段', () => {
		expect(
			coolEpsSafeTarget(
				'https://developer:secret@example.internal:8443/private?token=secret#fragment'
			)
		).toBe('https://example.internal:8443');
		expect(coolEpsSafeTarget('not a URL')).toBe('invalid-target');
	});

	it('区分远端可用、本地缓存降级和真正不完整', () => {
		expect(coolEpsClassify({ endpointsReady: true, cacheEntries: 0 })).toBe('remote-ready');
		expect(coolEpsClassify({ endpointsReady: false, cacheEntries: 31 })).toBe(
			'non-blocking-cache-fallback'
		);
		expect(coolEpsClassify({ endpointsReady: false, cacheEntries: 0 })).toBe(
			'incomplete-without-api-or-cache'
		);
	});
});

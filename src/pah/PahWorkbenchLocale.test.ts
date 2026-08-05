import { describe, expect, it } from 'vitest';
import { pahWorkbenchLocale } from './PahWorkbenchLocale';

describe('PahWorkbenchLocale', () => {
	it('把 Admin 英文映射为 Wing en-US', () => {
		expect(pahWorkbenchLocale('en')).toBe('en-US');
		expect(pahWorkbenchLocale('EN')).toBe('en-US');
	});

	it('中文、繁中与未知值安全回退 Wing zh-CN', () => {
		expect(pahWorkbenchLocale('zh-cn')).toBe('zh-CN');
		expect(pahWorkbenchLocale('zh-tw')).toBe('zh-CN');
		expect(pahWorkbenchLocale(undefined)).toBe('zh-CN');
	});
});

import { describe, expect, it } from 'vitest';
import { pahNavigationStyleLabel, pahNormalizeNavigationStyle } from './PahNavigationStyle';

describe('PahNavigationStyle', () => {
	it('接受两种宿主导航样式', () => {
		expect(pahNormalizeNavigationStyle('ribbon')).toBe('ribbon');
		expect(pahNormalizeNavigationStyle('grouped-sidebar')).toBe('grouped-sidebar');
	});

	it('未知值回退到 Ribbon', () => {
		expect(pahNormalizeNavigationStyle('legacy')).toBe('ribbon');
		expect(pahNormalizeNavigationStyle(undefined)).toBe('ribbon');
	});

	it('为设置面板提供中文名称', () => {
		expect(pahNavigationStyleLabel('ribbon')).toBe('Ribbon 工作台');
		expect(pahNavigationStyleLabel('grouped-sidebar')).toBe('大分组侧栏');
	});
});

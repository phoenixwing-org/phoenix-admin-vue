import { describe, expect, it } from 'vitest';
import { pahNormalizeShellMode, pahResolveShellMode } from './PahShellMode';

describe('PahShellMode', () => {
	it('未知配置回退到 classic', () => {
		expect(pahNormalizeShellMode('unknown')).toBe('classic');
	});

	it('hybrid 只对显式标记的路由启用 workbench', () => {
		expect(pahResolveShellMode('hybrid', 'workbench')).toBe('workbench');
		expect(pahResolveShellMode('hybrid')).toBe('classic');
	});
});

import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import {
	pahWorkbenchColorScheme,
	pahWorkbenchDarkState,
	usePahWorkbenchThemeBridge
} from './PahWorkbenchThemeBridge';

describe('PahWorkbenchThemeBridge', () => {
	it('把 Cool 暗黑状态投影成 Wing 的确定主题', () => {
		expect(pahWorkbenchColorScheme(false)).toBe('light');
		expect(pahWorkbenchColorScheme(true)).toBe('dark');
	});

	it('把 Wing 主题选择解析成 Cool 暗黑状态', () => {
		expect(pahWorkbenchDarkState('light', true)).toBe(false);
		expect(pahWorkbenchDarkState('dark', false)).toBe(true);
		expect(pahWorkbenchDarkState('system', false)).toBe(false);
		expect(pahWorkbenchDarkState('system', true)).toBe(true);
	});

	it('双向通知并去重相同状态', () => {
		const coolIsDark = ref(false);
		const setCoolDark = vi.fn((isDark: boolean) => {
			coolIsDark.value = isDark;
		});
		const bridge = usePahWorkbenchThemeBridge({
			coolIsDark,
			setCoolDark,
			systemPrefersDark: () => false
		});

		expect(bridge.colorScheme.value).toBe('light');
		bridge.updateFromWorkbench('dark');
		expect(setCoolDark).toHaveBeenCalledOnce();
		expect(bridge.colorScheme.value).toBe('dark');

		bridge.updateFromWorkbench('dark');
		expect(setCoolDark).toHaveBeenCalledOnce();

		coolIsDark.value = false;
		expect(bridge.colorScheme.value).toBe('light');
	});
});

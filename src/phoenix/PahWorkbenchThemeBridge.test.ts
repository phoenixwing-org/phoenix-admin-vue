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
		const colorScheme = ref<'light' | 'dark' | 'system'>('light');
		const systemPrefersDark = ref(false);
		const applyHostColorScheme = vi.fn();
		const setCoolDark = vi.fn((isDark: boolean) => {
			coolIsDark.value = isDark;
		});
		const bridge = usePahWorkbenchThemeBridge({
			coolIsDark,
			colorScheme,
			setCoolDark,
			systemPrefersDark,
			applyHostColorScheme
		});

		expect(bridge.colorScheme.value).toBe('light');
		expect(applyHostColorScheme).toHaveBeenLastCalledWith('light');
		bridge.updateFromWorkbench('dark');
		expect(setCoolDark).toHaveBeenCalledOnce();
		expect(bridge.colorScheme.value).toBe('dark');
		expect(applyHostColorScheme).toHaveBeenLastCalledWith('dark');

		bridge.updateFromWorkbench('dark');
		expect(setCoolDark).toHaveBeenCalledOnce();

		coolIsDark.value = false;
		expect(bridge.colorScheme.value).toBe('light');
		expect(applyHostColorScheme).toHaveBeenLastCalledWith('light');
	});

	it('保留 system 偏好并随系统变化，同时接受 Cool 外部切换', () => {
		const coolIsDark = ref(false);
		const colorScheme = ref<'light' | 'dark' | 'system'>('system');
		const systemPrefersDark = ref(false);
		const applyHostColorScheme = vi.fn();
		const setCoolDark = vi.fn((isDark: boolean) => {
			coolIsDark.value = isDark;
		});
		const bridge = usePahWorkbenchThemeBridge({
			coolIsDark,
			colorScheme,
			setCoolDark,
			systemPrefersDark,
			applyHostColorScheme
		});

		expect(bridge.colorScheme.value).toBe('system');
		expect(applyHostColorScheme).toHaveBeenLastCalledWith('light');

		systemPrefersDark.value = true;
		expect(bridge.colorScheme.value).toBe('system');
		expect(coolIsDark.value).toBe(true);
		expect(applyHostColorScheme).toHaveBeenLastCalledWith('dark');

		coolIsDark.value = false;
		expect(bridge.colorScheme.value).toBe('light');
		expect(applyHostColorScheme).toHaveBeenLastCalledWith('light');
	});
});

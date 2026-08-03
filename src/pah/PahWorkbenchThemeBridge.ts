import { watch, type Ref } from 'vue';
import type { PnwColorScheme } from 'phoenix-wing';

export type PahResolvedColorScheme = Exclude<PnwColorScheme, 'system'>;

export interface PahWorkbenchThemeBridgeOptions {
	coolIsDark: Ref<boolean>;
	colorScheme: Ref<PnwColorScheme>;
	setCoolDark: (isDark: boolean) => void;
	systemPrefersDark: Ref<boolean>;
	applyHostColorScheme?: (colorScheme: PahResolvedColorScheme) => void;
}

/** Cool 的全局暗黑状态是 Admin 与 Wing 共同显示主题的唯一真源。 */
export function pahWorkbenchColorScheme(isDark: boolean): PahResolvedColorScheme {
	return isDark ? 'dark' : 'light';
}

/** system 是持久偏好；这里只把偏好与当前系统状态解析成有效显示。 */
export function pahWorkbenchDarkState(
	colorScheme: PnwColorScheme,
	systemPrefersDark: boolean
): boolean {
	return colorScheme === 'system' ? systemPrefersDark : colorScheme === 'dark';
}

/**
 * Cool 状态变化自动通知 Wing；Wing 选择则通过 setCoolDark 反向通知 Cool。
 * 比较当前值后再通知，避免双向同步形成循环。
 */
export function usePahWorkbenchThemeBridge(options: PahWorkbenchThemeBridgeOptions): {
	colorScheme: Ref<PnwColorScheme>;
	updateFromWorkbench: (colorScheme: PnwColorScheme) => void;
} {
	let syncingCoolState = false;

	watch(
		[options.colorScheme, options.systemPrefersDark],
		([colorScheme, systemPrefersDark]) => {
			const nextDark = pahWorkbenchDarkState(colorScheme, systemPrefersDark);
			if (nextDark !== options.coolIsDark.value) {
				syncingCoolState = true;
				options.setCoolDark(nextDark);
				syncingCoolState = false;
			}
			options.applyHostColorScheme?.(pahWorkbenchColorScheme(nextDark));
		},
		{ immediate: true, flush: 'sync' }
	);

	watch(
		options.coolIsDark,
		isDark => {
			if (syncingCoolState) return;
			const nextColorScheme = pahWorkbenchColorScheme(isDark);
			if (options.colorScheme.value !== nextColorScheme) {
				options.colorScheme.value = nextColorScheme;
			}
		},
		{ flush: 'sync' }
	);

	function updateFromWorkbench(nextColorScheme: PnwColorScheme) {
		if (options.colorScheme.value !== nextColorScheme) {
			options.colorScheme.value = nextColorScheme;
		}
	}

	return { colorScheme: options.colorScheme, updateFromWorkbench };
}

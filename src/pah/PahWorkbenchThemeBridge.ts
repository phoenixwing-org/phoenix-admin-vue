import { computed, type ComputedRef, type Ref } from 'vue';
import type { PnwColorScheme } from 'phoenix-wing';

export type PahResolvedColorScheme = Exclude<PnwColorScheme, 'system'>;

export interface PahWorkbenchThemeBridgeOptions {
	coolIsDark: Ref<boolean>;
	setCoolDark: (isDark: boolean) => void;
	systemPrefersDark: () => boolean;
}

/** Cool 的全局暗黑状态是 Admin 与 Wing 共同显示主题的唯一真源。 */
export function pahWorkbenchColorScheme(isDark: boolean): PahResolvedColorScheme {
	return isDark ? 'dark' : 'light';
}

/** Wing 的 system 选择只在操作时解析一次，随后仍由 Cool 持有确定状态。 */
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
	colorScheme: ComputedRef<PahResolvedColorScheme>;
	updateFromWorkbench: (colorScheme: PnwColorScheme) => void;
} {
	const colorScheme = computed(() => pahWorkbenchColorScheme(options.coolIsDark.value));

	function updateFromWorkbench(nextColorScheme: PnwColorScheme) {
		const nextDark = pahWorkbenchDarkState(nextColorScheme, options.systemPrefersDark());
		if (nextDark !== options.coolIsDark.value) options.setCoolDark(nextDark);
	}

	return { colorScheme, updateFromWorkbench };
}

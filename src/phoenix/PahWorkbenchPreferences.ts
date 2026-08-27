import {
	PNW_DEFAULT_WORKBENCH_DISPLAY_PREFERENCES,
	pnwNormalizeWorkbenchDisplayPreferences
} from 'phoenix-wing/utils/pnwWorkbenchWeb';
import type { PnwWorkbenchDisplayPreferences } from 'phoenix-wing/types/PnwWorkbenchWeb';

export const PAH_WORKBENCH_PREFERENCES_KEY = 'pah.workbenchPreferences.v3';
export const PAH_LEGACY_WORKBENCH_PREFERENCES_KEY = 'pah.workbenchPreferences.v2';

export interface PahWorkbenchPreferences {
	version: 3;
	displayPreferences: PnwWorkbenchDisplayPreferences;
}

function pahDefaultDisplayPreferences(): PnwWorkbenchDisplayPreferences {
	return pnwNormalizeWorkbenchDisplayPreferences(PNW_DEFAULT_WORKBENCH_DISPLAY_PREFERENCES);
}

export const PAH_DEFAULT_WORKBENCH_PREFERENCES: PahWorkbenchPreferences = {
	version: 3,
	displayPreferences: pahDefaultDisplayPreferences()
};

function pahLegacyPresentation(value: unknown): PnwWorkbenchDisplayPreferences['presentation'] {
	return value === 'grouped-sidebar' || value === 'tree' ? 'tree' : 'ribbon';
}

/**
 * 将旧 Pah 手工壳层偏好迁入 Wing 0.6 的完整 DisplayPreferences。
 * 未知字段由 Wing 自己的 normalizer 处理，Admin 只负责存储介质和旧字段映射。
 */
function pahLegacyDisplayPreferences(
	value: Record<string, unknown>,
	legacyNavigationStyle: unknown
): PnwWorkbenchDisplayPreferences {
	const defaults = pahDefaultDisplayPreferences();
	const layoutState = {
		visibility: {
			primary:
				typeof value.primaryOpen === 'boolean'
					? value.primaryOpen
					: defaults.layoutState.visibility.primary,
			bottom:
				typeof value.logOpen === 'boolean'
					? value.logOpen
					: defaults.layoutState.visibility.bottom,
			secondary:
				typeof value.propertiesOpen === 'boolean'
					? value.propertiesOpen
					: defaults.layoutState.visibility.secondary
		},
		sizes: {
			...defaults.layoutState.sizes,
			bottomHeight:
				typeof value.logHeight === 'number'
					? value.logHeight
					: defaults.layoutState.sizes.bottomHeight
		}
	};

	return pnwNormalizeWorkbenchDisplayPreferences({
		...defaults,
		presentation: pahLegacyPresentation(legacyNavigationStyle),
		ribbonAppearance: {
			...defaults.ribbonAppearance,
			mode: value.ribbonLayout === 'inline' ? 'compact' : 'ribbon'
		},
		layoutState
	});
}

export function pahNormalizeWorkbenchPreferences(
	value: unknown,
	legacyNavigationStyle?: unknown
): PahWorkbenchPreferences {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {
			version: 3,
			displayPreferences: pnwNormalizeWorkbenchDisplayPreferences({
				...PAH_DEFAULT_WORKBENCH_PREFERENCES.displayPreferences,
				presentation: pahLegacyPresentation(legacyNavigationStyle)
			})
		};
	}

	const candidate = value as Record<string, unknown>;
	const displayPreferences = candidate.displayPreferences;

	return {
		version: 3,
		displayPreferences:
			displayPreferences && typeof displayPreferences === 'object'
				? pnwNormalizeWorkbenchDisplayPreferences(displayPreferences)
				: pahLegacyDisplayPreferences(candidate, legacyNavigationStyle)
	};
}

import { describe, expect, it } from 'vitest';
import {
	PAH_DEFAULT_WORKBENCH_PREFERENCES,
	pahNormalizeWorkbenchPreferences
} from './PahWorkbenchPreferences';

describe('PahWorkbenchPreferences', () => {
	it('无配置时返回独立的 Wing 0.6 默认偏好', () => {
		const preferences = pahNormalizeWorkbenchPreferences(undefined);
		expect(preferences).toEqual(PAH_DEFAULT_WORKBENCH_PREFERENCES);
		expect(preferences).not.toBe(PAH_DEFAULT_WORKBENCH_PREFERENCES);
		expect(preferences.displayPreferences).not.toBe(
			PAH_DEFAULT_WORKBENCH_PREFERENCES.displayPreferences
		);
	});

	it('迁移旧导航、Ribbon 和三块面板偏好', () => {
		const preferences = pahNormalizeWorkbenchPreferences(
			{
				version: 2,
				ribbonLayout: 'inline',
				primaryOpen: true,
				propertiesOpen: false,
				logOpen: true,
				logHeight: 260
			},
			'grouped-sidebar'
		);

		expect(preferences.version).toBe(3);
		expect(preferences.displayPreferences.presentation).toBe('tree');
		expect(preferences.displayPreferences.ribbonAppearance.mode).toBe('compact');
		expect(preferences.displayPreferences.layoutState).toMatchObject({
			visibility: { primary: true, bottom: true, secondary: false },
			sizes: { bottomHeight: 260 }
		});
	});

	it('由 Wing normalizer 修正 0.6 偏好中的非法组合', () => {
		const preferences = pahNormalizeWorkbenchPreferences({
			version: 3,
			displayPreferences: {
				presentation: 'sideways',
				ribbonAppearance: {
					mode: 'compact',
					compact: { iconSize: 36, showTitles: false, showGroupLabels: true },
					ribbon: { iconSize: 16, showTitles: true, showGroupLabels: false }
				},
				colorScheme: 'sepia',
				layoutState: {
					visibility: { primary: true, bottom: false, secondary: true },
					sizes: { primaryWidth: 20, secondaryWidth: 900, bottomHeight: 2 }
				}
			}
		});

		expect(preferences.displayPreferences.presentation).toBe('ribbon');
		expect(preferences.displayPreferences.ribbonAppearance.compact.iconSize).toBe(24);
		expect(preferences.displayPreferences.ribbonAppearance.ribbon.iconSize).toBe(36);
		expect(preferences.displayPreferences.colorScheme).toBe('system');
		expect(preferences.displayPreferences.layoutState.sizes).toEqual({
			primaryWidth: 160,
			secondaryWidth: 560,
			bottomHeight: 112
		});
	});

	it('保留合法的 Tree 外观、标签位置和浮层位置', () => {
		const preferences = pahNormalizeWorkbenchPreferences({
			version: 3,
			displayPreferences: {
				presentation: 'tree',
				treeCollapsed: true,
				treeAppearance: { expanded: 'admin-menu', collapsed: 'root-flyout' },
				tabBarPlacement: 'editor-bottom',
				settingsPositions: {
					quick: { x: 120, y: 80 },
					full: { x: 220, y: 140 }
				}
			}
		});

		expect(preferences.displayPreferences).toMatchObject({
			presentation: 'tree',
			treeCollapsed: true,
			treeAppearance: { expanded: 'admin-menu', collapsed: 'root-flyout' },
			tabBarPlacement: 'editor-bottom',
			settingsPositions: {
				quick: { x: 120, y: 80 },
				full: { x: 220, y: 140 }
			}
		});
	});
});

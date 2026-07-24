import { describe, expect, it } from 'vitest';
import {
	PAH_DEFAULT_WORKBENCH_PREFERENCES,
	pahNormalizeWorkbenchPreferences
} from './PahWorkbenchPreferences';

describe('PahWorkbenchPreferences', () => {
	it('无配置时返回独立的默认布局', () => {
		const preferences = pahNormalizeWorkbenchPreferences(undefined);
		expect(preferences).toEqual(PAH_DEFAULT_WORKBENCH_PREFERENCES);
		expect(preferences).not.toBe(PAH_DEFAULT_WORKBENCH_PREFERENCES);
	});

	it('只接受已知布局和布尔面板状态', () => {
		expect(
			pahNormalizeWorkbenchPreferences({
				version: 8,
				ribbonLayout: 'inline',
				primaryOpen: true,
				propertiesOpen: false,
				logOpen: false
			})
		).toEqual({
			version: 1,
			ribbonLayout: 'inline',
			primaryOpen: true,
			propertiesOpen: false,
			logOpen: false
		});
	});

	it('损坏字段逐项回退而不丢失有效字段', () => {
		expect(
			pahNormalizeWorkbenchPreferences({
				ribbonLayout: 'wide',
				primaryOpen: 'yes',
				propertiesOpen: false
			})
		).toEqual({
			version: 1,
			ribbonLayout: 'stacked',
			primaryOpen: false,
			propertiesOpen: false,
			logOpen: true
		});
	});
});

export const PAH_WORKBENCH_PREFERENCES_KEY = 'pah.workbenchPreferences.v1';

export type PahRibbonLayout = 'stacked' | 'inline';

export interface PahWorkbenchPreferences {
	version: 1;
	ribbonLayout: PahRibbonLayout;
	primaryOpen: boolean;
	propertiesOpen: boolean;
	logOpen: boolean;
}

export const PAH_DEFAULT_WORKBENCH_PREFERENCES: PahWorkbenchPreferences = {
	version: 1,
	ribbonLayout: 'stacked',
	primaryOpen: false,
	propertiesOpen: true,
	logOpen: true
};

export function pahNormalizeWorkbenchPreferences(value: unknown): PahWorkbenchPreferences {
	if (!value || typeof value !== 'object') {
		return { ...PAH_DEFAULT_WORKBENCH_PREFERENCES };
	}

	const candidate = value as Partial<PahWorkbenchPreferences>;
	return {
		version: 1,
		ribbonLayout: candidate.ribbonLayout === 'inline' ? 'inline' : 'stacked',
		primaryOpen:
			typeof candidate.primaryOpen === 'boolean'
				? candidate.primaryOpen
				: PAH_DEFAULT_WORKBENCH_PREFERENCES.primaryOpen,
		propertiesOpen:
			typeof candidate.propertiesOpen === 'boolean'
				? candidate.propertiesOpen
				: PAH_DEFAULT_WORKBENCH_PREFERENCES.propertiesOpen,
		logOpen:
			typeof candidate.logOpen === 'boolean'
				? candidate.logOpen
				: PAH_DEFAULT_WORKBENCH_PREFERENCES.logOpen
	};
}

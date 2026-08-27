export type PahShellMode = 'classic' | 'workbench' | 'hybrid';
export type PahResolvedShellMode = Exclude<PahShellMode, 'hybrid'>;

const PAH_SHELL_MODES: readonly PahShellMode[] = ['classic', 'workbench', 'hybrid'];

export function pahNormalizeShellMode(value: unknown): PahShellMode {
	return PAH_SHELL_MODES.includes(value as PahShellMode) ? (value as PahShellMode) : 'classic';
}

export function pahResolveShellMode(
	configured: PahShellMode,
	routePreference?: unknown
): PahResolvedShellMode {
	if (configured !== 'hybrid') {
		return configured;
	}

	return routePreference === 'workbench' ? 'workbench' : 'classic';
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_NAME: string;
	readonly VITE_TIMEOUT: number;
	readonly VITE_PAH_SHELL_MODE?: 'classic' | 'workbench' | 'hybrid';
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

declare module 'virtual:phoenix-admin-plugin-runtime' {
	const loaders: Array<{
		moduleId: string;
		version: string;
		load(): Promise<Array<[string, unknown]>>;
	}>;
	export default loaders;
}

declare module 'virtual:phoenix-admin-plugin-routes' {
	const routes: Record<string, () => Promise<unknown>>;
	export default routes;
}

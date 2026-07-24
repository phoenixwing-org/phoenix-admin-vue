/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_NAME: string;
	readonly VITE_TIMEOUT: number;
	readonly VITE_PAH_SHELL_MODE?: 'classic' | 'workbench' | 'hybrid';
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

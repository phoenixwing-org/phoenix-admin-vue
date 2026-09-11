export const PAH_PUBLIC_LOGIN_BRANDING_SCHEMA_VERSION = 2 as const;

export type PahPublicLoginBrandingPresentation = 'split' | 'centered' | 'hero-image';

export interface PahPublicLoginBrandingSnapshotAssetV1 {
	url: string;
	sha256: string;
	mime: 'image/svg+xml' | 'image/png' | 'image/webp' | 'image/x-icon';
	size: number;
}

export interface PahPublicLoginBrandingSnapshotV1 {
	schemaVersion: 1;
	revision: string;
	mode: 'host-default' | 'plugin';
	plugin: null | {
		moduleId: string;
		version: string;
		packageSha256: string;
	};
	appName: string;
	titleTemplate: string;
	favicon: PahPublicLoginBrandingSnapshotAssetV1;
	login: {
		eyebrow: string;
		title: string;
		subtitle: string;
		prompt: string;
		presentation: PahPublicLoginBrandingPresentation;
	};
	assets: {
		logo: PahPublicLoginBrandingSnapshotAssetV1;
		logoDark: PahPublicLoginBrandingSnapshotAssetV1;
		compactLogo: PahPublicLoginBrandingSnapshotAssetV1;
		compactLogoDark: PahPublicLoginBrandingSnapshotAssetV1;
		background?: PahPublicLoginBrandingSnapshotAssetV1;
	};
}

export interface PahPublicLoginBrandingSnapshotV2
	extends Omit<PahPublicLoginBrandingSnapshotV1, 'schemaVersion'> {
	schemaVersion: 2;
	workbench: {
		title: string;
		subtitle: { mode: 'web-origin' } | { mode: 'text'; text: string };
		logo: PahPublicLoginBrandingSnapshotAssetV1;
		logoDark: PahPublicLoginBrandingSnapshotAssetV1;
	};
}

export type PahPublicLoginBrandingSnapshot =
	| PahPublicLoginBrandingSnapshotV1
	| PahPublicLoginBrandingSnapshotV2;

declare global {
	interface Window {
		readonly __PAH_PUBLIC_LOGIN_BRANDING__?: PahPublicLoginBrandingSnapshot;
	}
}

const MIME_BY_EXTENSION = {
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.ico': 'image/x-icon'
} as const;

function record(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function safeText(value: unknown, max: number) {
	return (
		typeof value === 'string' &&
		value.trim().length > 0 &&
		value.length <= max &&
		!/[<>\u0000-\u001f\u007f]/.test(value)
	);
}

function validAsset(
	value: unknown,
	requireContentAddressed = false
): value is PahPublicLoginBrandingSnapshotAssetV1 {
	if (!record(value)) return false;
	if (Object.keys(value).some(key => !['url', 'sha256', 'mime', 'size'].includes(key))) {
		return false;
	}
	const url = typeof value.url === 'string' ? value.url : '';
	const extension = url.slice(url.lastIndexOf('.')).toLowerCase();
	return (
		url.length > 0 &&
		url.length <= 300 &&
		!url.includes('\\') &&
		!url.includes('..') &&
		!/^(?:[a-z]+:)?\/\//i.test(url) &&
		typeof value.sha256 === 'string' &&
		/^[a-f0-9]{64}$/.test(value.sha256) &&
		(!requireContentAddressed || url.includes(`/assets/${value.sha256}/`)) &&
		extension in MIME_BY_EXTENSION &&
		MIME_BY_EXTENSION[extension as keyof typeof MIME_BY_EXTENSION] === value.mime &&
		Number.isSafeInteger(value.size) &&
		Number(value.size) > 0 &&
		Number(value.size) <= 8 * 1024 * 1024
	);
}

export function isPahPublicLoginBrandingSnapshot(
	value: unknown
): value is PahPublicLoginBrandingSnapshot {
	if (!record(value) || !record(value.login) || !record(value.assets)) return false;
	if (
		Object.keys(value).some(
			key =>
				![
					'schemaVersion',
					'revision',
					'mode',
					'plugin',
					'appName',
					'titleTemplate',
					'favicon',
					'login',
					'assets',
					'workbench'
				].includes(key)
		)
	) {
		return false;
	}
	const presentation = value.login.presentation;
	const pluginMode = value.mode === 'plugin';
	const validPlugin =
		value.mode === 'host-default'
			? value.plugin === null
			: record(value.plugin) &&
				Object.keys(value.plugin).every(key =>
					['moduleId', 'version', 'packageSha256'].includes(key)
				) &&
				typeof value.plugin.moduleId === 'string' &&
				/^[a-z][a-z0-9-]*$/.test(value.plugin.moduleId) &&
				safeText(value.plugin.version, 80) &&
				typeof value.plugin.packageSha256 === 'string' &&
				/^[a-f0-9]{64}$/.test(value.plugin.packageSha256);
	const baseValid =
		[1, PAH_PUBLIC_LOGIN_BRANDING_SCHEMA_VERSION].includes(Number(value.schemaVersion)) &&
		typeof value.revision === 'string' &&
		/^[a-f0-9]{64}$/.test(value.revision) &&
		['host-default', 'plugin'].includes(String(value.mode)) &&
		validPlugin &&
		safeText(value.appName, 80) &&
		safeText(value.titleTemplate, 120) &&
		String(value.titleTemplate).split('%s').length === 2 &&
		validAsset(value.favicon, pluginMode) &&
		Object.keys(value.login).every(key =>
			['eyebrow', 'title', 'subtitle', 'prompt', 'presentation'].includes(key)
		) &&
		safeText(value.login.eyebrow, 80) &&
		safeText(value.login.title, 100) &&
		safeText(value.login.subtitle, 240) &&
		safeText(value.login.prompt, 160) &&
		['split', 'centered', 'hero-image'].includes(String(presentation)) &&
		Object.keys(value.assets).every(key =>
			['logo', 'logoDark', 'compactLogo', 'compactLogoDark', 'background'].includes(key)
		) &&
		validAsset(value.assets.logo, pluginMode) &&
		validAsset(value.assets.logoDark, pluginMode) &&
		validAsset(value.assets.compactLogo, pluginMode) &&
		validAsset(value.assets.compactLogoDark, pluginMode) &&
		(value.assets.background === undefined || validAsset(value.assets.background, pluginMode));
	if (!baseValid) return false;
	if (value.schemaVersion === 1) return value.workbench === undefined;
	if (value.schemaVersion !== 2 || !record(value.workbench)) return false;
	if (
		Object.keys(value.workbench).some(
			key => !['title', 'subtitle', 'logo', 'logoDark'].includes(key)
		) ||
		!safeText(value.workbench.title, 80) ||
		!record(value.workbench.subtitle) ||
		!validAsset(value.workbench.logo, pluginMode) ||
		!validAsset(value.workbench.logoDark, pluginMode)
	) {
		return false;
	}
	if (value.workbench.subtitle.mode === 'web-origin') {
		return Object.keys(value.workbench.subtitle).every(key => key === 'mode');
	}
	return (
		value.workbench.subtitle.mode === 'text' &&
		Object.keys(value.workbench.subtitle).every(key => ['mode', 'text'].includes(key)) &&
		safeText(value.workbench.subtitle.text, 160)
	);
}

export function readPahPublicLoginBrandingSnapshot() {
	const value = window.__PAH_PUBLIC_LOGIN_BRANDING__;
	if (!isPahPublicLoginBrandingSnapshot(value)) {
		throw new Error('公开登录品牌启动快照不合法');
	}
	return value;
}

export function pahPublicLoginTitle(snapshot: PahPublicLoginBrandingSnapshot, page = '登录') {
	return snapshot.titleTemplate.replace('%s', page);
}

export function applyPahPublicLoginBrandingHead(snapshot: PahPublicLoginBrandingSnapshot) {
	document.title = pahPublicLoginTitle(snapshot);
	let favicon = document.querySelector<HTMLLinkElement>('#pah-public-login-favicon');
	if (!favicon) {
		favicon = document.createElement('link');
		favicon.id = 'pah-public-login-favicon';
		favicon.rel = 'icon';
		document.head.append(favicon);
	}
	favicon.type = snapshot.favicon.mime;
	favicon.href = snapshot.favicon.url;
	document.documentElement.dataset.pahPublicLoginBrandingMode = snapshot.mode;
	document.documentElement.dataset.pahPublicLoginBrandingRevision = snapshot.revision;
}

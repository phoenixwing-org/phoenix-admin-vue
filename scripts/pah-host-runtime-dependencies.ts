import fs from 'node:fs';

type PahRealpath = (value: string) => string | undefined;

function stripViteSuffix(value: string) {
	const queryIndex = value.indexOf('?');
	const hashIndex = value.indexOf('#');
	const indexes = [queryIndex, hashIndex].filter(index => index >= 0);
	return indexes.length ? value.slice(0, Math.min(...indexes)) : value;
}

function decodeFileUrl(value: string) {
	try {
		const url = new URL(value);
		let pathname = decodeURIComponent(url.pathname);
		if (url.host) pathname = `//${url.host}${pathname}`;
		if (/^\/[a-z]:\//i.test(pathname)) pathname = pathname.slice(1);
		return pathname;
	} catch {
		return value;
	}
}

/**
 * Vite module ids use forward slashes even on Windows, while Node and Junction
 * realpaths may use backslashes. Queries belong to the module request rather
 * than the filesystem path and must not participate in Host-boundary checks.
 */
export function pahNormalizeViteFsPath(value: string) {
	let normalized = stripViteSuffix(String(value || '').trim());
	if (normalized.startsWith('file://')) normalized = decodeFileUrl(normalized);
	normalized = normalized.replace(/\\/g, '/');

	if (normalized.startsWith('/@fs/')) {
		normalized = normalized.slice('/@fs/'.length);
	}

	if (/^\/[a-z]:\//i.test(normalized)) normalized = normalized.slice(1);
	const isUncPath = normalized.startsWith('//');
	normalized = normalized.replace(/\/{2,}/g, '/');
	if (isUncPath) normalized = `/${normalized}`;

	if (normalized.length > 1 && !/^[a-z]:\/$/i.test(normalized) && normalized.endsWith('/')) {
		normalized = normalized.replace(/\/+$/, '');
	}

	return normalized;
}

function isWindowsPath(value: string) {
	return /^[a-z]:\//i.test(value) || value.startsWith('//');
}

function comparablePath(value: string) {
	const normalized = pahNormalizeViteFsPath(value);
	return isWindowsPath(normalized) ? normalized.toLowerCase() : normalized;
}

export function pahIsPathWithinRoot(value: string, root: string) {
	const candidate = comparablePath(value);
	const boundary = comparablePath(root);
	if (!candidate || !boundary) return false;
	return candidate === boundary || candidate.startsWith(`${boundary}/`);
}

function defaultRealpath(value: string) {
	try {
		return fs.realpathSync.native(value);
	} catch {
		return undefined;
	}
}

function looksLikeFileSystemId(value: string) {
	const normalized = pahNormalizeViteFsPath(value);
	return normalized.startsWith('/') || isWindowsPath(normalized);
}

export interface PahHostPathContextOptions {
	hostRoot: string;
	realpath?: PahRealpath;
}

/**
 * Returns true only for files physically owned by the Host. A Junction mounted
 * below src/modules is lexically inside the Host but resolves outside it, so it
 * must continue through the external-plugin dependency adapter.
 */
export function pahCreateHostPathContext(options: PahHostPathContextOptions) {
	const realpath = options.realpath || defaultRealpath;
	const hostRoot = pahNormalizeViteFsPath(options.hostRoot);
	const hostRealRoot = pahNormalizeViteFsPath(realpath(hostRoot) || hostRoot);
	const importerOwnership = new Map<string, boolean>();

	return {
		hostRoot,
		hostRealRoot,
		isHostImporter(importer: string) {
			if (!looksLikeFileSystemId(importer)) return true;

			const importerPath = pahNormalizeViteFsPath(importer);
			const cachedOwnership = importerOwnership.get(importerPath);
			if (cachedOwnership !== undefined) return cachedOwnership;

			const importerRealPath = realpath(importerPath);
			if (importerRealPath) {
				const isHostImporter = pahIsPathWithinRoot(importerRealPath, hostRealRoot);
				importerOwnership.set(importerPath, isHostImporter);
				return isHostImporter;
			}

			const isHostImporter =
				pahIsPathWithinRoot(importerPath, hostRoot) ||
				pahIsPathWithinRoot(importerPath, hostRealRoot);
			importerOwnership.set(importerPath, isHostImporter);
			return isHostImporter;
		}
	};
}

export function pahHostDependencyId(dependencyRoot: string, packageName: string, source: string) {
	return `${pahNormalizeViteFsPath(dependencyRoot)}${source.slice(packageName.length)}`;
}

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export const LEGACY_PUBLIC_LOGIN_BRANDING_EPS_PATH = '/public-login-branding.js';
export const PUBLIC_LOGIN_BRANDING_EPS_PATH = '/public-login-branding';

function matchingApis(cache) {
	if (!Array.isArray(cache)) {
		throw new TypeError('Cool EPS cache must be an array');
	}

	return cache.flatMap(group => {
		if (
			!group ||
			typeof group !== 'object' ||
			group.prefix !== '/admin/base/open' ||
			!Array.isArray(group.api)
		) {
			return [];
		}

		return group.api.filter(
			api =>
				api &&
				typeof api === 'object' &&
				String(api.method).toLowerCase() === 'get' &&
				api.path === LEGACY_PUBLIC_LOGIN_BRANDING_EPS_PATH
		);
	});
}

export function coolEpsCountLegacyPublicLoginBrandingRoutes(cache) {
	return matchingApis(cache).length;
}

export function migrateLegacyPublicLoginBrandingEpsCache(cachePath) {
	if (!fs.existsSync(cachePath)) {
		return { status: 'missing', migrated: 0 };
	}

	const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
	const apis = matchingApis(cache);
	if (apis.length === 0) {
		return { status: 'unchanged', migrated: 0 };
	}

	for (const api of apis) {
		api.path = PUBLIC_LOGIN_BRANDING_EPS_PATH;
	}

	const temporaryPath = path.join(
		path.dirname(cachePath),
		`.${path.basename(cachePath)}.${process.pid}.${randomUUID()}.tmp`
	);
	let descriptor;

	try {
		descriptor = fs.openSync(temporaryPath, 'wx');
		fs.writeFileSync(descriptor, JSON.stringify(cache), 'utf8');
		fs.fsyncSync(descriptor);
		fs.closeSync(descriptor);
		descriptor = undefined;
		fs.renameSync(temporaryPath, cachePath);
	} catch (error) {
		if (descriptor !== undefined) fs.closeSync(descriptor);
		try {
			fs.unlinkSync(temporaryPath);
		} catch (cleanupError) {
			if (cleanupError?.code !== 'ENOENT') throw cleanupError;
		}
		throw error;
	}

	return { status: 'migrated', migrated: apis.length };
}

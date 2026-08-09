import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');

export function coolEpsSafeTarget(value) {
	try {
		const url = new URL(value);
		url.username = '';
		url.password = '';
		url.pathname = '';
		url.search = '';
		url.hash = '';
		return url.origin;
	} catch {
		return 'invalid-target';
	}
}

export function coolEpsClassify({ endpointsReady, cacheEntries }) {
	if (endpointsReady) return 'remote-ready';
	if (cacheEntries > 0) return 'non-blocking-cache-fallback';
	return 'incomplete-without-api-or-cache';
}

export function coolEpsReadCache(cachePath) {
	try {
		const value = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
		return { present: true, entries: Array.isArray(value) ? value.length : 0 };
	} catch {
		return { present: false, entries: 0 };
	}
}

async function probe(url) {
	try {
		const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
		return { ready: response.ok, status: response.status };
	} catch {
		return { ready: false, status: 0 };
	}
}

export async function diagnoseCoolEps(options = {}) {
	const configuredTarget =
		options.target ||
		process.env.PAH_API_TARGET ||
		process.env.VITE_PAH_API_TARGET ||
		'http://127.0.0.1:8101';
	const safeTarget = coolEpsSafeTarget(configuredTarget);
	const cache = coolEpsReadCache(
		options.cachePath || path.join(projectRoot, 'build', 'cool', 'eps.json')
	);

	if (safeTarget === 'invalid-target') {
		return {
			target: safeTarget,
			cache,
			eps: { ready: false, status: 0 },
			dictionary: { ready: false, status: 0 },
			classification: 'invalid-target'
		};
	}

	const [eps, dictionary] = await Promise.all([
		probe(`${safeTarget}/admin/base/open/eps`),
		probe(`${safeTarget}/admin/dict/info/types`)
	]);

	return {
		target: safeTarget,
		cache,
		eps,
		dictionary,
		classification: coolEpsClassify({
			endpointsReady: eps.ready && dictionary.ready,
			cacheEntries: cache.entries
		})
	};
}

function printResult(result) {
	console.log(`[cool-eps:diagnose] target=${result.target}`);
	console.log(
		`[cool-eps:diagnose] cache=${result.cache.present ? 'present' : 'missing'} entries=${result.cache.entries}`
	);
	console.log(
		`[cool-eps:diagnose] eps=${result.eps.status || 'unreachable'} dictionary=${result.dictionary.status || 'unreachable'}`
	);
	console.log(`[cool-eps:diagnose] classification=${result.classification}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const result = await diagnoseCoolEps();
	printResult(result);
	if (['invalid-target', 'incomplete-without-api-or-cache'].includes(result.classification)) {
		process.exitCode = 1;
	}
}

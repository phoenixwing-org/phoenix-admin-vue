import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { phoenixCanonicalHostRoute } from './PhoenixHostRouteCompat';

describe('Phoenix Host legacy Pah route compatibility', () => {
	it('keeps compile-time aliases for already published plugins', () => {
		const tsconfig = readFileSync(new URL('../../tsconfig.json', import.meta.url), 'utf8');
		const coolTypes = readFileSync(new URL('../cool/types/index.ts', import.meta.url), 'utf8');

		expect(tsconfig).toContain('"/@/pah/*": ["./src/phoenix/*"]');
		expect(tsconfig).toContain('"/$/pah/*": ["./src/modules/phoenix/*"]');
		expect(coolTypes).toContain("from '../../phoenix/PahViewDialogs'");
		expect(coolTypes).not.toContain("from '../../pah/");
	});

	it('only redirects published Host deep links', () => {
		expect(phoenixCanonicalHostRoute('/pah/navigation')).toBe('/phoenix/navigation');
		expect(phoenixCanonicalHostRoute('/pah/dictionary-maintenance')).toBe(
			'/pah/dictionary-maintenance'
		);
		expect(phoenixCanonicalHostRoute('/pah/plugins')).toBe('/pah/plugins');
	});

	it('does not keep a runtime viewPath rewrite for the migrated dictionary menu', () => {
		const source = readFileSync(
			new URL('./PhoenixHostRouteCompat.ts', import.meta.url),
			'utf8'
		);
		expect(source).not.toContain('modules/pah/views/dictionary-maintenance.vue');
	});
});

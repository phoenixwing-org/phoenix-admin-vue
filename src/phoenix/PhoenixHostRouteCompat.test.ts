import { describe, expect, it } from 'vitest';
import {
	phoenixCanonicalHostRoute,
	phoenixCanonicalHostViewPath
} from './PhoenixHostRouteCompat';

describe('Phoenix Host legacy Pah route compatibility', () => {
	it('only redirects published Host deep links', () => {
		expect(phoenixCanonicalHostRoute('/pah/navigation')).toBe('/phoenix/navigation');
		expect(phoenixCanonicalHostRoute('/pah/plugins')).toBe('/pah/plugins');
	});

	it('maps the one published Host menu view path without touching plugins', () => {
		expect(phoenixCanonicalHostViewPath('modules/pah/views/dictionary-maintenance.vue')).toBe(
			'modules/phoenix/views/dictionary-maintenance.vue'
		);
		expect(phoenixCanonicalHostViewPath('modules/phoenix-open-issue/views/lists.vue')).toBe(
			'modules/phoenix-open-issue/views/lists.vue'
		);
	});
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const view = readFileSync(
	new URL('../modules/phoenix/views/maintenance.vue', import.meta.url),
	'utf8'
);
const config = readFileSync(new URL('../modules/phoenix/config.ts', import.meta.url), 'utf8');
const primary = readFileSync(new URL('./PahPluginManagementPrimary.vue', import.meta.url), 'utf8');

describe('Phoenix 系统维护 View', () => {
	it('使用 Wing 页面壳并登记唯一 Phoenix 路由', () => {
		expect(config).toContain("path: '/phoenix/maintenance'");
		expect(view).toContain('<pnw-page-layout');
		expect(view).toContain('title="系统维护"');
		expect(primary).toContain("open('/phoenix/maintenance')");
	});

	it('只调用受控 read/plan/apply API 并携带计划指纹', () => {
		expect(view).toContain("url: '/admin/phoenix/maintenance/read'");
		expect(view).toContain("url: '/admin/phoenix/maintenance/plan'");
		expect(view).toContain("url: '/admin/phoenix/maintenance/apply'");
		expect(view).toContain('expectedFingerprint: operation.fingerprint');
		expect(view).not.toMatch(/eval\(|new Function|arbitrarySql/);
	});
});

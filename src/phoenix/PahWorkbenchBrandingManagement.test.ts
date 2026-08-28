import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const view = readFileSync(
	new URL('../modules/phoenix/views/branding.vue', import.meta.url),
	'utf8'
);
const config = readFileSync(new URL('../modules/phoenix/config.ts', import.meta.url), 'utf8');
const primary = readFileSync(new URL('./PahPluginManagementPrimary.vue', import.meta.url), 'utf8');

describe('Host 工作台品牌管理入口', () => {
	it('使用 Phoenix 路由、静态快照 API 与受控 SVG multipart 上传', () => {
		expect(config).toContain("path: '/phoenix/branding'");
		expect(primary).toContain("open('/phoenix/branding')");
		expect(primary).toContain('<strong>品牌</strong>');
		expect(view).toContain("props: { active: 'branding' }");
		expect(view).toContain("url: '/admin/phoenix/plugin/workbench-branding/status'");
		expect(view).toContain("url: '/admin/phoenix/plugin/workbench-branding/save'");
		expect(view).toContain("url: '/admin/phoenix/plugin/workbench-branding/reset'");
		expect(view).toContain("data.append('files', selectedFile.value)");
		expect(view).toContain('工作台渲染期间不查询数据库');
	});
});

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
		expect(view).toContain('当前实际生效来源');
		expect(view).toContain('Host 默认品牌（备用）');
		expect(view).toContain('保存备用配置');
		expect(view).toContain('保存并应用');
		expect(view).toContain('当前整套品牌由');
		expect(view).toContain('保存后无需重启');
		expect(view).toContain('pahWorkbenchBrandingSource(status.value)');
		expect(view).not.toContain('hostBindings');
		expect(view).not.toContain('effectiveSources');
		expect(view).not.toContain('按字段');
	});

	it('提供只读运行时点检并复用 Workbench 输出通道', () => {
		expect(view).toContain('运行时点检');
		expect(view).toContain('pahCheckBrandingRuntime');
		expect(view).toContain('usePahWorkbenchBrandRuntime');
		expect(view).toContain('usePahWorkbenchOutput');
		expect(view).toContain('workbenchOutput?.appendLine(result.message)');
		const checkBody = view.slice(
			view.indexOf('function runRuntimeCheck()'),
			view.indexOf('function reportPersistenceResult')
		);
		expect(checkBody).not.toContain('service.request');
		expect(checkBody).not.toContain('save');
		expect(checkBody).not.toContain('reset');
	});
});

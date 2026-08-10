import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sampleRoot = new URL('../../examples/phoenix-site-profile-plugin/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.proposed.json', sampleRoot), 'utf8'));
const readme = readFileSync(new URL('README.md', sampleRoot), 'utf8');

describe('Phoenix 站点外观插件示例', () => {
	it('首页贡献引用同一清单的权限路由', () => {
		const homeRouteId = manifest.uiContributions.home.routeId;
		const route = manifest.routes.find((item: { id: string }) => item.id === homeRouteId);

		expect(manifest.uiContributions.contractVersion).toBe(1);
		expect(route).toMatchObject({
			moduleId: 'sample-site-profile-workbench',
			capability: 'sample-site-profile:home:read'
		});
	});

	it('使用管理员控制的品牌与启动页扩展类型', () => {
		expect(manifest.pluginType).toBe('phoenix.admin.branding');
		expect(readme).toContain('品牌与启动页扩展');
	});

	it('白标品牌覆盖明暗和紧凑 Logo，但不接管认证', () => {
		const brand = manifest.uiContributions.brand;

		expect(brand).toMatchObject({
			logo: 'assets/logo.svg',
			logoDark: 'assets/logo-dark.svg',
			compactLogo: 'assets/logo-compact.svg',
			compactLogoDark: 'assets/logo-compact-dark.svg',
			showFrameworkBranding: false
		});
		expect(readme).toContain('仍由 Host 认证面板处理');
		expect(readme).toContain('当前 Host 尚未实现');
	});

	it('所有 SVG 资源均为包内静态资源且不含可执行或外链内容', () => {
		for (const asset of [
			'logo.svg',
			'logo-dark.svg',
			'logo-compact.svg',
			'logo-compact-dark.svg',
			'favicon.svg'
		]) {
			const source = readFileSync(new URL(`assets/${asset}`, sampleRoot), 'utf8');
			expect(source).toContain('<svg');
			expect(source).not.toMatch(/<script|foreignObject|\son\w+=/iu);
			expect(source).not.toMatch(/(?:href|src)=["'](?:https?:|\/\/)/iu);
		}
	});
});

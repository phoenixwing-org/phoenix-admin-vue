import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../modules/pah/views/plugins.vue', import.meta.url), 'utf8');
const moduleConfig = readFileSync(new URL('../modules/pah/config.ts', import.meta.url), 'utf8');
const coolSource = readFileSync(
	new URL('../modules/helper/views/plugins.vue', import.meta.url),
	'utf8'
);
const primarySource = readFileSync(
	new URL('./PahPluginManagementPrimary.vue', import.meta.url),
	'utf8'
);

describe('Phoenix 插件包安装入口', () => {
	it('只选择 .phoenix.cool 并通过 Phoenix 新接口验证登记', () => {
		expect(source).toContain('accept=".phoenix.cool"');
		expect(source).toContain("file.name.endsWith('.phoenix.cool')");
		expect(source).toContain("url: '/admin/phoenix/plugin/package'");
		expect(source).toContain("data.append('files', file)");
		expect(source).toContain('旧插件后缀不兼容');
		expect(source).not.toContain('/admin/pah/plugin');
	});

	it('以卡片和三段向导完成安装，停用与卸载保持独立动作', () => {
		for (const label of [
			'添加 .phoenix.cool',
			'验证并添加',
			'运行点检',
			'受控安装',
			'启用入口',
			'安装并启用',
			'移除已选包',
			'停用',
			'卸载'
		]) {
			expect(source).toContain(label);
		}
		expect(source).toContain('class="plugin-grid"');
		expect(source).toContain('class="plugin-card"');
		expect(source).toContain('Host 将自动创建备份并完成恢复点检');
		expect(source).toContain('无需额外 pnpm 安装');
		expect(source).toContain('请先确认 API Terminal 已 ready');
		expect(source).not.toContain('第九步：停用');
		expect(source).not.toContain('第十步：备份并卸载');
		expect(source).toContain("url: '/admin/phoenix/plugin/local-runtime-status'");
		expect(source).toContain("url: '/admin/phoenix/plugin/local-controlled-install'");
		expect(source).toContain("url: '/admin/phoenix/plugin/local-controlled-uninstall'");
		expect(source).toContain("url: '/admin/phoenix/plugin/local-package-discard'");
		expect(source).toContain('src="/pah-phoenixwing-mark.svg"');
		expect(source).toContain('formatInstallationDate(installation)');
		expect(source).toContain("url: '/admin/phoenix/plugin/dictionary-plan'");
		expect(source).toContain('dictionaryFingerprint: dictionaryPlan?.fingerprint');
		expect(source).toContain('dictionaryConfirmed: true');
		expect(source).toContain('synchronizeHostAfterPluginStateChange');
		expect(source).toContain('prunePluginRoutesAndTabs');
		expect(source).toContain("['disabled', 'uninstalled'].includes(item.state)");
		expect(source).toContain('process.list.filter');
		expect(source).toContain('await menu.get()');
	});

	it('安装过程写入全局 Output，并只暴露 /phoenix/plugins 页面', () => {
		expect(source).toContain('usePahWorkbenchOutput');
		expect(source).toContain('请重启 API 后在安装向导继续');
		expect(source).toContain('插件包已添加；请在安装向导继续');
		expect(moduleConfig).toContain("path: '/phoenix/plugins'");
		expect(moduleConfig).not.toContain("path: '/pah/plugins'");
	});

	it('Cool 与 Phoenix 插件页共享通用 Primary 切换入口', () => {
		expect(coolSource).toContain("usePahViewContributions('/helper/plugins'");
		expect(source).toContain("usePahViewContributions('/phoenix/plugins'");
		expect(primarySource).toContain("open('/helper/plugins')");
		expect(primarySource).toContain("open('/phoenix/plugins')");
		expect(primarySource).toContain('aria-current');
		expect(primarySource).not.toContain('open-issue');
	});
});

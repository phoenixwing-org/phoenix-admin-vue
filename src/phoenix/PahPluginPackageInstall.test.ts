import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
	new URL('../modules/phoenix/views/plugins.vue', import.meta.url),
	'utf8'
);
const moduleConfig = readFileSync(new URL('../modules/phoenix/config.ts', import.meta.url), 'utf8');
const coolSource = readFileSync(
	new URL('../modules/helper/views/plugins.vue', import.meta.url),
	'utf8'
);
const primarySource = readFileSync(
	new URL('./PahPluginManagementPrimary.vue', import.meta.url),
	'utf8'
);
const navigationSource = readFileSync(
	new URL('../modules/phoenix/views/navigation.vue', import.meta.url),
	'utf8'
);

describe('Phoenix 插件包安装入口', () => {
	it('只选择 .phoenix.cool 并通过 Phoenix 新接口验证登记', () => {
		expect(source).toContain('accept=".phoenix.cool"');
		expect(source).toContain("file.name.endsWith('.phoenix.cool')");
		expect(source).toContain("url: '/admin/phoenix/plugin/package'");
		expect(source).toContain("data.append('files', file)");
		expect(source).toContain('result.validationChecks || []');
		expect(source).toContain('校验通过 · ${check.label}：${check.detail}');
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
		expect(source).not.toContain('自动备份');
		expect(source).not.toContain('备份证明');
		expect(source).toContain('无需额外 pnpm 安装');
		expect(source).toContain('请先确认 API Terminal 已 ready');
		expect(source).not.toContain('第九步：停用');
		expect(source).not.toContain('第十步：备份并卸载');
		expect(source).toContain("url: '/admin/phoenix/plugin/local-runtime-status'");
		expect(source).toContain("url: '/admin/phoenix/plugin/local-controlled-install'");
		expect(source).toContain("url: '/admin/phoenix/plugin/local-controlled-uninstall'");
		expect(source).toContain("url: '/admin/phoenix/plugin/local-package-discard'");
		expect(source).toContain('src="/pah-phoenixwing-mark.svg"');
		expect(source).toContain("url: '/admin/phoenix/plugin/dictionary-plan'");
		expect(source).toContain('dictionaryFingerprint: dictionaryPlan?.fingerprint');
		expect(source).toContain('dictionaryConfirmed: true');
		expect(source).toContain('synchronizeHostAfterPluginStateChange');
		expect(source).toContain('prunePluginRoutesAndTabs');
		expect(source).toContain("['disabled', 'uninstalled'].includes(item.state)");
		expect(source).toContain('process.list.filter');
		expect(source).toContain('await menu.get()');
	});

	it('消费受控卸载结果并明确展示 payload 清理与重启要求', () => {
		const uninstallSource = source.slice(
			source.indexOf('async function controlledUninstall'),
			source.indexOf('async function discardSelectedPackage')
		);
		expect(source).toContain('interface ControlledUninstallResult');
		expect(uninstallSource).toContain('result.installation');
		expect(uninstallSource).toContain('result.removedPayloads');
		expect(uninstallSource).toContain('result.cleanupPendingPayloads');
		expect(uninstallSource).toContain('result.restartRequired');
		expect(uninstallSource).toContain('已从运行目录移除：${removedDetail}');
		expect(uninstallSource).toContain('外围回收目录待清理：${cleanupPendingDetail}');
		expect(uninstallSource).toContain('duration: 0');
		expect(uninstallSource).toContain('受控重启 API/Web');
		expect(uninstallSource).toContain('重新打开登录页验证登录首帧');
		expect(uninstallSource).not.toContain('backup');
		expect(uninstallSource).not.toContain('restart(');
		expect(source).toContain("uninstall-result[data-restart-required='true']");
		expect(source).toContain("uninstall-result[data-cleanup-pending='true']");
		expect(source).toContain('无 Node/Vue payload 残留');
	});

	it('插件卡片在标签后显示名称，并把日期放到操作行右侧', () => {
		expect(source).toContain('<strong class="plugin-name">{{ installation.name }}</strong>');
		expect(source).not.toContain('class="module-id"');
		expect(source).not.toContain('class="publisher-date"');
		expect(source).toContain('class="card-action-buttons"');
		expect(source).toContain('class="installation-date"');
		expect(source).toContain('formatInstallationDate(installation)');
		expect(source).toContain('min-height: 176px;');
	});

	it('点击卡片把只读属性投影到 Primary，操作按钮不冒泡', () => {
		expect(source).toContain('@click="openPluginDetails(installation)"');
		expect(source).toContain('@keydown.enter="openPluginDetails(installation)"');
		expect(source).toContain('<footer class="card-actions" @click.stop>');
		expect(source).toContain("'is-selected': detailsModuleId === installation.moduleId");
		expect(source).toContain(':aria-pressed="detailsModuleId === installation.moduleId"');
		expect(source).toContain('props: primaryProps');
		expect(source).toContain('detailsModuleId.value = installation.moduleId');
		expect(source).not.toContain('detailsDialogVisible');
		expect(source).not.toContain('plugin-details-dialog');
	});

	it('安装过程写入全局 Output，并只暴露 /phoenix/plugins 页面', () => {
		expect(source).toContain('usePahWorkbenchOutput');
		expect(source).toContain('请重启 API 后在安装向导继续');
		expect(source).toContain('插件包已添加；请在安装向导继续');
		expect(moduleConfig).toContain("path: '/phoenix/plugins'");
		expect(moduleConfig).not.toContain("path: '/pah/plugins'");
	});

	it('Cool、Phoenix 插件与分组页共享通用 Primary 切换入口', () => {
		expect(coolSource).toContain("usePahViewContributions('/helper/plugins'");
		expect(coolSource).toContain('PnwPageLayout');
		expect(coolSource).toContain('title="Cool 插件"');
		expect(coolSource).toContain(':body-inset="false"');
		expect(coolSource).not.toContain('class="plugins__header"');
		expect(source).toContain("usePahViewContributions('/phoenix/plugins'");
		expect(source).toContain('<pnw-page-layout');
		expect(source).toContain('title="Phoenix 插件"');
		expect(source).not.toContain('class="hero"');
		expect(primarySource).toContain("open('/helper/plugins')");
		expect(primarySource).toContain("open('/phoenix/plugins')");
		expect(primarySource).toContain("open('/phoenix/navigation')");
		expect(primarySource).toContain('<strong>分组</strong>');
		expect(primarySource).toContain('导航分组与模块归属');
		expect(primarySource).toContain('aria-current');
		expect(primarySource).toContain('PnwPrimarySection');
		expect(primarySource).toContain('title="插件管理"');
		expect(primarySource).toContain('title="插件属性"');
		expect(primarySource).not.toContain('Cool 原生插件与 Phoenix 业务插件使用不同安装契约');
		expect(primarySource).not.toContain('open-issue');
		expect(navigationSource).toContain("usePahViewContributions('/phoenix/navigation'");
		expect(navigationSource).toContain("props: { active: 'groups' }");
		expect(navigationSource).toContain('<h1>导航分组管理</h1>');
	});
});

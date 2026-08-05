import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../modules/pah/views/plugins.vue', import.meta.url), 'utf8');
const moduleConfig = readFileSync(new URL('../modules/pah/config.ts', import.meta.url), 'utf8');

describe('Phoenix 插件包安装入口', () => {
	it('只选择 .phoenix.cool 并通过 Phoenix 新接口验证登记', () => {
		expect(source).toContain('accept=".phoenix.cool"');
		expect(source).toContain("file.name.endsWith('.phoenix.cool')");
		expect(source).toContain("url: '/admin/phoenix/plugin/package'");
		expect(source).toContain("data.append('files', file)");
		expect(source).toContain('旧插件后缀不兼容');
		expect(source).not.toContain('/admin/pah/plugin');
	});

	it('按选择、验证、重启检查、计划、备份、安装、字典确认、启停和卸载顺序完整显示按钮', () => {
		for (const label of [
			'第一步：选择 .phoenix.cool',
			'第二步：验证制品并登记',
			'第三步：检查 API 已重启',
			'第四步：生成计划',
			'第五步：备份并验证恢复',
			'第六步：受控安装',
			'第七步：生成字典计划',
			'第八步：启用',
			'第九步：停用',
			'第十步：备份并卸载'
		]) {
			expect(source).toContain(label);
		}
		expect(source).toContain("url: '/admin/phoenix/plugin/local-runtime-status'");
		expect(source).toContain("url: '/admin/phoenix/plugin/local-backup'");
		expect(source).toContain("url: '/admin/phoenix/plugin/local-controlled-install'");
		expect(source).toContain("url: '/admin/phoenix/plugin/local-controlled-uninstall'");
		expect(source).toContain("url: '/admin/phoenix/plugin/dictionary-plan'");
		expect(source).toContain('dictionaryFingerprint: dictionaryPlan?.fingerprint');
		expect(source).toContain('dictionaryConfirmed: true');
		expect(source).toContain('请先完成第三步：重启 API 并检查运行时');
		expect(source).toContain('当前已启用，安装流程已经完成，无需重复生成');
	});

	it('安装过程写入全局 Output，并只暴露 /phoenix/plugins 页面', () => {
		expect(source).toContain('usePahWorkbenchOutput');
		expect(source).toContain('必须完成第三步重启 API 并检查运行时');
		expect(source).toContain('插件包已校验并登记；请继续页面中的第三步');
		expect(moduleConfig).toContain("path: '/phoenix/plugins'");
		expect(moduleConfig).not.toContain("path: '/pah/plugins'");
	});
});

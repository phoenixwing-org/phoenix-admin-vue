import { describe, expect, it } from 'vitest';
import {
	PAH_DEFAULT_MODULE_GROUPS,
	pahBuildModuleGroups,
	type PahModuleGroupDefinition
} from './PahModuleGroupAdapter';
import type { PahRibbonTab } from './PahRibbonMenuAdapter';

function module(id: string, label: string): PahRibbonTab {
	return { id, label, groups: [] };
}

describe('PahModuleGroupAdapter', () => {
	it('默认把五个 Cool 模块归入两个紧凑的 Phoenix 大组', () => {
		const groups = pahBuildModuleGroups([
			module('system', '系统管理'),
			module('tutorial', '框架教程'),
			module('data', '数据管理'),
			module('user', '用户管理'),
			module('extension', '扩展管理')
		]);

		expect(groups.map(group => group.label)).toEqual(['管理', '开发']);
		expect(groups.map(group => group.modules.map(item => item.label))).toEqual([
			['系统管理', '用户管理', '数据管理', '扩展管理'],
			['框架教程']
		]);
		expect(PAH_DEFAULT_MODULE_GROUPS).toHaveLength(3);
	});

	it('不固化任何业务插件候选，未配置模块安全进入其他模块', () => {
		const groups = pahBuildModuleGroups([
			module('customer-workbench', '客户工作台'),
			module('customer-governance', '客户治理')
		]);

		expect(groups).toHaveLength(1);
		expect(groups[0].label).toBe('其他模块');
		expect(groups[0].modules.map(item => item.label)).toEqual(['客户工作台', '客户治理']);
	});

	it('允许后续用编译期配置重新组合模块', () => {
		const definitions: PahModuleGroupDefinition[] = [
			{ id: 'operations', label: '运营', moduleLabels: ['用户管理', '数据管理'] }
		];
		const groups = pahBuildModuleGroups(
			[module('data', '数据管理'), module('user', '用户管理')],
			definitions
		);

		expect(groups[0].modules.map(item => item.label)).toEqual(['用户管理', '数据管理']);
	});

	it('运行时稳定目标键优先于模块名称，可将任意插件模块移动到任意大分组', () => {
		const definitions: PahModuleGroupDefinition[] = [
			{
				id: 'business',
				label: '业务',
				moduleTargetKeys: ['plugin:example-plugin:example-plugin-workbench']
			},
			{
				id: 'management',
				label: '管理',
				moduleTargetKeys: ['plugin:example-plugin:example-plugin-governance']
			}
		];
		const workbench = module('workbench', '示例工作台');
		workbench.targetKey = 'plugin:example-plugin:example-plugin-workbench';
		const governance = module('governance', '示例治理');
		governance.targetKey = 'plugin:example-plugin:example-plugin-governance';

		const groups = pahBuildModuleGroups([workbench, governance], definitions);

		expect(
			groups.map(group => [group.label, group.modules.map(module => module.label)])
		).toEqual([
			['业务', ['示例工作台']],
			['管理', ['示例治理']]
		]);
	});

	it('保持内置业务 stable key，并允许 Host 全局修改显示名', () => {
		const plugin = module('plugin', '问题列表');
		plugin.targetKey = 'plugin:open-issue:open-issue-workbench';
		const groups = pahBuildModuleGroups(
			[plugin],
			[
				{
					id: 'pah-group-business',
					label: '业务1',
					moduleTargetKeys: ['plugin:open-issue:open-issue-workbench']
				}
			]
		);

		expect(groups).toEqual([{ id: 'pah-group-business', label: '业务1', modules: [plugin] }]);
	});

	it('自定义分组显示名修改不影响稳定归属', () => {
		const plugin = module('issue', '问题跟踪');
		plugin.targetKey = 'plugin:open-issue:open-issue-workbench';
		const groups = pahBuildModuleGroups(
			[plugin],
			[
				{
					id: 'pah-group-custom-issue',
					label: 'ISSUE1',
					moduleTargetKeys: ['plugin:open-issue:open-issue-workbench']
				}
			]
		);

		expect(groups[0]).toMatchObject({
			id: 'pah-group-custom-issue',
			label: 'ISSUE1'
		});
	});

	it('未配置的新模块进入其他模块且不会重复分配', () => {
		const definitions: PahModuleGroupDefinition[] = [
			{ id: 'base', label: '基础', moduleLabels: ['系统管理', '系统管理'] }
		];
		const groups = pahBuildModuleGroups(
			[module('system', '系统管理'), module('new', '新增模块')],
			definitions
		);

		expect(groups.map(group => group.modules.map(item => item.id))).toEqual([
			['system'],
			['new']
		]);
	});
});

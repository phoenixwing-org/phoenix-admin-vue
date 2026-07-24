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
	it('默认把五个 Cool 模块归入三个 Phoenix 大组', () => {
		const groups = pahBuildModuleGroups([
			module('system', '系统管理'),
			module('tutorial', '框架教程'),
			module('data', '数据管理'),
			module('user', '用户管理'),
			module('extension', '扩展管理')
		]);

		expect(groups.map(group => group.label)).toEqual([
			'系统与用户',
			'数据与扩展',
			'开发与示例'
		]);
		expect(groups.map(group => group.modules.map(item => item.label))).toEqual([
			['系统管理', '用户管理'],
			['数据管理', '扩展管理'],
			['框架教程']
		]);
		expect(PAH_DEFAULT_MODULE_GROUPS).toHaveLength(3);
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

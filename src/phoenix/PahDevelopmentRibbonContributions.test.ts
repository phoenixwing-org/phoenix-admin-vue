import { describe, expect, it } from 'vitest';
import {
	pahMergeDevelopmentRibbonTabs,
	pahProjectDevelopmentRibbonContributions
} from './PahDevelopmentRibbonContributions';
import type { PahRibbonTab } from './PahRibbonMenuAdapter';

const examplePluginModule = {
	name: 'example-plugin',
	options: {
		pahDevelopmentRibbon: {
			schemaVersion: 1,
			developmentOnly: true,
			moduleId: 'example-plugin',
			preferredGroupLabel: '业务',
			modules: [
				{
					id: 'example-plugin-foundation',
					label: '基础资料',
					icon: 'pnw:folder',
					groups: [
						{
							id: 'foundation-pages',
							label: '基础资料',
							items: [
								{
									id: 'items',
									label: '业务列表',
									path: '/example-plugin/items',
									icon: 'pnw:document'
								},
								{
									id: 'settings',
									label: '业务设置',
									path: '/example-plugin/settings',
									icon: 'pnw:list'
								}
							]
						}
					]
				},
				{
					id: 'example-plugin-tasks',
					label: '业务任务',
					groups: [
						{
							id: 'task-pages',
							label: '业务任务',
							items: [
								{
									id: 'tasks',
									label: '任务列表',
									path: '/example-plugin/tasks',
									icon: 'pnw:report'
								}
							]
						}
					]
				}
			]
		}
	}
};

describe('PahDevelopmentRibbonContributions', () => {
	it('只在开发态把挂载模块投影到指定 Host Ribbon 分组', () => {
		const projection = pahProjectDevelopmentRibbonContributions([examplePluginModule], true);
		expect(projection.issues).toEqual([]);
		expect(projection.tabs.map(tab => tab.label)).toEqual(['基础资料', '业务任务']);
		expect(
			projection.tabs
				.flatMap(tab => tab.groups.flatMap(group => group.items))
				.map(item => item.path)
		).toEqual(['/example-plugin/items', '/example-plugin/settings', '/example-plugin/tasks']);
		expect(projection.targetKeysByGroupLabel).toEqual({
			业务: [
				'plugin:example-plugin:example-plugin-foundation',
				'plugin:example-plugin:example-plugin-tasks'
			]
		});
		expect(projection.modules).toEqual([
			{
				targetKey: 'plugin:example-plugin:example-plugin-foundation',
				moduleId: 'example-plugin',
				label: '基础资料',
				preferredGroupLabel: '业务',
				lifecycle: 'development-mounted'
			},
			{
				targetKey: 'plugin:example-plugin:example-plugin-tasks',
				moduleId: 'example-plugin',
				label: '业务任务',
				preferredGroupLabel: '业务',
				lifecycle: 'development-mounted'
			}
		]);
	});

	it('正式环境和禁用模块均不暴露开发 Ribbon', () => {
		expect(pahProjectDevelopmentRibbonContributions([examplePluginModule], false).tabs).toEqual(
			[]
		);
		expect(
			pahProjectDevelopmentRibbonContributions(
				[{ ...examplePluginModule, enable: false }],
				true
			).tabs
		).toEqual([]);
	});

	it('正式菜单已物化时按 stable target 或 route 去重', () => {
		const development = pahProjectDevelopmentRibbonContributions(
			[examplePluginModule],
			true
		).tabs;
		const persisted: PahRibbonTab[] = [
			{
				id: 'pah-tab-42',
				label: '基础资料',
				targetKey: 'plugin:example-plugin:example-plugin-foundation',
				groups: [
					{
						id: 'pah-tab-42-group-1',
						label: '基础资料',
						items: [
							{
								pageId: 'pah-menu-43',
								label: '业务列表',
								path: '/example-plugin/items',
								menuId: 43
							}
						]
					}
				]
			}
		];
		expect(pahMergeDevelopmentRibbonTabs(persisted, development).map(tab => tab.label)).toEqual(
			['基础资料', '业务任务']
		);
	});
});

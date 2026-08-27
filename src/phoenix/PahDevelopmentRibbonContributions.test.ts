import { describe, expect, it } from 'vitest';
import {
	pahMergeDevelopmentRibbonTabs,
	pahProjectDevelopmentRibbonContributions
} from './PahDevelopmentRibbonContributions';
import type { PahRibbonTab } from './PahRibbonMenuAdapter';

const xingyuReportModule = {
	name: 'xingyu-report',
	options: {
		pahDevelopmentRibbon: {
			schemaVersion: 1,
			developmentOnly: true,
			moduleId: 'xingyu-report',
			preferredGroupLabel: '业务',
			modules: [
				{
					id: 'xingyu-report-foundation',
					label: '母版与版式',
					icon: 'pnw:folder',
					groups: [
						{
							id: 'foundation-pages',
							label: '母版与版式',
							items: [
								{
									id: 'masters',
									label: '母版管理',
									path: '/xingyu-report/masters',
									icon: 'pnw:document'
								},
								{
									id: 'templates',
									label: '小模板',
									path: '/xingyu-report/templates',
									icon: 'pnw:list'
								}
							]
						}
					]
				},
				{
					id: 'xingyu-report-tasks',
					label: '报告任务',
					groups: [
						{
							id: 'task-pages',
							label: '报告任务',
							items: [
								{
									id: 'report',
									label: '报告任务',
									path: '/xingyu-report/report',
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
		const projection = pahProjectDevelopmentRibbonContributions([xingyuReportModule], true);
		expect(projection.issues).toEqual([]);
		expect(projection.tabs.map(tab => tab.label)).toEqual(['母版与版式', '报告任务']);
		expect(
			projection.tabs
				.flatMap(tab => tab.groups.flatMap(group => group.items))
				.map(item => item.path)
		).toEqual(['/xingyu-report/masters', '/xingyu-report/templates', '/xingyu-report/report']);
		expect(projection.targetKeysByGroupLabel).toEqual({
			业务: [
				'plugin:xingyu-report:xingyu-report-foundation',
				'plugin:xingyu-report:xingyu-report-tasks'
			]
		});
	});

	it('正式环境和禁用模块均不暴露开发 Ribbon', () => {
		expect(pahProjectDevelopmentRibbonContributions([xingyuReportModule], false).tabs).toEqual(
			[]
		);
		expect(
			pahProjectDevelopmentRibbonContributions(
				[{ ...xingyuReportModule, enable: false }],
				true
			).tabs
		).toEqual([]);
	});

	it('正式菜单已物化时按 stable target 或 route 去重', () => {
		const development = pahProjectDevelopmentRibbonContributions(
			[xingyuReportModule],
			true
		).tabs;
		const persisted: PahRibbonTab[] = [
			{
				id: 'pah-tab-42',
				label: '母版与版式',
				targetKey: 'plugin:xingyu-report:xingyu-report-foundation',
				groups: [
					{
						id: 'pah-tab-42-group-1',
						label: '母版与版式',
						items: [
							{
								pageId: 'pah-menu-43',
								label: '母版管理',
								path: '/xingyu-report/masters',
								menuId: 43
							}
						]
					}
				]
			}
		];
		expect(pahMergeDevelopmentRibbonTabs(persisted, development).map(tab => tab.label)).toEqual(
			['母版与版式', '报告任务']
		);
	});
});

import { describe, expect, it } from 'vitest';
import type { PahModuleGroup } from './PahModuleGroupAdapter';
import {
	pahBuildNavigationNodes,
	pahFindNavigationItemByNodeId,
	pahFindNavigationNodeIdByPath,
	pahNavigationBranchIds
} from './PahNavigationAdapter';

const groups: PahModuleGroup[] = [
	{
		id: 'management',
		label: '管理',
		modules: [
			{
				id: 'system',
				label: '系统管理',
				groups: [
					{
						id: 'permission',
						label: '权限',
						items: [
							{
								pageId: 'pah-menu-3',
								menuId: 3,
								label: '用户',
								path: '/system/user'
							},
							{ pageId: 'pah-menu-4', menuId: 4, label: '角色', path: '/system/role' }
						]
					}
				]
			}
		]
	}
];

describe('PahNavigationAdapter', () => {
	it('用同一树表达大分组、模块和可激活 View', () => {
		const nodes = pahBuildNavigationNodes(groups, {
			group: () => 'G',
			module: () => 'M',
			item: () => '□'
		});

		expect(nodes).toEqual([
			{
				id: 'management',
				label: '管理',
				order: 0,
				icon: 'G',
				children: [
					{
						id: 'system',
						label: '系统管理',
						order: 0,
						icon: 'M',
						children: [
							{ id: 'pah-menu-3', label: '用户', order: 0, icon: '□' },
							{ id: 'pah-menu-4', label: '角色', order: 1, icon: '□' }
						]
					}
				]
			}
		]);
	});

	it('节点只保存稳定 ID，路由动作仍由 Pah 查表', () => {
		expect(pahFindNavigationItemByNodeId(groups, 'pah-menu-4')?.path).toBe('/system/role');
		expect(pahFindNavigationNodeIdByPath(groups, '/system/user')).toBe('pah-menu-3');
		expect(pahFindNavigationNodeIdByPath(groups, '/missing')).toBe('');
	});

	it('只把有子节点的 ID 交给 Tree 展开状态', () => {
		expect(pahNavigationBranchIds(pahBuildNavigationNodes(groups))).toEqual([
			'management',
			'system'
		]);
	});
});

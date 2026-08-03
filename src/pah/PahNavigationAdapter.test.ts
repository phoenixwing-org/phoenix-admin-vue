import { describe, expect, it } from 'vitest';
import type { PahModuleGroup } from './PahModuleGroupAdapter';
import {
	pahBuildNavigationNodes,
	pahFindNavigationItemByNodeId,
	pahFindNavigationNodeIdByPath,
	pahFindNavigationNodeIdByRoute,
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
				menuId: 1,
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

	it('跨多个 Ribbon 分块仍使用模块内连续顺序', () => {
		const items = Array.from({ length: 13 }, (_, index) => ({
			pageId: `page-${index + 1}`,
			menuId: index + 1,
			label: `页面 ${index + 1}`,
			path: `/pages/${index + 1}`
		}));
		const manyGroups: PahModuleGroup[] = [
			{
				id: 'business',
				label: '业务',
				modules: [
					{
						id: 'example-module',
						label: '示例模块',
						groups: [
							{ id: 'group-1', label: '常用', items: items.slice(0, 5) },
							{ id: 'group-2', label: '常用 2', items: items.slice(5, 10) },
							{ id: 'group-3', label: '常用 3', items: items.slice(10) }
						]
					}
				]
			}
		];

		const children = pahBuildNavigationNodes(manyGroups)[0]?.children?.[0]?.children;

		expect(children?.map(node => node.id)).toEqual(items.map(item => item.pageId));
		expect(children?.map(node => node.order)).toEqual(
			Array.from({ length: 13 }, (_, index) => index)
		);
	});

	it('节点只保存稳定 ID，路由动作仍由 Pah 查表', () => {
		expect(pahFindNavigationItemByNodeId(groups, 'pah-menu-4')?.path).toBe('/system/role');
		expect(pahFindNavigationNodeIdByPath(groups, '/system/user')).toBe('pah-menu-3');
		expect(pahFindNavigationNodeIdByPath(groups, '/missing')).toBe('');
	});

	it('hidden 深链按菜单父链选中所属模块且不伪造叶子节点', () => {
		const hiddenDetail: Menu.Item = {
			id: 5,
			parentId: 1,
			path: '/items/:id',
			type: 1 as Menu.Type,
			name: '详情',
			icon: 'pnw:document',
			orderNum: 2,
			isShow: false,
			children: []
		};
		const menuRoots: Menu.List = [
			{
				id: 1,
				parentId: 0,
				path: '/module-1',
				type: 0 as Menu.Type,
				name: '系统管理',
				icon: 'pnw:folder',
				orderNum: 1,
				isShow: true,
				children: [hiddenDetail]
			}
		];

		expect(pahFindNavigationNodeIdByRoute(groups, menuRoots, '/items/:id')).toBe('system');
		expect(pahFindNavigationNodeIdByRoute(groups, menuRoots, '/system/user')).toBe(
			'pah-menu-3'
		);
	});

	it('只把有子节点的 ID 交给 Tree 展开状态', () => {
		expect(pahNavigationBranchIds(pahBuildNavigationNodes(groups))).toEqual([
			'management',
			'system'
		]);
	});
});

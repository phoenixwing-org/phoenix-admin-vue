import { describe, expect, it } from 'vitest';
import {
	PAH_MENU_TYPE,
	PAH_RIBBON_GROUP_SIZE,
	pahBuildRibbonTabs,
	pahFindMenuTrail
} from './PahRibbonMenuAdapter';

function menu(id: number, type: number, name: string, children: Menu.List = []): Menu.Item {
	return {
		id,
		parentId: 0,
		path: `/menu-${id}`,
		type: type as Menu.Type,
		name,
		icon: 'menu',
		orderNum: id,
		isShow: true,
		children
	};
}

describe('PahRibbonMenuAdapter', () => {
	it('将显式二级目录映射为 Ribbon Group', () => {
		const tabs = pahBuildRibbonTabs([
			menu(1, PAH_MENU_TYPE.DIRECTORY, '系统', [
				menu(2, PAH_MENU_TYPE.DIRECTORY, '权限', [
					menu(3, PAH_MENU_TYPE.PAGE, '用户'),
					menu(4, PAH_MENU_TYPE.PAGE, '角色')
				])
			])
		]);

		expect(tabs).toHaveLength(1);
		expect(tabs[0].groups[0].label).toBe('权限');
		expect(tabs[0].groups[0].items.map(item => item.label)).toEqual(['用户', '角色']);
	});

	it('将直属菜单稳定切分为每组最多五项', () => {
		const children = Array.from({ length: PAH_RIBBON_GROUP_SIZE + 2 }, (_, index) =>
			menu(index + 2, PAH_MENU_TYPE.PAGE, `功能 ${index + 1}`)
		);
		const tabs = pahBuildRibbonTabs([menu(1, PAH_MENU_TYPE.DIRECTORY, '工具', children)]);

		expect(tabs[0].groups.map(group => group.items.length)).toEqual([5, 2]);
		expect(tabs[0].groups.map(group => group.label)).toEqual(['常用', '常用 2']);
	});

	it('过滤隐藏菜单、权限节点和空分组', () => {
		const hidden = menu(3, PAH_MENU_TYPE.PAGE, '隐藏');
		hidden.isShow = false;
		const tabs = pahBuildRibbonTabs([
			menu(1, PAH_MENU_TYPE.DIRECTORY, '系统', [
				menu(2, PAH_MENU_TYPE.PERMISSION, '编辑'),
				hidden,
				menu(4, PAH_MENU_TYPE.PAGE, '可见')
			])
		]);

		expect(tabs[0].groups).toHaveLength(1);
		expect(tabs[0].groups[0].items.map(item => item.label)).toEqual(['可见']);
	});

	it('从同一权限菜单树生成 Footer 面包屑', () => {
		const roots = [
			menu(1, PAH_MENU_TYPE.DIRECTORY, '系统管理', [
				menu(2, PAH_MENU_TYPE.DIRECTORY, '权限管理', [
					menu(3, PAH_MENU_TYPE.PAGE, '用户列表')
				])
			])
		];

		expect(pahFindMenuTrail(roots, '/menu-3').map(item => item.label)).toEqual([
			'系统管理',
			'权限管理',
			'用户列表'
		]);
		expect(pahFindMenuTrail(roots, '/missing')).toEqual([]);
	});
});

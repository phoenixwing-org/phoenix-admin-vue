import type { PahRibbonTab } from './PahRibbonMenuAdapter';

export interface PahModuleGroupDefinition {
	id: string;
	label: string;
	moduleLabels?: string[];
	moduleTargetKeys?: string[];
	orderNum?: number;
}

export interface PahModuleGroup {
	id: string;
	label: string;
	modules: PahRibbonTab[];
}

export const PAH_DEFAULT_MODULE_GROUPS: PahModuleGroupDefinition[] = [
	{
		id: 'pah-group-management',
		label: '管理',
		moduleLabels: ['系统管理', '用户管理', '数据管理', '扩展管理']
	},
	{
		id: 'pah-group-development',
		label: '开发',
		moduleLabels: ['框架教程']
	},
	{
		id: 'pah-group-business',
		label: '业务',
		moduleLabels: []
	}
];

export function pahBuildModuleGroups(
	modules: PahRibbonTab[],
	definitions: PahModuleGroupDefinition[] = PAH_DEFAULT_MODULE_GROUPS
): PahModuleGroup[] {
	const assigned = new Set<string>();
	const groups = [...definitions]
		.sort((left, right) => (left.orderNum ?? 0) - (right.orderNum ?? 0))
		.map(definition => {
			const targetKeys = definition.moduleTargetKeys || [];
			const labels = definition.moduleLabels || [];
			const candidates = [
				...targetKeys.map(key => modules.find(module => module.targetKey === key)),
				...labels.map(label => modules.find(module => module.label === label))
			];
			return {
				id: definition.id,
				label: definition.label,
				modules: candidates.filter((module): module is PahRibbonTab => {
					if (!module || assigned.has(module.id)) return false;
					assigned.add(module.id);
					return true;
				})
			};
		})
		.filter(group => group.modules.length > 0);

	const remaining = modules.filter(module => !assigned.has(module.id));
	if (remaining.length > 0) {
		groups.push({ id: 'pah-group-other', label: '其他模块', modules: remaining });
	}

	return groups;
}

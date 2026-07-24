import type { PahRibbonTab } from './PahRibbonMenuAdapter';

export interface PahModuleGroupDefinition {
	id: string;
	label: string;
	moduleLabels: string[];
}

export interface PahModuleGroup {
	id: string;
	label: string;
	modules: PahRibbonTab[];
}

export const PAH_DEFAULT_MODULE_GROUPS: PahModuleGroupDefinition[] = [
	{
		id: 'pah-group-system-user',
		label: '系统与用户',
		moduleLabels: ['系统管理', '用户管理']
	},
	{
		id: 'pah-group-data-extension',
		label: '数据与扩展',
		moduleLabels: ['数据管理', '扩展管理']
	},
	{
		id: 'pah-group-development',
		label: '开发与示例',
		moduleLabels: ['框架教程']
	}
];

export function pahBuildModuleGroups(
	modules: PahRibbonTab[],
	definitions: PahModuleGroupDefinition[] = PAH_DEFAULT_MODULE_GROUPS
): PahModuleGroup[] {
	const assigned = new Set<string>();
	const groups = definitions
		.map(definition => ({
			id: definition.id,
			label: definition.label,
			modules: definition.moduleLabels
				.map(label => modules.find(module => module.label === label))
				.filter((module): module is PahRibbonTab => {
					if (!module || assigned.has(module.id)) return false;
					assigned.add(module.id);
					return true;
				})
		}))
		.filter(group => group.modules.length > 0);

	const remaining = modules.filter(module => !assigned.has(module.id));
	if (remaining.length > 0) {
		groups.push({ id: 'pah-group-other', label: '其他模块', modules: remaining });
	}

	return groups;
}

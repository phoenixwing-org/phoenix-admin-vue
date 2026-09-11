import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PAH_NAVIGATION_GROUPS_CHANGED_EVENT } from './PahNavigationGroupEvents';

const management = readFileSync(
	new URL('../modules/phoenix/views/navigation.vue', import.meta.url),
	'utf8'
);
const shell = readFileSync(new URL('./PahWorkbenchShell.vue', import.meta.url), 'utf8');

describe('Host 全局导航分组显示名', () => {
	it('保存或删除分组后通知活动工作台重读权威配置', () => {
		expect(management).toContain('notifyNavigationGroupsChanged()');
		expect(management).toContain(`mitt.emit(PAH_NAVIGATION_GROUPS_CHANGED_EVENT)`);
		expect(shell).toContain(
			`mitt.on(PAH_NAVIGATION_GROUPS_CHANGED_EVENT, handleNavigationGroupsChanged)`
		);
		expect(shell).toContain(
			`mitt.off(PAH_NAVIGATION_GROUPS_CHANGED_EVENT, handleNavigationGroupsChanged)`
		);
		expect(PAH_NAVIGATION_GROUPS_CHANGED_EVENT).toBe('phoenix.navigation-groups.changed');
	});

	it('工作台使用服务端稳定 groupKey，而不是标签或数据库数字 id', () => {
		expect(shell).toContain('id: group.groupKey');
		expect(shell).toContain('targetKeysByGroupId[group.groupKey]');
		expect(shell).not.toContain('id: `pah-group-${group.id}`');
	});
});

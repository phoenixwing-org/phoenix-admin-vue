import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DICT_TYPE_KEY_MAX_LENGTH, isValidDictTypeKey } from './type-key';

const dictViewSource = readFileSync(new URL('../views/list.vue', import.meta.url), 'utf8');
const maintenanceViewSource = readFileSync(
	new URL('../../phoenix/views/dictionary-maintenance.vue', import.meta.url),
	'utf8'
);

describe('Cool 字典 type key', () => {
	it('兼容 Host 短 key 与插件稳定命名空间', () => {
		expect(isValidDictTypeKey('brand')).toBe(true);
		expect(isValidDictTypeKey('phoenix-open-issue.issueCategory')).toBe(true);
	});

	it('拒绝空格、路径、非法开头与超长 key', () => {
		expect(isValidDictTypeKey('phoenix open issue')).toBe(false);
		expect(isValidDictTypeKey('phoenix/open-issue')).toBe(false);
		expect(isValidDictTypeKey('.hidden')).toBe(false);
		expect(isValidDictTypeKey(`a${'b'.repeat(DICT_TYPE_KEY_MAX_LENGTH)}`)).toBe(false);
	});

	it('把 namespace 长度和格式校验挂在 Key 字段而不是名称字段', () => {
		const nameField = dictViewSource.slice(
			dictViewSource.indexOf("prop: 'name'"),
			dictViewSource.indexOf("prop: 'key'")
		);
		const keyField = dictViewSource.slice(
			dictViewSource.indexOf("prop: 'key'"),
			dictViewSource.indexOf('// cl-upsert')
		);

		expect(nameField).toContain('maxlength: 20');
		expect(nameField).not.toContain('isValidDictTypeKey');
		expect(keyField).toContain('maxlength: DICT_TYPE_KEY_MAX_LENGTH');
		expect(keyField).toContain('isValidDictTypeKey');
	});

	it('字典列表呈现治理字段，维护页只走 Pah plan/reconcile/ledger', () => {
		for (const field of [
			"prop: 'enabled'",
			"prop: 'tags'",
			"prop: 'core'",
			"prop: 'ownerModuleId'"
		]) {
			expect(dictViewSource).toContain(field);
		}
		expect(maintenanceViewSource).toContain('/admin/phoenix/plugin/dictionary-plan');
		expect(maintenanceViewSource).toContain('/admin/phoenix/plugin/dictionary-reconcile');
		expect(maintenanceViewSource).toContain('/admin/phoenix/plugin/dictionary-records');
		expect(maintenanceViewSource).not.toContain('ALTER TABLE dict_');
	});

	it('字典维护页委托 PageLayout 独立滚动并把操作写入全局 Output', () => {
		expect(maintenanceViewSource).toContain('height: 100%;');
		expect(maintenanceViewSource).toContain('min-height: 0;');
		expect(maintenanceViewSource).toContain(':body-scroll="true"');
		expect(maintenanceViewSource).toContain('usePahWorkbenchOutput');
		expect(maintenanceViewSource).toContain(
			'workbenchOutput?.appendLine(`[字典维护] ${message}`)'
		);
		expect(maintenanceViewSource).toContain('dry-run 完成');
		expect(maintenanceViewSource).toContain('补全完成');
		expect(maintenanceViewSource).toContain(':data="planRows"');
		expect(maintenanceViewSource).toContain('label="稳定值"');
		expect(maintenanceViewSource).toContain('label="动作"');
		expect(maintenanceViewSource).not.toContain('class="type-plans"');
	});

	it('字典管理默认列宽保持紧凑，长文本用溢出提示', () => {
		expect(dictViewSource).toContain("{ label: t('ID'), prop: 'id', width: 72 }");
		expect(dictViewSource).toContain("label: '状态',\n\t\t\tprop: 'enabled',\n\t\t\twidth: 72");
		expect(dictViewSource).toContain(
			"label: '标签',\n\t\t\tprop: 'tags',\n\t\t\tminWidth: 120"
		);
		expect(dictViewSource).toContain(
			"label: '治理',\n\t\t\tprop: 'core',\n\t\t\tminWidth: 140"
		);
		expect(dictViewSource).toContain("type: 'op',\n\t\t\twidth: 132");
		expect(dictViewSource).toContain("buttons: ['slot-actions']");
		expect(dictViewSource).toContain('aria-label="新增子项"');
		expect(dictViewSource).toContain('aria-label="编辑"');
		expect(dictViewSource).toContain('aria-label="删除"');
		expect(dictViewSource).toContain('#column-enabled');
		expect(dictViewSource).toContain('changeEnabled(scope.row, $event)');
		expect(dictViewSource).toContain('service.dict.info.update({ id: row.id, enabled })');
		expect(dictViewSource).not.toContain("label: '启用',\n\t\t\tprop: 'enabled'");
		expect(dictViewSource).toContain('<template #slot-tags>');
		expect(dictViewSource).toContain('@keydown.enter.prevent="commitTagDraft()"');
		expect(dictViewSource).toContain('tagValues.value = normalizeTags(data.tags)');
		expect(dictViewSource).toContain('if (!commitTagDraft()) return;');
		expect(dictViewSource).toContain('tags: [...tagValues.value]');
		expect(dictViewSource).not.toContain('allowCreate: true');
		expect(dictViewSource).toContain("label: t('名称'),\n\t\t\tprop: 'name',\n\t\t\tspan: 12");
	});
});

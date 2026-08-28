import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const viewSource = readFileSync(
	new URL('../modules/phoenix/views/dictionary-maintenance.vue', import.meta.url),
	'utf8'
);
const primarySource = readFileSync(
	new URL('./PahDictionaryMaintenancePrimary.vue', import.meta.url),
	'utf8'
);
const managementPrimarySource = readFileSync(
	new URL('./PahPluginManagementPrimary.vue', import.meta.url),
	'utf8'
);
const configSource = readFileSync(new URL('../modules/phoenix/config.ts', import.meta.url), 'utf8');

describe('Pah 字典维护 Primary', () => {
	it('只登记 Phoenix 规范深链，不保留 Pah 旧路由', () => {
		expect(configSource).toContain("path: '/phoenix/dictionary-maintenance'");
		expect(configSource).toContain("import('./views/dictionary-maintenance.vue')");
		expect(configSource).not.toContain("path: '/pah/dictionary-maintenance'");
	});

	it('使用标准 PageLayout 和 Workbench Primary 承载业务插件选择', () => {
		expect(viewSource).toContain('<pnw-page-layout');
		expect(viewSource).toContain('title="字典维护"');
		expect(viewSource).not.toContain('eyebrow="PAH · COOL DICTIONARY"');
		expect(viewSource).not.toContain('description="按插件 manifest');
		expect(viewSource).toContain("usePahViewContributions('/phoenix/dictionary-maintenance'");
		expect(viewSource).not.toContain('class="panel selector-panel"');
		expect(primarySource).not.toContain('PnwPrimaryPanel');
		expect(managementPrimarySource).toContain('PnwPrimaryPanel');
		expect(managementPrimarySource).toContain("active === 'dictionary'");
		expect(viewSource).toContain('component: markRaw(PahPluginManagementPrimary)');
		expect(primarySource).toContain('title="业务插件"');
		expect(primarySource).toContain('title="dry-run 计划"');
	});

	it('默认不读取 dry-run，首次展开计划 Section 后才懒加载', () => {
		expect(primarySource).toContain(':default-expanded="false"');
		expect(primarySource).toContain('@toggle="onDryRunToggle"');
		expect(primarySource).toContain('void props.onLoadPlan()');
		expect(viewSource).toContain(
			'if (plan.value && selectedModuleId.value) await refreshPlan()'
		);
		expect(viewSource).not.toContain('@change="refreshPlan({ emitOutput: true })"');
	});

	it('切换插件会清空旧计划和 ledger，避免跨插件残留', () => {
		expect(viewSource).toContain('function selectDictionaryModule(moduleId: string)');
		expect(viewSource).toContain('plan.value = undefined');
		expect(viewSource).toContain('records.value = []');
	});
});

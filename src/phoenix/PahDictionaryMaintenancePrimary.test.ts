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

describe('Pah 字典维护 Primary', () => {
	it('使用标准 PageLayout 和 Workbench Primary 承载业务插件选择', () => {
		expect(viewSource).toContain('<pnw-page-layout');
		expect(viewSource).toContain('title="字典维护"');
		expect(viewSource).toContain("usePahViewContributions('/phoenix/dictionary-maintenance'");
		expect(viewSource).not.toContain('class="panel selector-panel"');
		expect(primarySource).toContain('PnwPrimaryPanel');
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

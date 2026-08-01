import { describe, expect, it } from 'vitest';
import { pnwViewBlockComponentAvailability } from 'phoenix-wing/composables/pnwViewBlockComponents';
import type { PahViewBlockComponentContributions } from './PahViewContributions';
import { pahWithWorkbenchBottomBlock } from './PahWorkbenchBlocks';

const workbenchBottom = { component: { name: 'PahWorkbenchBottom' } };

describe('PahWorkbenchBlocks', () => {
	it('没有 View Bottom 时仍提供应用级 Bottom 布局能力', () => {
		const blocks = pahWithWorkbenchBottomBlock({}, workbenchBottom);

		expect(pnwViewBlockComponentAvailability(blocks)).toEqual({
			primary: false,
			bottom: true,
			secondary: false
		});
		expect(blocks.bottom).toBe(workbenchBottom);
	});

	it('只透传 View 的 Primary/Secondary', () => {
		const viewBottom = { component: { name: 'ViewBottom' } };
		const primary = { component: { name: 'ViewPrimary' } };
		const secondary = { component: { name: 'ViewSecondary' } };
		const unexpectedRuntimeBlocks = {
			primary,
			bottom: viewBottom,
			secondary
		} as PahViewBlockComponentContributions;
		const blocks = pahWithWorkbenchBottomBlock(unexpectedRuntimeBlocks, workbenchBottom);

		expect(blocks).toEqual({ primary, bottom: workbenchBottom, secondary });
	});
});

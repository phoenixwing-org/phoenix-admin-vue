import { describe, expect, it } from 'vitest';
import { pnwViewBlockComponentAvailability } from 'phoenix-wing/composables/pnwViewBlockComponents';
import type { PahViewBlockComponentContributions } from './PahViewContributions';
import { pahWorkbenchSideBlocks } from './PahWorkbenchBlocks';

const workbenchBottom = { component: { name: 'PahWorkbenchBottom' } };

describe('PahWorkbenchBlocks', () => {
	it('应用级 default Bottom 独立决定布局可用性', () => {
		const blocks = pahWorkbenchSideBlocks({});

		expect(pnwViewBlockComponentAvailability(blocks, workbenchBottom)).toEqual({
			primary: false,
			bottom: true,
			secondary: false
		});
		expect(blocks.bottom).toBeUndefined();
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
		const blocks = pahWorkbenchSideBlocks(unexpectedRuntimeBlocks);

		expect(blocks).toEqual({ primary, secondary });
	});
});

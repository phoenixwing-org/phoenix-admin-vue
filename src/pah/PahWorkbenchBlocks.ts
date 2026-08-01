import type { PnwViewBlockComponentContributions } from 'phoenix-wing/types/PnwWorkbenchVue';
import type { PahViewBlockComponentContributions } from './PahViewContributions';

/**
 * Bottom 是应用级工作台布局能力，始终使用工作台自己的 Block。
 * 显式挑选 Primary/Secondary，确保即使运行时收到额外字段也不会让 View 注入 Bottom。
 */
export function pahWithWorkbenchBottomBlock(
	viewBlocks: PahViewBlockComponentContributions,
	workbenchBottom: NonNullable<PnwViewBlockComponentContributions['bottom']>
): PnwViewBlockComponentContributions {
	return {
		...(viewBlocks.primary ? { primary: viewBlocks.primary } : {}),
		bottom: workbenchBottom,
		...(viewBlocks.secondary ? { secondary: viewBlocks.secondary } : {})
	};
}

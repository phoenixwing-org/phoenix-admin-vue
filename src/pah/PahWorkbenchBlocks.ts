import type { PnwViewBlockComponentContributions } from 'phoenix-wing/types/PnwWorkbenchVue';
import type { PahViewBlockComponentContributions } from './PahViewContributions';

/**
 * Bottom 是应用级工作台布局能力，通过 Shell.defaultBottomBlock 单独提供。
 * 此处只挑选 Primary/Secondary，确保运行时额外字段也不能让 View 注入 Bottom。
 */
export function pahWorkbenchSideBlocks(
	viewBlocks: PahViewBlockComponentContributions
): PnwViewBlockComponentContributions {
	return {
		...(viewBlocks.primary ? { primary: viewBlocks.primary } : {}),
		...(viewBlocks.secondary ? { secondary: viewBlocks.secondary } : {})
	};
}

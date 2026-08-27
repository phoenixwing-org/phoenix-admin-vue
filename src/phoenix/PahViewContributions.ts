import {
	pnwCreateViewContributionRegistry,
	usePnwViewContribution
} from 'phoenix-wing/composables/usePnwViewContribution';
import type { PnwViewBlockComponentContributions } from 'phoenix-wing/types/PnwWorkbenchVue';
import type { MaybeRefOrGetter } from 'vue';

/** Pah 业务 View 只能贡献两侧区域；Bottom 归工作台所有。 */
export type PahViewBlockComponentContributions = Pick<
	PnwViewBlockComponentContributions,
	'primary' | 'secondary'
>;

/**
 * Pah 为自己的工作台创建隔离 registry；Wing 不持有任何 Admin View 或 Router 状态。
 */
export function pahCreateViewContributionRegistry() {
	return pnwCreateViewContributionRegistry<PahViewBlockComponentContributions>();
}

export const pahViewContributionRegistry = pahCreateViewContributionRegistry();

/**
 * 业务 View 在 setup 中只登记 Primary/Secondary 的内容组件与 props。
 * 实际 UI 由 PnwWorkbenchShell 的 Primary/Secondary 容器渲染并控制显隐、位置和尺寸；
 * Bottom 始终由工作台壳层拥有和控制。
 */
export function usePahViewContributions(
	viewId: MaybeRefOrGetter<string | null | undefined>,
	contributions: PahViewBlockComponentContributions
): void {
	usePnwViewContribution(pahViewContributionRegistry, viewId, contributions);
}

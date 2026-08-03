import { inject, provide, type InjectionKey } from 'vue';
import type { PnwOutputBuffer } from 'phoenix-wing';

/** View 只向框架发送自由文本信号，不直接持有 Bottom 组件或布局状态。 */
export interface PahWorkbenchOutput {
	append(value: string): void;
	appendLine(value: string): void;
	replace(value: string): void;
	clear(): void;
}

const PAH_WORKBENCH_OUTPUT: InjectionKey<PahWorkbenchOutput> = Symbol('pah.workbench.output');

export function pahCreateWorkbenchOutput(
	buffer: Pick<PnwOutputBuffer, 'dispatch'>
): PahWorkbenchOutput {
	return Object.freeze({
		append(value: string) {
			buffer.dispatch({ type: 'append', value });
		},
		appendLine(value: string) {
			buffer.dispatch({ type: 'appendLine', value });
		},
		replace(value: string) {
			buffer.dispatch({ type: 'replace', value });
		},
		clear() {
			buffer.dispatch({ type: 'clear' });
		}
	});
}

export function pahProvideWorkbenchOutput(output: PahWorkbenchOutput): void {
	provide(PAH_WORKBENCH_OUTPUT, output);
}

/** 当前组件不在 Workbench 树内时返回 undefined，由调用方决定是否忽略。 */
export function usePahWorkbenchOutput(): PahWorkbenchOutput | undefined {
	return inject(PAH_WORKBENCH_OUTPUT);
}

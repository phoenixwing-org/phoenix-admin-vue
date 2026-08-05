import { describe, expect, it } from 'vitest';
import { pnwCreateOutputBuffer } from 'phoenix-wing';
import { pahCreateWorkbenchOutput } from './PahWorkbenchOutput';

describe('PahWorkbenchOutput', () => {
	it('把 View 的自由文本信号投影到当前 Workbench Output', () => {
		const buffer = pnwCreateOutputBuffer();
		const output = pahCreateWorkbenchOutput(buffer);

		output.append('[Runtime] ');
		output.appendLine('Phoenix Admin');
		output.appendLine('工作台已就绪');

		expect(buffer.getSnapshot().text).toBe(
			'[Runtime] Phoenix Admin\n工作台已就绪\n'
		);
	});

	it('支持 replace 与 clear，且不引入频道或级别参数', () => {
		const buffer = pnwCreateOutputBuffer({ initialText: '旧输出' });
		const output = pahCreateWorkbenchOutput(buffer);

		output.replace('新输出\n');
		expect(buffer.getSnapshot().text).toBe('新输出\n');
		output.clear();
		expect(buffer.getSnapshot().text).toBe('');
	});
});

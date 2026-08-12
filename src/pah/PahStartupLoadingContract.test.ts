import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../..');

describe('Admin 启动层可见失败契约', () => {
	it('显示正向计时、8 秒慢启动提示、12 秒错误态和安全操作', () => {
		const html = readFileSync(path.join(root, 'index.html'), 'utf8');

		expect(html).toContain("stage: '加载前端模块'");
		expect(html).toContain('seconds >= 8');
		expect(html).toContain('seconds >= 12');
		expect(html).toContain('启动时间较长');
		expect(html).toContain('启动超时');
		expect(html).toContain('data-pah-startup-retry');
		expect(html).toContain("window.location.assign('/login?reauth=1')");
		const diagnosticBlock = html.slice(
			html.indexOf("stage: '加载前端模块'"),
			html.indexOf('<script type="module"')
		);
		expect(diagnosticBlock).not.toMatch(/password|verifyCode|responseBody/i);
	});

	it('Vue 挂载成功停止计时，启动异常冻结错误层并记录安全编号', () => {
		const main = readFileSync(path.join(root, 'src/main.ts'), 'utf8');

		expect(main).toContain('finishStartup()');
		expect(main).toContain("startup.stage = '前端启动失败'");
		expect(main).toContain("loading?.classList.add('is-timeout')");
		expect(main).toContain('startup.attemptId');
	});
});

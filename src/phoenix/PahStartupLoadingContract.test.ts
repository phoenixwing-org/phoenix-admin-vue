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
		expect(html).toContain('startup.timedOut = true');
		expect(html).toContain('startup.completed = true');
		expect(html).toContain('window.clearInterval(startup.timer)');
		expect(html).toContain('.preload__wrap.is-timeout .preload__loading');
		expect(html).toContain('animation: none');
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
		expect(main).toContain('if (startup?.timedOut)');
		expect(main).toContain('忽略超时后的迟到完成');
		expect(main).toContain('忽略超时后的迟到失败');
		expect(main).toContain("startup.stage = '前端启动失败'");
		expect(main).toContain("loading?.classList.add('is-timeout')");
		expect(main).toContain('startup.attemptId');
		expect(main).toContain('safeStartupError(error)');
		expect(main).not.toContain("console.error('[Admin 启动] 前端启动失败', error)");
	});

	it('菜单文件选择器不绕过 Host 插件健康隔离', () => {
		const chooser = readFileSync(
			path.join(root, 'src/modules/base/components/menu/file.vue'),
			'utf8'
		);

		expect(chooser).toContain("from 'virtual:phoenix-admin-plugin-routes'");
		expect(chooser).toContain('...phoenixPluginRouteFiles');
		expect(chooser).not.toContain("'/src/modules/*/{views,pages}/**/*.vue'");
	});
});

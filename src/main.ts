import { createApp } from 'vue';
import App from './App.vue';
import { bootstrap } from './cool';
import 'phoenix-wing/style.css';

const app = createApp(App);

function safeStartupError(error: unknown) {
	const raw =
		error instanceof Error
			? `${error.name}: ${error.message}`
			: typeof error === 'string'
				? error
				: 'unknown startup error';
	return raw
		.replace(/(Bearer\s+)\S+/gi, '$1[redacted]')
		.replace(
			/([?&](?:access_?token|refresh_?token|token|password|verifyCode|code|state|ticket)=)[^&\s]*/gi,
			'$1[redacted]'
		)
		.replace(/(?:[A-Za-z]:\\|\/Users\/|\/home\/)[^\s'"\])]+/g, '[local-path]')
		.slice(0, 300);
}

function finishStartup() {
	const startup = window.__PAH_ADMIN_STARTUP__;
	if (!startup) return;
	startup.completed = true;
	window.clearInterval(startup.timer);
}

function failStartup(error: unknown) {
	const startup = window.__PAH_ADMIN_STARTUP__;
	if (startup?.timedOut) {
		console.warn(`[Admin 启动] 忽略超时后的迟到失败 attemptId=${startup.attemptId}`);
		return;
	}
	if (startup) {
		startup.stage = '前端启动失败';
		startup.completed = true;
		window.clearInterval(startup.timer);
	}
	const loading = document.getElementById('Loading');
	loading?.classList.add('is-timeout');
	const title = loading?.querySelector('.preload__title');
	const subTitle = loading?.querySelector('.preload__sub-title');
	if (title) title.textContent = '前端启动失败';
	if (subTitle) subTitle.textContent = startup ? `故障编号 · ${startup.attemptId}` : '';
	console.error(`[Admin 启动] 前端启动失败 detail=${safeStartupError(error)}`);
}

// 启动
bootstrap(app)
	.then(() => {
		const startup = window.__PAH_ADMIN_STARTUP__;
		if (startup?.timedOut) {
			console.warn(`[Admin 启动] 忽略超时后的迟到完成 attemptId=${startup.attemptId}`);
			return;
		}
		app.mount('#app');
		finishStartup();
	})
	.catch(err => {
		failStartup(err);
	});

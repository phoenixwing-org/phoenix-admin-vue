import { createPinia } from 'pinia';
import { type App } from 'vue';
import { createModule, loadPhoenixPluginModules } from './module';
import { router } from '../router';
import { Loading } from '../utils';
import { createEps } from './eps';
import 'virtual:svg-register';
import { usePahPublicLoginBrandStore } from '/@/phoenix/PahPublicLoginBrandStore';

export async function bootstrap(app: App) {
	// pinia
	const pinia = createPinia();
	app.use(pinia);
	// 公开登录品牌必须在模块 install 与 Vue mount 之前完成二次校验和 Store 初始化。
	usePahPublicLoginBrandStore(pinia).initialize();

	// 路由
	app.use(router);

	// Phoenix 外部插件逐个隔离加载；单插件失败不能拖垮纯 Host。
	await loadPhoenixPluginModules();

	// 模块
	const { eventLoop } = createModule(app);

	// eps
	createEps();

	// 加载
	Loading.set([eventLoop()]);
}

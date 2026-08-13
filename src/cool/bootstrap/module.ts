import { type App, type Directive } from 'vue';
import { assign, isFunction, orderBy, mergeWith } from 'lodash-es';
import { filename } from '../utils';
import { module } from '../module';
import { hmr } from '../hooks';
import { config } from '/@/config';
import phoenixPluginRuntimeLoaders from 'virtual:phoenix-admin-plugin-runtime';

// 扫描文件
const files = import.meta.glob(
	[
		'/src/modules/{base,demo,dict,helper,pah,recycle,space,task,user}/{config.ts,service/**,directives/**}',
		'/src/plugins/*/{config.ts,service/**,directives/**}'
	],
	{ eager: true, import: 'default' }
);
const phoenixPluginModules = new WeakMap<object, string>();

function reportPhoenixPluginFailure(name: string, phase: string, error: unknown) {
	console.error(
		`[phoenix-plugin-health] host=web module=${name} state=quarantined phase=${phase} detail=插件已隔离，纯 Host 继续`,
		error
	);
}

// 模块列表
module.list = hmr.getData('modules', []);

// 解析
function parseFiles(input: Record<string, unknown>) {
	for (const i in input) {
		// 分割
		const [, , type, name, action] = i.split('/');

		// 文件名
		const n = filename(i);

		// 文件内容
		const v = input[i];

		// 模块是否存在
		const m = module.get(name);

		// 数据
		const d = m || {
			name,
			type,
			value: null,
			services: [],
			directives: []
		};

		// 配置
		if (action == 'config.ts') {
			d.value = v;
		}
		// 服务
		else if (action == 'service') {
			const s = new (v as any)();

			if (s) {
				d.services?.push({
					path: s.namespace,
					value: s
				});
			}
		}
		// 指令
		else if (action == 'directives') {
			d.directives?.push({ name: n, value: v as Directive });
		}

		if (!m) {
			module.add(d);
		}
	}
}

parseFiles(files);

export async function loadPhoenixPluginModules() {
	for (const plugin of phoenixPluginRuntimeLoaders) {
		const startedAt = performance.now();
		try {
			const entries = await plugin.load();
			parseFiles(Object.fromEntries(entries));
			const loadedModule = module.get(plugin.moduleId);
			if (loadedModule) phoenixPluginModules.set(loadedModule, plugin.moduleId);
			console.info(
				`[phoenix-plugin-health] host=web module=${plugin.moduleId} state=ready version=${plugin.version} elapsed=${Math.round(performance.now() - startedAt)}ms`
			);
		} catch (error) {
			console.error(
				`[phoenix-plugin-health] host=web module=${plugin.moduleId} state=quarantined detail=模块运行入口加载失败 elapsed=${Math.round(performance.now() - startedAt)}ms`,
				error
			);
		}
	}
}

// 创建
export function createModule(app: App) {
	// 排序
	module.list.forEach(e => {
		let d;
		try {
			d = isFunction(e.value) ? e.value(app) : e.value;
		} catch (error) {
			if (!phoenixPluginModules.has(e)) throw error;
			e.enable = false;
			reportPhoenixPluginFailure(phoenixPluginModules.get(e)!, 'config', error);
			return;
		}

		if (d) {
			assign(e, d);
		}

		if (!d.order) {
			e.order = 0;
		}
	});

	const list = orderBy(module.list, 'order', 'desc').map(e => {
		if (e.enable !== false) {
			// 初始化
			try {
				e.install?.(app, e.options);
			} catch (error) {
				if (!phoenixPluginModules.has(e)) throw error;
				e.enable = false;
				reportPhoenixPluginFailure(phoenixPluginModules.get(e)!, 'install', error);
				return e;
			}

			// 注册组件
			e.components?.forEach(async (c: any) => {
				try {
					const v = await (isFunction(c) ? c() : c);
					const n = v.default || v;

					if (n.name) {
						app.component(n.name, n);
					}
				} catch (error) {
					if (!phoenixPluginModules.has(e)) throw error;
					reportPhoenixPluginFailure(phoenixPluginModules.get(e)!, 'component', error);
				}
			});

			// 注册指令
			e.directives?.forEach(v => {
				app.directive(v.name, v.value);
			});

			// 合并忽略配置
			config.ignore = mergeWith({}, config.ignore, e.ignore, (a, b) => a?.concat(b));
		}

		// 附加值
		e.pages?.forEach(v => {
			v.isPage = true;
		});

		return e;
	});

	return {
		// 模块列表
		list,
		// 事件加载
		async eventLoop() {
			const events: any = {};

			for (let i = 0; i < list.length; i++) {
				if (list[i].onLoad) {
					const name = list[i].name;
					const startedAt = performance.now();
					if (import.meta.env.DEV) console.info(`[Admin 启动] 模块 ${name} 开始加载`);
					try {
						assign(events, await list[i]?.onLoad?.(events));
						if (import.meta.env.DEV) {
							console.info(
								`[Admin 启动] 模块 ${name} 加载完成 (${Math.round(performance.now() - startedAt)}ms)`
							);
						}
					} catch (error) {
						console.error(
							`[Admin 启动] 模块 ${name} 加载失败 (${Math.round(performance.now() - startedAt)}ms)`,
							error
						);
						if (!phoenixPluginModules.has(list[i])) throw error;
						list[i].enable = false;
						reportPhoenixPluginFailure(
							phoenixPluginModules.get(list[i])!,
							'onLoad',
							error
						);
					}
				}
			}
		}
	};
}

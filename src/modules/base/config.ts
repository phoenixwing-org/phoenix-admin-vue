import { type ModuleConfig } from '/@/cool';
import { useStore } from './store';
import { t } from '/@/plugins/i18n';
import './static/css/index.scss';
import { usePahPublicLoginBrandStore } from '/@/pah/PahPublicLoginBrandStore';
import { pahPublicLoginTitle } from '/@/pah/PahPublicLoginBranding';

export default (): ModuleConfig => {
	return {
		order: 99,
		ignore: {
			NProgress: [
				'/base/open/eps',
				'/base/comm/person',
				'/base/comm/permmenu',
				'/base/comm/upload',
				'/base/comm/uploadMode'
			],
			token: ['/login', '/oauth/callback', '/401', '/403', '/404', '/500', '/502']
		},
		components: Object.values(import.meta.glob('./components/**/*.{vue,tsx}')),
		views: [
			{
				path: '/my/info',
				meta: {
					label: t('个人中心')
				},
				component: () => import('./views/info.vue')
			}
		],
		pages: [
			{
				path: '/login',
				component: () => import('./pages/login/index.vue')
			},
			{
				path: '/oauth/callback',
				meta: {
					process: false
				},
				component: () => import('./pages/login/oauth-callback.vue')
			},
			...['401', '403', '404', '500', '502'].map(code => {
				return {
					path: `/${code}`,
					meta: {
						process: false
					},
					component: () => import(`./pages/error/${code}.vue`)
				};
			})
		],
		install() {
			const branding = usePahPublicLoginBrandStore().current;
			// 设置标题
			document.title = pahPublicLoginTitle(branding);

			// 设置加载文案
			const loading = document.querySelector('#Loading');

			if (loading) {
				const logo = loading.querySelector<HTMLImageElement>('.preload__logo');
				const name = loading.querySelector('.preload__name');
				const title = loading.querySelector('.preload__title');
				const subTitle = loading.querySelector('.preload__sub-title');

				if (logo) {
					logo.src = branding.assets.logoDark.url;
				}
				if (name) {
					name.textContent = branding.appName;
				}
				if (title) {
					title.textContent = branding.login.prompt;
				}
				if (subTitle) {
					subTitle.textContent = '';
				}
			}
		},
		async onLoad() {
			const { user, menu, app } = useStore();

			// token 事件
			async function hasToken(cb: () => Promise<any> | void) {
				if (cb) {
					app.addEvent('hasToken', cb);

					if (user.token) {
						await cb();
					}
				}
			}

			await hasToken(async () => {
				if (import.meta.env.DEV) console.info('[Admin 启动] 加载用户与菜单');
				await Promise.all([user.get(), menu.get()]);
				if (import.meta.env.DEV) console.info('[Admin 启动] 用户与菜单加载完成');
			});

			return {
				hasToken
			};
		}
	};
};

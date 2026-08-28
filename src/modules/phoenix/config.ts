import { type ModuleConfig } from '/@/cool';

/** Phoenix Admin Host 前端模块。 */
export default (): ModuleConfig => {
	return {
		order: 80,
		views: [
			{
				path: '/phoenix/branding',
				meta: {
					label: '工作台品牌',
					keepAlive: true
				},
				component: () => import('./views/branding.vue')
			},
			{
				path: '/phoenix/dictionary-maintenance',
				meta: {
					label: '字典维护',
					keepAlive: true
				},
				component: () => import('./views/dictionary-maintenance.vue')
			},
			{
				path: '/phoenix/identity',
				meta: {
					label: '外部身份审查',
					keepAlive: true
				},
				component: () => import('./views/identity.vue')
			},
			{
				path: '/phoenix/navigation',
				meta: {
					label: '分组',
					keepAlive: true
				},
				component: () => import('./views/navigation.vue')
			},
			{
				path: '/phoenix/plugins',
				meta: {
					label: 'Phoenix 业务插件',
					keepAlive: true
				},
				component: () => import('./views/plugins.vue')
			},
			{
				path: '/phoenix/maintenance',
				meta: {
					label: '系统维护',
					keepAlive: true
				},
				component: () => import('./views/maintenance.vue')
			}
		]
	};
};

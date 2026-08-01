import { type ModuleConfig } from '/@/cool';

/** Phoenix Admin Host 前端模块。 */
export default (): ModuleConfig => {
	return {
		order: 80,
		views: [
			{
				path: '/pah/navigation',
				meta: {
					label: '大分组管理',
					keepAlive: true
				},
				component: () => import('./views/navigation.vue')
			},
			{
				path: '/pah/plugins',
				meta: {
					label: 'Phoenix 业务插件',
					keepAlive: true
				},
				component: () => import('./views/plugins.vue')
			}
		]
	};
};

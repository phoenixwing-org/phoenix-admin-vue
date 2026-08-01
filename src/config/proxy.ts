const pahApiTarget =
	(typeof process !== 'undefined' && process.env?.PAH_API_TARGET) ||
	import.meta.env?.VITE_PAH_API_TARGET ||
	'http://127.0.0.1:8101';

const proxy = {
	'/dev/': {
		// 默认保持 8101；Node 联调用 PAH_API_TARGET，浏览器端用 VITE_PAH_API_TARGET。
		target: pahApiTarget,
		changeOrigin: true,
		rewrite: (path: string) => path.replace(/^\/dev/, '')
	},

	'/prod/': {
		target: 'https://show.cool-admin.com',
		changeOrigin: true,
		rewrite: (path: string) => path.replace(/^\/prod/, '/api')
	}
};

const value = 'dev';
const host = proxy[`/${value}/`]?.target;

export { proxy, host, value };

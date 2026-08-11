import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { ConfigEnv, Plugin } from 'vite';
import type { UserConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import compression from 'vite-plugin-compression';
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
import vueDevTools from 'vite-plugin-vue-devtools';
import { visualizer } from 'rollup-plugin-visualizer';
import { proxy } from './src/config/proxy';
import { cool } from '@cool-vue/vite-plugin';
import { pahLocalWingAliases } from './scripts/pah-wing-mode.mjs';
import {
	pahCreateHostPathContext,
	pahHostDependencyId
} from './scripts/pah-host-runtime-dependencies';
import { migrateLegacyPublicLoginBrandingEpsCache } from './scripts/cool-eps-cache-compat.mjs';

function toPath(dir: string) {
	return fileURLToPath(new URL(dir, import.meta.url));
}

const adminRoot = toPath('./');
const adminPathContext = pahCreateHostPathContext({ hostRoot: adminRoot });
const adminManifest = JSON.parse(fs.readFileSync(toPath('./package.json'), 'utf8')) as {
	dependencies?: Record<string, string>;
};
const pahHostSingletonDependencies = [
	'vue',
	'vue-router',
	'pinia',
	'element-plus',
	'@element-plus/icons-vue',
	'phoenix-wing'
] as const;
const pahHostSingletonDependencySet = new Set<string>(pahHostSingletonDependencies);
const hostRuntimeDependencies = Object.keys(adminManifest.dependencies || {})
	.filter(packageName => !pahHostSingletonDependencySet.has(packageName))
	.map(packageName => [packageName, path.join(adminRoot, 'node_modules', packageName)]);

function pahHostRuntimeDependencies(): Plugin {
	return {
		name: 'pah-host-runtime-dependencies',
		enforce: 'pre',
		async resolveId(source, importer) {
			if (!importer || adminPathContext.isHostImporter(importer)) return null;

			const dependency = hostRuntimeDependencies.find(
				([packageName]) => source === packageName || source.startsWith(`${packageName}/`)
			);
			if (!dependency) return null;

			const [packageName, dependencyRoot] = dependency;
			return this.resolve(
				pahHostDependencyId(dependencyRoot, packageName, source),
				importer,
				{
					skipSelf: true
				}
			);
		}
	};
}

// https://vitejs.dev/config
export default ({ mode }: ConfigEnv): UserConfig => {
	const isDev = mode === 'development';
	const localWingAliases = pahLocalWingAliases();
	const epsCacheMigration = migrateLegacyPublicLoginBrandingEpsCache(
		path.join(adminRoot, 'build', 'cool', 'eps.json')
	);

	if (epsCacheMigration.migrated > 0) {
		console.info(
			`[cool-eps] migrated ${epsCacheMigration.migrated} legacy public login branding route`
		);
	}

	return {
		plugins: [
			pahHostRuntimeDependencies(),
			vue(),
			compression(),
			vueJsx(),
			// vueDevTools(),
			cool({
				type: 'admin',
				proxy,
				eps: {
					enable: true
				},
				svg: {
					skipNames: ['base', 'theme']
				},
				demo: mode == 'demo' // 是否开启演示模式
			}),
			// visualizer({
			// 	open: false,
			// 	gzipSize: true,
			// 	brotliSize: true
			// }),
			VueI18nPlugin({
				include: [toPath('./src/{modules,plugins}/**/locales/**')]
			})
		],
		base: '/',
		server: {
			port: 9000,
			proxy,
			hmr: {
				overlay: true
			}
		},
		css: {
			preprocessorOptions: {
				scss: {
					charset: false,
					api: 'modern-compiler'
				}
			}
		},
		resolve: {
			// 外部开发插件的 peer dependencies 始终复用 Host 单例。
			dedupe: [...pahHostSingletonDependencies],
			alias: [
				...localWingAliases,
				{ find: '/@', replacement: toPath('./src') },
				{ find: '/$', replacement: toPath('./src/modules') },
				{ find: '/#', replacement: toPath('./src/plugins') },
				{ find: '/~', replacement: toPath('./packages') }
			]
		},
		// Element Plus 的按需子模块会直接导入这些 CommonJS 插件；显式预构建，
		// 避免浏览器把 dayjs/plugin/*.js 当作原生 ESM 加载。
		optimizeDeps: {
			exclude: localWingAliases.length ? ['phoenix-wing'] : [],
			include: [
				'dayjs/plugin/advancedFormat.js',
				'dayjs/plugin/customParseFormat.js',
				'dayjs/plugin/dayOfYear.js',
				'dayjs/plugin/isSameOrAfter.js',
				'dayjs/plugin/isSameOrBefore.js',
				'dayjs/plugin/localeData.js',
				'dayjs/plugin/weekOfYear.js',
				'dayjs/plugin/weekYear.js'
			]
		},
		test: {
			// Registry 根入口携带全局样式；单测内联转换后再由 Vite 处理 CSS。
			server: {
				deps: {
					inline: ['phoenix-wing']
				}
			}
		},
		esbuild: {
			drop: isDev ? [] : ['console', 'debugger']
		},
		build: {
			minify: 'esbuild',
			// terserOptions: {
			// 	compress: {
			// 		drop_console: true,
			// 		drop_debugger: true
			// 	}
			// },
			sourcemap: isDev,
			rollupOptions: {
				output: {
					chunkFileNames: 'static/js/[name]-[hash].js',
					entryFileNames: 'static/js/[name]-[hash].js',
					assetFileNames: 'static/[ext]/[name]-[hash].[ext]',
					manualChunks(id) {
						if (id.includes('node_modules')) {
							if (!['@cool-vue/crud'].find(e => id.includes(e))) {
								if (id.includes('prettier')) {
									return;
								}

								return id
									.toString()
									.split('node_modules/')[1]
									.replace('.pnpm/', '')
									.split('/')[0];
							} else {
								return 'comm';
							}
						}
					}
				}
			}
		}
	};
};

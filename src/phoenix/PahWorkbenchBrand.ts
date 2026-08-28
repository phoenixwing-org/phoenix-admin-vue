import type { PnwColorScheme } from 'phoenix-wing';
import type {
	PahPublicLoginBrandingSnapshot,
	PahPublicLoginBrandingSnapshotAssetV1
} from './PahPublicLoginBranding';

export interface PahWorkbenchBrandViewModel {
	title: string;
	subtitle: string;
	logo: PahPublicLoginBrandingSnapshotAssetV1;
	logoDark: PahPublicLoginBrandingSnapshotAssetV1;
}

/**
 * 工作台只消费 mount 前已验证的静态品牌快照，不在路由或组件挂载时查询数据库。
 * v2 直接消费 Host 在启动前发布的工作台快照；v1 只保留旧制品兼容投影。
 */
export function pahResolveWorkbenchBrand(
	snapshot: PahPublicLoginBrandingSnapshot,
	webOrigin: string
): PahWorkbenchBrandViewModel {
	if (snapshot.schemaVersion === 2) {
		return {
			title: snapshot.workbench.title,
			subtitle:
				snapshot.workbench.subtitle.mode === 'web-origin'
					? webOrigin
					: snapshot.workbench.subtitle.text,
			logo: snapshot.workbench.logo,
			logoDark: snapshot.workbench.logoDark
		};
	}
	return {
		title: snapshot.appName,
		subtitle: snapshot.mode === 'plugin' ? snapshot.login.subtitle : webOrigin,
		logo: snapshot.assets.compactLogo,
		logoDark: snapshot.assets.compactLogoDark
	};
}

export function pahWorkbenchBrandLogo(
	brand: PahWorkbenchBrandViewModel,
	colorScheme: PnwColorScheme
) {
	return colorScheme === 'dark' ? brand.logoDark : brand.logo;
}

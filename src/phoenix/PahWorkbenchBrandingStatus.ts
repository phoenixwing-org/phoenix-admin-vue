import type {
	PahPublicLoginBrandingSnapshot,
	PahPublicLoginBrandingSnapshotAssetV1
} from './PahPublicLoginBranding';

export interface PahHostWorkbenchBrandingConfig {
	revision: string;
	title: string;
	subtitle: { mode: 'web-origin' } | { mode: 'text'; text: string };
	logo: PahPublicLoginBrandingSnapshotAssetV1;
	logoDark: PahPublicLoginBrandingSnapshotAssetV1;
}

export interface PahHostWorkbenchBrandingStatus {
	config: PahHostWorkbenchBrandingConfig;
	activeSnapshot: PahPublicLoginBrandingSnapshot;
}

export type PahHostWorkbenchBrandingState = 'applied' | 'standby' | 'out-of-sync';

function sameAsset(
	left: PahPublicLoginBrandingSnapshotAssetV1,
	right: PahPublicLoginBrandingSnapshotAssetV1
) {
	return (
		left.sha256 === right.sha256 &&
		left.mime === right.mime &&
		left.size === right.size
	);
}

function sameSubtitle(
	left: PahHostWorkbenchBrandingConfig['subtitle'],
	right: PahHostWorkbenchBrandingConfig['subtitle']
) {
	return (
		left.mode === right.mode &&
		(left.mode === 'web-origin' || (right.mode === 'text' && left.text === right.text))
	);
}

export function pahHostSnapshotMatchesConfig(status: PahHostWorkbenchBrandingStatus) {
	const { config, activeSnapshot: snapshot } = status;
	if (snapshot.mode !== 'host-default' || snapshot.schemaVersion !== 2) return false;
	return (
		snapshot.appName === config.title &&
		snapshot.titleTemplate === '%s · ' + config.title &&
		snapshot.login.title === config.title &&
		snapshot.login.prompt.includes(config.title) &&
		sameSubtitle(snapshot.workbench.subtitle, config.subtitle) &&
		(config.subtitle.mode === 'web-origin' ||
			snapshot.login.subtitle === config.subtitle.text) &&
		sameAsset(snapshot.favicon, config.logo) &&
		sameAsset(snapshot.assets.logo, config.logo) &&
		sameAsset(snapshot.assets.compactLogo, config.logo) &&
		sameAsset(snapshot.workbench.logo, config.logo) &&
		sameAsset(snapshot.assets.logoDark, config.logoDark) &&
		sameAsset(snapshot.assets.compactLogoDark, config.logoDark) &&
		sameAsset(snapshot.workbench.logoDark, config.logoDark)
	);
}

export function pahHostWorkbenchBrandingState(
	status: PahHostWorkbenchBrandingStatus
): PahHostWorkbenchBrandingState {
	if (status.activeSnapshot.mode === 'plugin') return 'standby';
	return pahHostSnapshotMatchesConfig(status) ? 'applied' : 'out-of-sync';
}

export function pahWorkbenchBrandingSource(status: PahHostWorkbenchBrandingStatus) {
	const snapshot = status.activeSnapshot;
	const hostState = pahHostWorkbenchBrandingState(status);
	if (snapshot.mode === 'plugin') {
		const moduleId = snapshot.plugin?.moduleId || '未知品牌插件';
		const version = snapshot.plugin?.version;
		return {
			sourceMode: 'plugin',
			sourceLabel: version ? moduleId + '@' + version : moduleId,
			currentDescription: '登录、标题/favicon 与工作台整套由品牌插件控制',
			hostState,
			hostStateLabel: 'Host 默认品牌可编辑并保存为备用；停用或取消选择插件并重启后生效'
		} as const;
	}
	return {
		sourceMode: 'host',
		sourceLabel: 'Host 默认品牌',
		currentDescription: '登录、标题/favicon 与工作台整套使用 Host 配置',
		hostState,
		hostStateLabel:
			hostState === 'applied'
				? 'Host 配置已发布；新开、刷新或重登页面使用当前 revision'
				: 'Host 配置与公开快照不一致，请刷新或检查 Node 对账'
	} as const;
}

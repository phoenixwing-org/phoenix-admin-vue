import { inject, provide, type ComputedRef, type InjectionKey } from 'vue';
import { isPahPublicLoginBrandingSnapshot } from './PahPublicLoginBranding';
import { pahResolveWorkbenchBrand, type PahWorkbenchBrandViewModel } from './PahWorkbenchBrand';
import {
	pahWorkbenchBrandingSource,
	type PahHostWorkbenchBrandingStatus
} from './PahWorkbenchBrandingStatus';

const PAH_WORKBENCH_BRAND_RUNTIME: InjectionKey<ComputedRef<PahWorkbenchBrandViewModel>> = Symbol(
	'pah.workbench.brand.runtime'
);

export function pahProvideWorkbenchBrandRuntime(brand: ComputedRef<PahWorkbenchBrandViewModel>) {
	provide(PAH_WORKBENCH_BRAND_RUNTIME, brand);
}

export function usePahWorkbenchBrandRuntime() {
	return inject(PAH_WORKBENCH_BRAND_RUNTIME);
}

export interface PahBrandingRuntimeCheckInput {
	status: PahHostWorkbenchBrandingStatus;
	workbenchBrand: PahWorkbenchBrandViewModel;
	webOrigin: string;
	documentTitle: string;
	faviconHref: string;
	publicBrandingEndpoint: string;
}

export interface PahBrandingRuntimeCheckItem {
	id: string;
	ok: boolean;
	detail: string;
}

function sameAsset(
	left: { sha256: string; mime: string; size: number },
	right: { sha256: string; mime: string; size: number }
) {
	return left.sha256 === right.sha256 && left.mime === right.mime && left.size === right.size;
}

function titleMatchesTemplate(title: string, template: string) {
	const [prefix, suffix, extra] = template.split('%s');
	if (extra !== undefined || !title.startsWith(prefix) || !title.endsWith(suffix)) return false;
	return title.slice(prefix.length, title.length - suffix.length).trim().length > 0;
}

function resolveAssetHref(url: string, endpoint: string) {
	return new URL(url, endpoint).href;
}

export function pahCheckBrandingRuntime(input: PahBrandingRuntimeCheckInput): {
	ok: boolean;
	message: string;
	items: PahBrandingRuntimeCheckItem[];
} {
	const snapshot = input.status.activeSnapshot;
	const expectedWorkbench = pahResolveWorkbenchBrand(snapshot, input.webOrigin);
	const source = pahWorkbenchBrandingSource(input.status);
	const expectedFavicon = resolveAssetHref(snapshot.favicon.url, input.publicBrandingEndpoint);
	const items: PahBrandingRuntimeCheckItem[] = [
		{
			id: 'VUE-SCHEMA-01',
			ok: isPahPublicLoginBrandingSnapshot(snapshot),
			detail: `公开快照 schema v${snapshot.schemaVersion} / ${snapshot.revision.slice(0, 12)}`
		},
		{
			id: 'VUE-HEAD-01',
			ok: titleMatchesTemplate(input.documentTitle, snapshot.titleTemplate),
			detail: `浏览器标题 ${input.documentTitle}`
		},
		{
			id: 'FIELD-FAVICON-01',
			ok: input.faviconHref === expectedFavicon,
			detail: `favicon ${input.faviconHref || '缺失'}`
		},
		{
			id: 'VUE-WORKBENCH-01',
			ok:
				input.workbenchBrand.title === expectedWorkbench.title &&
				input.workbenchBrand.subtitle === expectedWorkbench.subtitle &&
				sameAsset(input.workbenchBrand.logo, expectedWorkbench.logo) &&
				sameAsset(input.workbenchBrand.logoDark, expectedWorkbench.logoDark),
			detail: `工作台 ${input.workbenchBrand.title} · ${input.workbenchBrand.subtitle}`
		},
		{
			id: 'VUE-STATUS-01',
			ok: source.hostState !== 'out-of-sync',
			detail: `${source.sourceLabel} · ${source.hostStateLabel}`
		}
	];
	const failed = items.filter(item => !item.ok);
	return {
		ok: failed.length === 0,
		message:
			failed.length === 0
				? `[Runtime] ${expectedWorkbench.title} 工作台品牌已就绪`
				: `[Runtime] ${expectedWorkbench.title} 工作台品牌点检失败：${failed
						.map(item => item.id)
						.join('、')}`,
		items
	};
}

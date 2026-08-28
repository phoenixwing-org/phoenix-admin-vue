import type { RouteLocationNormalized } from 'vue-router';
import { pahPublicLoginTitle, type PahPublicLoginBrandingSnapshot } from './PahPublicLoginBranding';

const MAX_ROUTE_LABEL_LENGTH = 80;

function safeRouteLabel(value: unknown) {
	if (typeof value !== 'string') return;
	const label = value.trim();
	if (!label || label.length > MAX_ROUTE_LABEL_LENGTH || /[<>\u0000-\u001f\u007f]/.test(label)) {
		return;
	}
	return label;
}

function normalizedPath(path: string) {
	return path.replace(/\/+$/, '') || '/';
}

export type PahRouteTitleInput = Pick<RouteLocationNormalized, 'path' | 'name' | 'meta'>;
export interface PahDocumentTitleTarget {
	title: string;
}

/**
 * Public Login Branding Snapshot 只提供公开品牌名与标题模板；页面标题语义由 Host 路由决定。
 */
export function pahRouteDocumentTitle(
	route: PahRouteTitleInput,
	snapshot: PahPublicLoginBrandingSnapshot
) {
	const path = normalizedPath(route.path);

	if (path === '/login') {
		return pahPublicLoginTitle(snapshot, '登录');
	}

	if (path === '/' || route.name === 'home' || route.meta?.isHome === true) {
		return pahPublicLoginTitle(snapshot, '首页');
	}

	const label = safeRouteLabel(route.meta?.label);
	return label ? pahPublicLoginTitle(snapshot, label) : snapshot.appName;
}

export function applyPahRouteDocumentTitle(
	route: PahRouteTitleInput,
	snapshot: PahPublicLoginBrandingSnapshot,
	target: PahDocumentTitleTarget = document
) {
	target.title = pahRouteDocumentTitle(route, snapshot);
	return target.title;
}

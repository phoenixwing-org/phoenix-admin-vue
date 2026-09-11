import { computed, shallowReactive, type ComputedRef, type Ref } from 'vue';
import type { PnwViewPresentationMode } from 'phoenix-wing';

export interface PahViewPresentationRegistration {
	viewInstanceId: string;
	ownerPath: string;
	cacheName: string;
	mode: Readonly<Ref<PnwViewPresentationMode>>;
	/** 从 detach 开始到 owner route 重新激活完成前保持 KeepAlive。 */
	cachePinned: Readonly<Ref<boolean>>;
	focus(): void;
	reattach(): void;
}

const registrations = shallowReactive(new Map<string, PahViewPresentationRegistration>());
let presentationSequence = 0;

/** 只生成 Host 内部匿名身份；不得把 route fullPath/query 放进 DOM、日志或持久化。 */
export function pahCreateViewPresentationId(): string {
	presentationSequence += 1;
	const random = globalThis.crypto?.randomUUID?.().replace(/-/g, '').slice(0, 12);
	return `pah-view-${random || presentationSequence.toString(36)}`;
}

export function pahRegisterViewPresentation(
	registration: PahViewPresentationRegistration
): () => void {
	registrations.set(registration.viewInstanceId, registration);
	return () => {
		if (registrations.get(registration.viewInstanceId) === registration) {
			registrations.delete(registration.viewInstanceId);
		}
	};
}

export const pahPinnedViewPresentationCacheNames: ComputedRef<readonly string[]> = computed(() =>
	Array.from(
		new Set(
			Array.from(registrations.values())
				.filter(item => item.cachePinned.value)
				.map(item => item.cacheName)
		)
	)
);

export function pahIsViewPresentationFloating(viewInstanceId?: string): boolean {
	if (!viewInstanceId) return false;
	const registration = registrations.get(viewInstanceId);
	return Boolean(registration && registration.mode.value !== 'embedded');
}

export function pahHasFloatingViewPresentations(): boolean {
	return Array.from(registrations.values()).some(item => item.mode.value !== 'embedded');
}

/** 浮出 Tab 的点击语义是聚焦既有窗口，不重新创建 Editor 实例。 */
export function pahFocusFloatingViewPresentation(viewInstanceId?: string): boolean {
	if (!viewInstanceId) return false;
	const registration = registrations.get(viewInstanceId);
	if (!registration || registration.mode.value === 'embedded') return false;
	registration.focus();
	return true;
}

export function pahReattachViewPresentation(viewInstanceId?: string): boolean {
	if (!viewInstanceId) return false;
	const registration = registrations.get(viewInstanceId);
	if (!registration || registration.mode.value === 'embedded') return false;
	registration.reattach();
	return true;
}

/** Process owner 销毁时先撤销 cache pin；组件卸载负责释放 Wing lease/Teleport。 */
export function pahDisposeViewPresentation(viewInstanceId?: string): void {
	if (viewInstanceId) registrations.delete(viewInstanceId);
}

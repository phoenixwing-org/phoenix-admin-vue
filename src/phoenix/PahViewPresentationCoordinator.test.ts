import { ref } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PnwViewPresentationMode } from 'phoenix-wing';
import {
	pahDisposeViewPresentation,
	pahFocusFloatingViewPresentation,
	pahHasFloatingViewPresentations,
	pahPinnedViewPresentationCacheNames,
	pahRegisterViewPresentation
} from './PahViewPresentationCoordinator';

const registeredIds: string[] = [];

afterEach(() => {
	for (const id of registeredIds.splice(0)) pahDisposeViewPresentation(id);
});

describe('Phoenix View presentation coordinator', () => {
	it('浮出时 pin cache，并把 Tab 点击解释为聚焦窗口', () => {
		const mode = ref<PnwViewPresentationMode>('embedded');
		const cachePinned = ref(false);
		const focus = vi.fn();
		const viewInstanceId = 'pah-view-test';
		registeredIds.push(viewInstanceId);
		pahRegisterViewPresentation({
			viewInstanceId,
			ownerPath: '/example',
			cacheName: 'ExampleView',
			mode,
			cachePinned,
			focus,
			reattach: vi.fn()
		});

		expect(pahPinnedViewPresentationCacheNames.value).toEqual([]);
		expect(pahFocusFloatingViewPresentation(viewInstanceId)).toBe(false);

		cachePinned.value = true;
		mode.value = 'floating';
		expect(pahHasFloatingViewPresentations()).toBe(true);
		expect(pahPinnedViewPresentationCacheNames.value).toEqual(['ExampleView']);
		expect(pahFocusFloatingViewPresentation(viewInstanceId)).toBe(true);
		expect(focus).toHaveBeenCalledTimes(1);
	});

	it('收回到 embedded 后仍保持 pin，直到 owner route 完成重新激活', () => {
		const mode = ref<PnwViewPresentationMode>('floating');
		const cachePinned = ref(true);
		const viewInstanceId = 'pah-view-reattach';
		registeredIds.push(viewInstanceId);
		pahRegisterViewPresentation({
			viewInstanceId,
			ownerPath: '/example',
			cacheName: 'ExampleView',
			mode,
			cachePinned,
			focus: vi.fn(),
			reattach: vi.fn()
		});

		mode.value = 'embedded';
		expect(pahPinnedViewPresentationCacheNames.value).toEqual(['ExampleView']);

		cachePinned.value = false;
		expect(pahPinnedViewPresentationCacheNames.value).toEqual([]);
	});
});

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { assign } from 'lodash-es';
import {
	pahCreateViewPresentationId,
	pahDisposeViewPresentation
} from '/@/phoenix/PahViewPresentationCoordinator';

export const useProcessStore = defineStore('process', function () {
	const list = ref<Process.List>([]);

	// 添加
	function add(data: any) {
		list.value.forEach((e: Process.Item) => {
			e.active = false;
		});

		if (!data.meta) {
			data.meta = {};
		}

		if (!data.meta?.isHome && data.meta?.process !== false) {
			const index = list.value.findIndex(e => e.path === data.path);

			if (index < 0) {
				list.value.push({
					...data,
					pahPresentationViewId: data.meta?.phoenixPluginModuleId
						? pahCreateViewPresentationId()
						: undefined,
					active: true
				});
			} else {
				assign(list.value[index], data, { active: true });
			}
		}
	}

	// 关闭当前
	function close() {
		const index = list.value.findIndex(e => e.active);

		if (index > -1) {
			const [removed] = list.value.splice(index, 1);
			pahDisposeViewPresentation(removed?.pahPresentationViewId);
		}
	}

	// 移除
	function remove(index: number) {
		const [removed] = list.value.splice(index, 1);
		pahDisposeViewPresentation(removed?.pahPresentationViewId);
	}

	// 设置
	function set(data: Process.Item[]) {
		const retained = new Set(data.map(item => item.pahPresentationViewId).filter(Boolean));
		for (const item of list.value) {
			if (item.pahPresentationViewId && !retained.has(item.pahPresentationViewId)) {
				pahDisposeViewPresentation(item.pahPresentationViewId);
			}
		}
		list.value = data;
	}

	// 清空
	function clear() {
		for (const item of list.value) {
			pahDisposeViewPresentation(item.pahPresentationViewId);
		}
		list.value = [];
	}

	// 设置标题
	function setTitle(title: string) {
		const item = list.value.find(e => e.active);

		if (item) {
			item.meta.label = title;
		}
	}

	return {
		list,
		add,
		remove,
		close,
		set,
		clear,
		setTitle
	};
});

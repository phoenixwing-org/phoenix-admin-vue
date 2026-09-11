<template>
	<pnw-choice-dialog-host />
	<pnw-view-dialog-host :controller="viewDialogHost" />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import {
	PnwChoiceDialogHost,
	PnwViewDialogHost,
	type PnwViewDialogHostController
} from 'phoenix-wing';
import { useBase } from '/$/base';
import { module } from '/@/cool';
import { Loading } from '/@/cool/utils';
import {
	pahRemovedViewDialogOwnerIds,
	pahRegisterViewDialogRenderers,
	pahViewDialogOwnerIds,
	type PahViewDialogRendererRegistration
} from './PahViewDialogs';
import { useRoute } from 'vue-router';

const props = defineProps<{
	viewDialogHost: PnwViewDialogHostController;
}>();

const route = useRoute();
const { process } = useBase();
let registration: PahViewDialogRendererRegistration = {
	issues: [],
	dispose() {}
};
let disposed = false;

onMounted(async () => {
	// 模块 onLoad 完成后再登记 renderer；被健康检查隔离的插件不能留下可打开入口。
	await Loading.wait();
	if (disposed) return;
	registration = pahRegisterViewDialogRenderers(props.viewDialogHost, module.list);
	for (const issue of registration.issues) {
		console.error(
			`[phoenix-plugin-health] host=web module=${issue.moduleId} state=quarantined phase=view-dialog-renderer detail=${issue.message}`
		);
	}
});

const ownerIds = computed(() => pahViewDialogOwnerIds(route.path, process.list));

watch(ownerIds, (next, previous) => {
	for (const ownerId of pahRemovedViewDialogOwnerIds(previous || [], next)) {
		void props.viewDialogHost.closeByView(ownerId, 'parent-close');
	}
});

onBeforeUnmount(() => {
	disposed = true;
	registration.dispose();
});
</script>

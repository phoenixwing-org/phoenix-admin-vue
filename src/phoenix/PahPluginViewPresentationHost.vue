<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, type Component } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
	PnwIcon,
	PnwViewPresentationPortal,
	pnwCreateViewPresentationRecord,
	pnwProvideViewPresentationContext,
	pnwReduceViewPresentationRecord,
	type PnwViewPresentationPortalHandle,
	type PnwViewPresentationRecord
} from 'phoenix-wing';
import { useBase } from '/$/base';
import {
	pahCreateViewPresentationId,
	pahIsViewPresentationFloating,
	pahRegisterViewPresentation
} from './PahViewPresentationCoordinator';

defineOptions({
	name: 'PahPluginViewPresentationHost',
	inheritAttrs: false
});

const props = defineProps<{
	view: Component;
	moduleId: string;
	viewPath: string;
	cacheName: string;
}>();

const route = useRoute();
const router = useRouter();
const { process } = useBase();
const ownerPath = route.path;
const owner = process.list.find(item => item.path === ownerPath);
const viewInstanceId = owner?.pahPresentationViewId || pahCreateViewPresentationId();
if (owner && !owner.pahPresentationViewId) owner.pahPresentationViewId = viewInstanceId;
const initialTitle = String(route.meta?.label || route.meta?.title || route.name || props.moduleId);
const presentationRecord = ref<PnwViewPresentationRecord>(
	pnwCreateViewPresentationRecord({
		rendererId: `phoenix-admin.plugin-view.${props.moduleId}`,
		viewInstanceId,
		ownerTabId: viewInstanceId,
		instanceKey: viewInstanceId
	})
);
const portal = ref<PnwViewPresentationPortalHandle>();
const presentationMode = computed(() => presentationRecord.value.mode);
const cachePinned = ref(false);
const registeredHeaders = ref(0);
const title = computed(() => {
	const owner = process.list.find(item => item.pahPresentationViewId === viewInstanceId);
	return String(owner?.meta?.label || owner?.name || initialTitle);
});

function updatePresentation(command: 'detach' | 'reattach'): void {
	if (command === 'detach') cachePinned.value = true;
	presentationRecord.value = pnwReduceViewPresentationRecord(presentationRecord.value, {
		type: command
	});
}

pnwProvideViewPresentationContext({
	mode: presentationMode,
	detach: () => updatePresentation('detach'),
	reattach: () => updatePresentation('reattach'),
	registerHeader() {
		registeredHeaders.value += 1;
		let active = true;
		return () => {
			if (!active) return;
			active = false;
			registeredHeaders.value = Math.max(0, registeredHeaders.value - 1);
		};
	}
});

const unregisterPresentation = pahRegisterViewPresentation({
	viewInstanceId,
	ownerPath,
	cacheName: props.cacheName,
	mode: presentationMode,
	cachePinned,
	focus: () => portal.value?.focus(),
	reattach: () => portal.value?.reattach()
});
onBeforeUnmount(unregisterPresentation);

function navigateToEmbeddedFallback(): void {
	const candidates = process.list.filter(
		item =>
			item.pahPresentationViewId !== viewInstanceId &&
			!pahIsViewPresentationFloating(item.pahPresentationViewId)
	);
	const fallback = candidates[candidates.length - 1];
	void router.push(fallback?.fullPath || '/');
}

async function navigateToOwner(): Promise<void> {
	const item = process.list.find(entry => entry.pahPresentationViewId === viewInstanceId);
	if (item && route.path !== item.path) await router.push(item.fullPath);
	await nextTick();
	cachePinned.value = false;
}
</script>

<template>
	<PnwViewPresentationPortal
		ref="portal"
		v-model:record="presentationRecord"
		:title="title"
		:aria-label="title"
		panel-class="pah-plugin-route-view-panel"
		@detached="navigateToEmbeddedFallback"
		@reattached="navigateToOwner"
	>
		<template #header="{ mode }">
			<strong v-if="mode !== 'embedded'" class="pah-plugin-route-view-title">{{
				title
			}}</strong>
		</template>
		<template #main="{ mode, detach }">
			<div
				class="pah-plugin-route-view-host"
				:data-phoenix-plugin-module="moduleId"
				:data-phoenix-plugin-view="viewPath"
			>
				<button
					v-if="mode === 'embedded' && registeredHeaders === 0"
					type="button"
					class="pah-plugin-route-view-fallback"
					title="浮出 View"
					aria-label="浮出 View"
					@click="detach"
				>
					<PnwIcon name="window-float" :size="16" />
				</button>
				<component :is="view" v-bind="$attrs" />
			</div>
		</template>
	</PnwViewPresentationPortal>
</template>

<style scoped>
.pah-plugin-route-view-host {
	position: relative;
	width: 100%;
	height: 100%;
	min-width: 0;
	min-height: 0;
}
.pah-plugin-route-view-title {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.pah-plugin-route-view-fallback {
	position: absolute;
	top: 6px;
	right: 8px;
	z-index: 5;
	display: inline-grid;
	place-items: center;
	width: 28px;
	height: 28px;
	padding: 0;
	border: 1px solid var(--pnw-workbench-border, #dce3ec);
	border-radius: 5px;
	background: var(--pnw-page-header-bg, var(--page-bg, #fff));
	color: var(--pnw-workbench-muted, #64748b);
	cursor: pointer;
}
.pah-plugin-route-view-fallback:hover {
	background: var(--pnw-control-hover-bg, rgb(148 163 184 / 16%));
	color: var(--pnw-workbench-text, #0f172a);
}
:global(.pah-plugin-route-view-panel .pnw-view-presentation-dialog__main-target),
:global(.pah-plugin-route-view-panel .pah-plugin-route-view-host) {
	height: 100%;
}
</style>

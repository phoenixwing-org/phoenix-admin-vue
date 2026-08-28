<template>
	<pnw-page-layout
		class="phoenix-branding-page"
		title="工作台品牌"
		:body-inset="true"
		:body-scroll="true"
	>
		<template #actions>
			<el-button :loading="loading" @click="load">刷新</el-button>
		</template>

		<section class="branding-status">
			<div>
				<strong>静态快照</strong>
				<span>登录前由 Host 一次生成；工作台渲染期间不查询数据库。</span>
			</div>
			<el-tag :type="activePlugin ? 'warning' : 'success'">
				{{ activePlugin ? `活动插件：${activePlugin}` : 'Host 默认生效' }}
			</el-tag>
		</section>

		<el-form
			v-loading="loading"
			class="branding-form"
			label-position="top"
			@submit.prevent="save"
		>
			<div class="branding-logo-field">
				<div class="branding-logo-preview">
					<img v-if="logoPreview" :src="logoPreview" alt="当前工作台 Logo" />
				</div>
				<div>
					<strong>工作台 Logo</strong>
					<span>只接受不超过 256 KiB、无脚本与外链的 SVG。</span>
					<input
						ref="fileInput"
						type="file"
						accept="image/svg+xml,.svg"
						@change="selectLogo"
					/>
					<small v-if="selectedFile">待上传：{{ selectedFile.name }}</small>
				</div>
			</div>

			<el-form-item label="主标题">
				<el-input
					v-model="form.title"
					maxlength="80"
					show-word-limit
					placeholder="Phoenix Admin"
				/>
			</el-form-item>

			<el-form-item label="副标题来源">
				<el-radio-group v-model="form.subtitleMode">
					<el-radio value="web-origin">自动显示当前 Web 地址</el-radio>
					<el-radio value="text">固定文字</el-radio>
				</el-radio-group>
			</el-form-item>

			<el-form-item v-if="form.subtitleMode === 'text'" label="副标题文字">
				<el-input
					v-model="form.subtitleText"
					maxlength="160"
					show-word-limit
					placeholder="例如：母版管理 · 开发原型"
				/>
			</el-form-item>

			<footer>
				<el-button type="primary" native-type="submit" :loading="saving">
					保存静态快照
				</el-button>
				<el-button :loading="resetting" @click="reset">恢复 Host 默认</el-button>
			</footer>
		</el-form>

		<section class="branding-boundary">
			<strong>安全边界</strong>
			<ul>
				<li>只配置工作台 Logo、主标题与副标题，不修改登录表单和鉴权逻辑。</li>
				<li>活动品牌插件可整套覆盖这些字段；这里始终保留 Host 默认回退值。</li>
				<li>保存后重新加载页面，浏览器从新的静态快照开始渲染。</li>
			</ul>
		</section>
	</pnw-page-layout>
</template>

<script lang="ts" setup>
defineOptions({ name: 'phoenix-workbench-branding' });

import { computed, markRaw, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { PnwPageLayout } from 'phoenix-wing';
import { useCool } from '/@/cool';
import PahPluginManagementPrimary from '/@/phoenix/PahPluginManagementPrimary.vue';
import type {
	PahPublicLoginBrandingSnapshot,
	PahPublicLoginBrandingSnapshotAssetV1
} from '/@/phoenix/PahPublicLoginBranding';
import { usePahViewContributions } from '/@/phoenix/PahViewContributions';

type WorkbenchConfig = {
	revision: string;
	title: string;
	subtitle: { mode: 'web-origin' } | { mode: 'text'; text: string };
	logo: PahPublicLoginBrandingSnapshotAssetV1;
	logoDark: PahPublicLoginBrandingSnapshotAssetV1;
};

type WorkbenchStatus = {
	config: WorkbenchConfig;
	activeSnapshot: PahPublicLoginBrandingSnapshot;
};

const { service } = useCool();
const loading = ref(false);
const saving = ref(false);
const resetting = ref(false);
const status = ref<WorkbenchStatus>();
const selectedFile = ref<File>();
const selectedPreview = ref('');
const fileInput = ref<HTMLInputElement>();
const form = reactive({
	title: '',
	subtitleMode: 'web-origin' as 'web-origin' | 'text',
	subtitleText: ''
});

usePahViewContributions('/phoenix/branding', {
	primary: {
		component: markRaw(PahPluginManagementPrimary),
		props: { active: 'branding' }
	}
});

const activePlugin = computed(() =>
	status.value?.activeSnapshot.mode === 'plugin'
		? status.value.activeSnapshot.plugin?.moduleId || '未知品牌插件'
		: ''
);

function resolveAssetUrl(asset?: PahPublicLoginBrandingSnapshotAssetV1) {
	if (!asset?.url) return '';
	if (asset.url.startsWith('/')) return asset.url;
	const apiBase = String(import.meta.env.VITE_PAH_PUBLIC_API_BASE || '');
	const endpoint = new URL(
		`${apiBase}/admin/base/open/public-login-branding`,
		window.location.origin
	);
	return new URL(asset.url, endpoint).toString();
}

const logoPreview = computed(
	() => selectedPreview.value || resolveAssetUrl(status.value?.config.logo)
);

function clearSelectedLogo() {
	if (selectedPreview.value) URL.revokeObjectURL(selectedPreview.value);
	selectedPreview.value = '';
	selectedFile.value = undefined;
	if (fileInput.value) fileInput.value.value = '';
}

function applyStatus(next: WorkbenchStatus) {
	status.value = next;
	form.title = next.config.title;
	form.subtitleMode = next.config.subtitle.mode;
	form.subtitleText = next.config.subtitle.mode === 'text' ? next.config.subtitle.text : '';
	clearSelectedLogo();
}

async function load() {
	loading.value = true;
	try {
		applyStatus(
			await service.request({
				url: '/admin/phoenix/plugin/workbench-branding/status',
				method: 'GET'
			})
		);
	} catch (error: any) {
		ElMessage.error(error.message || '工作台品牌配置加载失败');
	} finally {
		loading.value = false;
	}
}

function selectLogo(event: Event) {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	if (!file) return;
	if (!file.name.toLowerCase().endsWith('.svg') || file.size === 0 || file.size > 256 * 1024) {
		ElMessage.error('只接受 1B～256KiB 的 SVG 文件');
		input.value = '';
		return;
	}
	clearSelectedLogo();
	selectedFile.value = file;
	selectedPreview.value = URL.createObjectURL(file);
}

async function save() {
	if (!status.value) return;
	if (!form.title.trim()) {
		ElMessage.error('请输入工作台主标题');
		return;
	}
	if (form.subtitleMode === 'text' && !form.subtitleText.trim()) {
		ElMessage.error('请输入工作台副标题');
		return;
	}
	saving.value = true;
	try {
		const data = new FormData();
		data.append('title', form.title.trim());
		data.append('subtitleMode', form.subtitleMode);
		data.append('subtitleText', form.subtitleText.trim());
		data.append('expectedRevision', status.value.config.revision);
		if (selectedFile.value) data.append('files', selectedFile.value);
		applyStatus(
			await service.request({
				url: '/admin/phoenix/plugin/workbench-branding/save',
				method: 'POST',
				data,
				headers: { 'Content-Type': 'multipart/form-data' }
			})
		);
		ElMessage.success(
			activePlugin.value
				? 'Host 默认品牌已保存；当前活动品牌插件仍优先生效'
				: '静态快照已更新；重新加载页面后生效'
		);
	} catch (error: any) {
		ElMessage.error(error.message || '工作台品牌保存失败');
	} finally {
		saving.value = false;
	}
}

async function reset() {
	if (!status.value) return;
	try {
		await ElMessageBox.confirm(
			'恢复 Phoenix Admin 内置 Logo、标题和 Web 地址副标题？',
			'恢复默认品牌',
			{
				type: 'warning',
				confirmButtonText: '确认恢复'
			}
		);
	} catch {
		return;
	}
	resetting.value = true;
	try {
		applyStatus(
			await service.request({
				url: '/admin/phoenix/plugin/workbench-branding/reset',
				method: 'POST',
				data: { expectedRevision: status.value.config.revision }
			})
		);
		ElMessage.success('Host 默认工作台品牌已恢复；重新加载页面后生效');
	} catch (error: any) {
		ElMessage.error(error.message || '恢复默认品牌失败');
	} finally {
		resetting.value = false;
	}
}

onMounted(load);
onBeforeUnmount(clearSelectedLogo);
</script>

<style scoped>
.phoenix-branding-page {
	color: var(--pnw-workbench-text, var(--el-text-color-primary));
}

.branding-status,
.branding-form,
.branding-boundary {
	border: 1px solid var(--pnw-workbench-border, var(--el-border-color));
	border-radius: 14px;
	background: var(--pnw-workbench-surface, var(--el-bg-color));
}

.branding-status {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding: 14px 16px;
}

.branding-status > div,
.branding-logo-field > div:last-child {
	display: grid;
	gap: 5px;
}

.branding-status span,
.branding-logo-field span,
.branding-logo-field small,
.branding-boundary {
	color: var(--pnw-workbench-muted, var(--el-text-color-secondary));
}

.branding-form {
	display: grid;
	grid-template-columns: minmax(220px, 320px) minmax(280px, 1fr);
	gap: 0 24px;
	margin-top: 16px;
	padding: 20px;
}

.branding-logo-field {
	grid-row: span 3;
	display: grid;
	align-content: start;
	gap: 14px;
}

.branding-logo-preview {
	display: grid;
	place-items: center;
	min-height: 150px;
	border: 1px dashed var(--pnw-workbench-border, var(--el-border-color));
	border-radius: 12px;
	background: var(--pnw-control-default-bg, var(--el-fill-color-light));
}

.branding-logo-preview img {
	max-width: 180px;
	max-height: 100px;
	object-fit: contain;
}

.branding-form footer {
	grid-column: 1 / -1;
	display: flex;
	justify-content: flex-end;
	gap: 10px;
	padding-top: 8px;
}

.branding-boundary {
	margin-top: 16px;
	padding: 16px;
}

.branding-boundary ul {
	display: grid;
	gap: 7px;
	margin: 10px 0 0;
	padding-left: 22px;
	line-height: 1.6;
}

@media (max-width: 720px) {
	.branding-status {
		align-items: flex-start;
		flex-direction: column;
	}

	.branding-form {
		grid-template-columns: 1fr;
	}

	.branding-logo-field {
		grid-row: auto;
		margin-bottom: 16px;
	}
}
</style>

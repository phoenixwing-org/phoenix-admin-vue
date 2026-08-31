<template>
	<pnw-page-layout
		class="phoenix-branding-page"
		title="工作台品牌"
		:body-inset="true"
		:body-scroll="true"
	>
		<template #actions>
			<el-button :disabled="!status" @click="runRuntimeCheck">运行时点检</el-button>
			<el-button :loading="loading" @click="load">刷新</el-button>
		</template>

		<section v-if="status && source" class="branding-status">
			<header>
				<div>
					<strong>当前实际生效来源</strong>
					<span>
						登录前由 Host 生成 Public Login Branding
						Snapshot；工作台渲染期间不查询数据库 · revision
						<code>{{ status.activeSnapshot.revision.slice(0, 12) }}</code>
					</span>
				</div>
				<el-tag :type="activePlugin ? 'warning' : 'success'">
					{{ source.sourceLabel }}
				</el-tag>
			</header>

			<div class="branding-source-grid">
				<article>
					<small>当前整套品牌</small>
					<strong>{{ source.currentDescription }}</strong>
					<span>{{ status.activeSnapshot.appName }}</span>
				</article>
				<article>
					<small>当前不可变快照</small>
					<strong>登录、title/favicon 与工作台共用 revision</strong>
					<span
						>{{ effectiveWorkbench?.title }} · {{ effectiveWorkbench?.subtitle }}</span
					>
				</article>
				<article>
					<small>{{ activePlugin ? 'Host 默认品牌（备用）' : 'Host 默认品牌' }}</small>
					<strong>{{ source.hostStateLabel }}</strong>
					<span
						>配置 revision <code>{{ status.config.revision.slice(0, 12) }}</code></span
					>
				</article>
			</div>

			<div class="branding-effective-preview">
				<img
					v-if="effectiveWorkbenchLogo"
					:src="effectiveWorkbenchLogo"
					:alt="`${effectiveWorkbench?.title || '当前'} Logo`"
				/>
				<div>
					<small>当前静态快照中的工作台品牌</small>
					<strong>{{ effectiveWorkbench?.title }}</strong>
					<span>{{ effectiveWorkbench?.subtitle }}</span>
				</div>
			</div>
		</section>

		<section v-if="runtimeCheck" class="branding-runtime-check" aria-live="polite">
			<header>
				<strong>{{ runtimeCheck.message }}</strong>
				<el-tag :type="runtimeCheck.ok ? 'success' : 'danger'">
					{{ runtimeCheck.ok ? '通过' : '失败' }}
				</el-tag>
			</header>
			<ul>
				<li v-for="item in runtimeCheck.items" :key="item.id">
					<code>{{ item.id }}</code>
					<span>{{ item.detail }}</span>
					<strong :class="item.ok ? 'is-pass' : 'is-fail'">
						{{ item.ok ? '通过' : '失败' }}
					</strong>
				</li>
			</ul>
		</section>

		<el-form
			v-loading="loading"
			class="branding-form"
			label-position="top"
			@submit.prevent="save"
		>
			<div class="branding-form-intro">
				<strong>{{ activePlugin ? 'Host 默认品牌（备用）' : 'Host 默认品牌' }}</strong>
				<span>
					<template v-if="activePlugin">
						当前整套品牌由 {{ source?.sourceLabel }} 控制。这里仍可维护备用配置；保存不会
						改变当前插件 revision，停用或取消选择插件并重启 Admin API 后生效。
					</template>
					<template v-else>
						四项配置会整套发布到登录左右品牌区、浏览器标题/favicon 和工作台左上角；
						保存后无需重启，新开、刷新或重登页面生效。
					</template>
				</span>
			</div>
			<div class="branding-logo-field">
				<div class="branding-logo-preview">
					<img v-if="logoPreview" :src="logoPreview" alt="Host 默认品牌 Logo" />
				</div>
				<div>
					<strong>品牌 Logo</strong>
					<span>
						只接受不超过 256 KiB、无脚本与外链的 SVG；亮色图同时作为默认 favicon。
					</span>
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
					{{ activePlugin ? '保存备用配置' : '保存并应用' }}
				</el-button>
				<el-button :loading="resetting" @click="reset">恢复 Host 默认</el-button>
			</footer>
		</el-form>

		<section class="branding-boundary">
			<strong>安全边界</strong>
			<ul>
				<li>Host 与品牌插件只能整套生效，不按字段混合，也不按产品 ID 或 DOM 猜测。</li>
				<li>插件活动时保存 Host 备用配置不会修改当前插件 revision。</li>
				<li>Host 当前生效时保存会原子发布，无需重启；其他已打开页面刷新后切换。</li>
				<li>“运行时点检”只读校验并写入工作台输出窗口，不保存或切换品牌。</li>
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
import type { PahPublicLoginBrandingSnapshotAssetV1 } from '/@/phoenix/PahPublicLoginBranding';
import { pahResolveWorkbenchBrand } from '/@/phoenix/PahWorkbenchBrand';
import {
	pahCheckBrandingRuntime,
	usePahWorkbenchBrandRuntime
} from '/@/phoenix/PahWorkbenchBrandRuntime';
import {
	pahWorkbenchBrandingSource,
	type PahHostWorkbenchBrandingStatus
} from '/@/phoenix/PahWorkbenchBrandingStatus';
import { usePahWorkbenchOutput } from '/@/phoenix/PahWorkbenchOutput';
import { usePahViewContributions } from '/@/phoenix/PahViewContributions';

const { service } = useCool();
const loading = ref(false);
const saving = ref(false);
const resetting = ref(false);
const status = ref<PahHostWorkbenchBrandingStatus>();
const runtimeCheck = ref<ReturnType<typeof pahCheckBrandingRuntime>>();
const selectedFile = ref<File>();
const selectedPreview = ref('');
const fileInput = ref<HTMLInputElement>();
const form = reactive({
	title: '',
	subtitleMode: 'web-origin' as 'web-origin' | 'text',
	subtitleText: ''
});
const workbenchBrandRuntime = usePahWorkbenchBrandRuntime();
const workbenchOutput = usePahWorkbenchOutput();

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
const source = computed(() =>
	status.value ? pahWorkbenchBrandingSource(status.value) : undefined
);
const effectiveWorkbench = computed(() =>
	status.value
		? pahResolveWorkbenchBrand(status.value.activeSnapshot, window.location.origin)
		: undefined
);

function resolveAssetUrl(asset?: PahPublicLoginBrandingSnapshotAssetV1) {
	if (!asset?.url) return '';
	if (asset.url.startsWith('/')) return asset.url;
	const endpoint = publicBrandingEndpoint();
	return new URL(asset.url, endpoint).toString();
}

function publicBrandingEndpoint() {
	const apiBase = String(import.meta.env.VITE_PAH_PUBLIC_API_BASE || '');
	return new URL(`${apiBase}/admin/base/open/public-login-branding`, window.location.origin);
}

const logoPreview = computed(
	() => selectedPreview.value || resolveAssetUrl(status.value?.config.logo)
);
const effectiveWorkbenchLogo = computed(() => resolveAssetUrl(effectiveWorkbench.value?.logo));

function clearSelectedLogo() {
	if (selectedPreview.value) URL.revokeObjectURL(selectedPreview.value);
	selectedPreview.value = '';
	selectedFile.value = undefined;
	if (fileInput.value) fileInput.value.value = '';
}

function applyStatus(next: PahHostWorkbenchBrandingStatus) {
	status.value = next;
	form.title = next.config.title;
	form.subtitleMode = next.config.subtitle.mode;
	form.subtitleText = next.config.subtitle.mode === 'text' ? next.config.subtitle.text : '';
	clearSelectedLogo();
	runtimeCheck.value = undefined;
}

function runRuntimeCheck() {
	if (!status.value || !effectiveWorkbench.value) return;
	const favicon = document.querySelector<HTMLLinkElement>('#pah-public-login-favicon');
	const result = pahCheckBrandingRuntime({
		status: status.value,
		workbenchBrand: workbenchBrandRuntime?.value || effectiveWorkbench.value,
		webOrigin: window.location.origin,
		documentTitle: document.title,
		faviconHref: favicon?.href || '',
		publicBrandingEndpoint: publicBrandingEndpoint().toString()
	});
	runtimeCheck.value = result;
	workbenchOutput?.appendLine(result.message);
	for (const item of result.items.filter(item => !item.ok)) {
		workbenchOutput?.appendLine(`[Runtime] ${item.id} ${item.detail}`);
	}
	if (result.ok) ElMessage.success('运行时品牌点检通过，结果已写入输出窗口');
	else ElMessage.error('运行时品牌点检失败，请查看页面明细和输出窗口');
}

function reportPersistenceResult(action: '保存' | '恢复') {
	const current = source.value;
	if (!current) return;
	if (current.hostState === 'applied') {
		ElMessage.success(`Host 默认品牌已${action}并应用；无需重启，新开、刷新或重登页面生效`);
	} else if (current.hostState === 'standby') {
		ElMessage.info(
			`Host 默认品牌已${action}为备用；当前仍由 ${current.sourceLabel} 控制，停用或取消选择插件并重启后生效`
		);
	} else {
		ElMessage.warning(`Host 默认品牌已${action}，但当前快照未同步；请刷新或检查 Node 对账`);
	}
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
		reportPersistenceResult('保存');
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
		reportPersistenceResult('恢复');
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
.branding-runtime-check,
.branding-form,
.branding-boundary {
	border: 1px solid var(--pnw-workbench-border, var(--el-border-color));
	border-radius: 14px;
	background: var(--pnw-workbench-surface, var(--el-bg-color));
}

.branding-status {
	display: grid;
	gap: 14px;
	padding: 14px 16px;
}

.branding-status header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
}

.branding-status header > div,
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

.branding-status code {
	font-size: 12px;
}

.branding-source-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 10px;
}

.branding-source-grid article,
.branding-effective-preview {
	display: grid;
	gap: 5px;
	padding: 12px;
	border: 1px solid var(--pnw-workbench-border, var(--el-border-color));
	border-radius: 10px;
	background: var(--pnw-control-default-bg, var(--el-fill-color-light));
}

.branding-source-grid small,
.branding-effective-preview small,
.branding-effective-preview span,
.branding-form-intro span {
	color: var(--pnw-workbench-muted, var(--el-text-color-secondary));
}

.branding-effective-preview {
	grid-template-columns: 48px minmax(0, 1fr);
	align-items: center;
}

.branding-effective-preview img {
	width: 42px;
	height: 42px;
	object-fit: contain;
}

.branding-effective-preview div,
.branding-form-intro {
	display: grid;
	gap: 5px;
}

.branding-runtime-check {
	display: grid;
	gap: 10px;
	margin-top: 16px;
	padding: 14px 16px;
}

.branding-runtime-check header,
.branding-runtime-check li {
	display: flex;
	align-items: center;
	gap: 12px;
}

.branding-runtime-check header {
	justify-content: space-between;
}

.branding-runtime-check ul {
	display: grid;
	gap: 8px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.branding-runtime-check li span {
	flex: 1;
	color: var(--pnw-workbench-muted, var(--el-text-color-secondary));
}

.branding-runtime-check .is-pass {
	color: var(--el-color-success);
}

.branding-runtime-check .is-fail {
	color: var(--el-color-danger);
}

.branding-form {
	display: grid;
	grid-template-columns: minmax(220px, 320px) minmax(280px, 1fr);
	gap: 0 24px;
	margin-top: 16px;
	padding: 20px;
}

.branding-form-intro {
	grid-column: 1 / -1;
	margin-bottom: 4px;
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
		align-items: stretch;
	}

	.branding-status header {
		align-items: flex-start;
		flex-direction: column;
	}

	.branding-source-grid {
		grid-template-columns: 1fr;
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

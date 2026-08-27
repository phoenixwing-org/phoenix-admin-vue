<template>
	<div class="pah-identity-page">
		<header class="hero">
			<div>
				<p class="eyebrow">PHOENIX ADMIN IDENTITY</p>
				<h1>外部身份审查</h1>
				<p>飞书身份只能由管理员绑定到已有后台用户；不会按姓名或邮箱自动认领。</p>
			</div>
			<el-button :loading="loading" @click="loadActiveTab">刷新</el-button>
		</header>

		<section class="notice">
			<strong>Host 唯一身份边界</strong>
			<span>绑定仍由服务端校验目标用户启用状态与角色；本页不读取或保存 OAuth 密钥。</span>
		</section>

		<section class="card">
			<el-tabs v-model="activeTab" @tab-change="loadActiveTab">
				<el-tab-pane label="待审查" name="requests">
					<div class="toolbar">
						<el-select
							v-model="requestStatus"
							aria-label="审查状态"
							@change="loadRequests"
						>
							<el-option label="待审查" value="pending" />
							<el-option label="已绑定" value="bound" />
							<el-option label="已拒绝" value="rejected" />
						</el-select>
					</div>
					<el-table v-loading="loading" :data="requests" stripe>
						<el-table-column prop="id" label="编号" width="82" />
						<el-table-column label="飞书身份" min-width="210">
							<template #default="{ row }">
								<div class="identity-cell">
									<el-avatar :size="32" :src="row.avatarUrl || undefined">
										{{ (row.displayName || '飞').slice(0, 1) }}
									</el-avatar>
									<div>
										<strong>{{ row.displayName || '未提供姓名' }}</strong>
										<small>{{ row.email || '未提供邮箱' }}</small>
									</div>
								</div>
							</template>
						</el-table-column>
						<el-table-column prop="tenantKey" label="飞书租户" min-width="150" />
						<el-table-column prop="lastSeenAt" label="最近回调" min-width="180" />
						<el-table-column prop="status" label="状态" width="100">
							<template #default="{ row }">
								<el-tag :type="requestTagType(row.status)" effect="plain">
									{{ requestStatusLabel(row.status) }}
								</el-tag>
							</template>
						</el-table-column>
						<el-table-column label="操作" width="180" fixed="right">
							<template #default="{ row }">
								<template v-if="row.status === 'pending'">
									<el-button link type="primary" @click="openBind(row)"
										>绑定</el-button
									>
									<el-button link type="danger" @click="reject(row)"
										>拒绝</el-button
									>
								</template>
								<span v-else class="muted">已处理</span>
							</template>
						</el-table-column>
					</el-table>
				</el-tab-pane>

				<el-tab-pane label="已绑定身份" name="identities">
					<div class="toolbar">
						<el-input-number
							v-model="identityUserId"
							:min="1"
							:controls="false"
							placeholder="按后台用户 ID"
						/>
						<el-button @click="loadIdentities">查询</el-button>
						<el-button @click="clearIdentityFilter">重置</el-button>
					</div>
					<el-table v-loading="loading" :data="identities" stripe>
						<el-table-column prop="id" label="身份 ID" width="90" />
						<el-table-column prop="userId" label="后台用户 ID" width="120" />
						<el-table-column prop="displayName" label="飞书姓名" min-width="150" />
						<el-table-column prop="email" label="飞书邮箱" min-width="210" />
						<el-table-column prop="tenantKey" label="飞书租户" min-width="150" />
						<el-table-column prop="linkedAt" label="绑定时间" min-width="180" />
						<el-table-column prop="lastLoginAt" label="最近登录" min-width="180" />
						<el-table-column label="状态" width="100">
							<template #default="{ row }">
								<el-tag
									:type="row.status === 'active' ? 'success' : 'info'"
									effect="plain"
								>
									{{ row.status === 'active' ? '已绑定' : '已解绑' }}
								</el-tag>
							</template>
						</el-table-column>
						<el-table-column label="操作" width="110" fixed="right">
							<template #default="{ row }">
								<el-button
									v-if="row.status === 'active'"
									link
									type="danger"
									@click="unlink(row)"
								>
									解绑
								</el-button>
								<span v-else class="muted">已解绑</span>
							</template>
						</el-table-column>
					</el-table>
				</el-tab-pane>
			</el-tabs>
		</section>

		<el-dialog v-model="bindVisible" title="绑定到已有后台用户" width="520px" destroy-on-close>
			<p class="dialog-note">
				飞书身份“{{
					selectedRequest?.displayName || '未提供姓名'
				}}”只会绑定到您明确选择的用户。
			</p>
			<el-select
				v-model="selectedUserId"
				filterable
				remote
				reserve-keyword
				:remote-method="loadUsers"
				:loading="usersLoading"
				placeholder="输入用户名或姓名搜索"
				style="width: 100%"
			>
				<el-option
					v-for="item in users"
					:key="item.id"
					:label="`${item.name || item.nickName || item.username} · ${item.username}`"
					:value="item.id"
					:disabled="item.status !== 1"
				/>
			</el-select>
			<template #footer>
				<el-button @click="bindVisible = false">取消</el-button>
				<el-button
					type="primary"
					:loading="acting"
					:disabled="!selectedUserId"
					@click="bind"
				>
					确认绑定
				</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<script lang="ts" setup>
defineOptions({ name: 'pah-identity-review' });

import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useCool } from '/@/cool';
import { useBase } from '/$/base';
import {
	pahIdentityApi,
	PahIdentityApiError,
	type PahExternalBindRequest,
	type PahExternalIdentity
} from '/@/phoenix/PahIdentityApi';

type RequestStatus = 'pending' | 'bound' | 'rejected';
type AdminUser = Eps.BaseSysUserEntity & { id: number; username: string; status: number };

const { service } = useCool();
const { user } = useBase();
const activeTab = ref<'requests' | 'identities'>('requests');
const requestStatus = ref<RequestStatus>('pending');
const requests = ref<PahExternalBindRequest[]>([]);
const identities = ref<PahExternalIdentity[]>([]);
const identityUserId = ref<number>();
const loading = ref(false);
const acting = ref(false);
const bindVisible = ref(false);
const usersLoading = ref(false);
const users = ref<AdminUser[]>([]);
const selectedRequest = ref<PahExternalBindRequest>();
const selectedUserId = ref<number>();

onMounted(loadRequests);

function authToken() {
	if (!user.token) throw new Error('登录已失效，请重新登录');
	return user.token;
}

async function loadActiveTab() {
	return activeTab.value === 'requests' ? loadRequests() : loadIdentities();
}

async function loadRequests() {
	loading.value = true;
	try {
		requests.value = await pahIdentityApi.listBindRequests(authToken(), requestStatus.value);
	} catch (error) {
		showError(error, '待审查记录加载失败');
	} finally {
		loading.value = false;
	}
}

async function loadIdentities() {
	loading.value = true;
	try {
		identities.value = await pahIdentityApi.listExternalIdentities(
			authToken(),
			identityUserId.value
		);
	} catch (error) {
		showError(error, '外部身份加载失败');
	} finally {
		loading.value = false;
	}
}

function clearIdentityFilter() {
	identityUserId.value = undefined;
	loadIdentities();
}

async function loadUsers(keyword = '') {
	usersLoading.value = true;
	try {
		const result = await service.base.sys.user.page({
			page: 1,
			size: 50,
			keyWord: keyword.trim() || undefined
		});
		users.value = (result.list || []) as AdminUser[];
	} catch (error) {
		showError(error, '后台用户加载失败');
	} finally {
		usersLoading.value = false;
	}
}

function openBind(request: PahExternalBindRequest) {
	selectedRequest.value = request;
	selectedUserId.value = undefined;
	bindVisible.value = true;
	loadUsers();
}

async function bind() {
	if (!selectedRequest.value || !selectedUserId.value) return;
	acting.value = true;
	try {
		await pahIdentityApi.bindRequest(
			authToken(),
			selectedRequest.value.id,
			selectedUserId.value
		);
		ElMessage.success('飞书身份已绑定到所选后台用户');
		bindVisible.value = false;
		await loadRequests();
	} catch (error) {
		showError(error, '绑定失败');
	} finally {
		acting.value = false;
	}
}

async function reject(request: PahExternalBindRequest) {
	let note = '';
	try {
		const result = await ElMessageBox.prompt('可填写拒绝原因（最多 2000 字）', '拒绝身份申请', {
			confirmButtonText: '拒绝',
			cancelButtonText: '取消',
			inputType: 'textarea',
			inputValidator: value => !value || value.length <= 2000 || '拒绝原因不能超过 2000 字'
		});
		note = result.value || '';
	} catch {
		return;
	}
	acting.value = true;
	try {
		await pahIdentityApi.rejectRequest(authToken(), request.id, note);
		ElMessage.success('身份申请已拒绝');
		await loadRequests();
	} catch (error) {
		showError(error, '拒绝失败');
	} finally {
		acting.value = false;
	}
}

async function unlink(identity: PahExternalIdentity) {
	try {
		await ElMessageBox.confirm(
			`解除“${identity.displayName || identity.providerSubject}”与后台用户 ${identity.userId} 的绑定？`,
			'解除外部身份',
			{ type: 'warning' }
		);
	} catch {
		return;
	}
	acting.value = true;
	try {
		await pahIdentityApi.unlinkIdentity(authToken(), identity.id);
		ElMessage.success('外部身份已解除绑定');
		await loadIdentities();
	} catch (error) {
		showError(error, '解绑失败');
	} finally {
		acting.value = false;
	}
}

function requestStatusLabel(status: RequestStatus) {
	return { pending: '待审查', bound: '已绑定', rejected: '已拒绝' }[status];
}

function requestTagType(status: RequestStatus) {
	return status === 'pending' ? 'warning' : status === 'bound' ? 'success' : 'info';
}

function showError(error: unknown, fallback: string) {
	if (error instanceof PahIdentityApiError) {
		if (error.status === 401) return ElMessage.error('登录已失效，请重新登录');
		if (error.status === 403) return ElMessage.error('当前账号没有外部身份审查权限');
		return ElMessage.error(error.message || fallback);
	}
	ElMessage.error(error instanceof Error ? error.message : fallback);
}
</script>

<style lang="scss" scoped>
.pah-identity-page {
	min-height: 100%;
	box-sizing: border-box;
	padding: 28px;
	overflow: auto;
	color: var(--pnw-workbench-text, var(--el-text-color-primary));
	background: var(--pnw-workbench-bg, var(--el-bg-color-page));
}

.hero {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 20px;

	h1 {
		margin: 4px 0 8px;
		font-size: 30px;
	}

	p:last-child {
		margin: 0;
		color: var(--pnw-workbench-muted, var(--el-text-color-secondary));
	}
}

.eyebrow {
	margin: 0;
	color: var(--pnw-workbench-muted, var(--el-text-color-secondary));
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.14em;
}

.notice,
.card {
	margin-top: 20px;
	border: 1px solid var(--pnw-workbench-border, var(--el-border-color));
	border-radius: 14px;
	background: var(--pnw-workbench-surface, var(--el-bg-color));
}

.notice {
	display: flex;
	gap: 12px;
	padding: 15px 18px;
	color: var(--pnw-workbench-muted, var(--el-text-color-regular));

	strong {
		color: var(--pnw-control-active-bg, var(--el-color-primary));
		white-space: nowrap;
	}
}

.card {
	padding: 20px;
}

.toolbar,
.identity-cell {
	display: flex;
	align-items: center;
	gap: 10px;
}

.toolbar {
	margin-bottom: 14px;
}

.identity-cell strong,
.identity-cell small {
	display: block;
}

.identity-cell small,
.muted,
.dialog-note {
	color: var(--pnw-workbench-muted, var(--el-text-color-secondary));
}

.dialog-note {
	margin: 0 0 14px;
	line-height: 1.7;
}

@media (max-width: 720px) {
	.pah-identity-page {
		padding: 16px;
	}

	.hero,
	.notice {
		flex-direction: column;
	}

	.card {
		padding: 12px;
	}
}
</style>

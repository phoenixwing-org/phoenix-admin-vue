<template>
	<main class="pah-oauth-callback">
		<section class="pah-oauth-card" aria-live="polite">
			<img src="/pah-phoenixwing-mark.svg" alt="" />
			<p class="eyebrow">PHOENIX ADMIN IDENTITY</p>
			<template v-if="state.kind === 'processing'">
				<h1>正在完成飞书登录</h1>
				<p>正在兑换一次性登录票据，请稍候。</p>
				<el-icon class="is-loading" :size="28"><Loading /></el-icon>
			</template>
			<template v-else-if="state.kind === 'pending'">
				<h1>等待管理员审查</h1>
				<p>您的飞书身份尚未绑定后台账号。管理员审查通过后，请重新发起登录。</p>
				<p class="request-id">审查编号：{{ state.requestId }}</p>
				<el-button type="primary" @click="backToPasswordLogin">返回密码登录</el-button>
			</template>
			<template v-else>
				<h1>飞书登录未完成</h1>
				<p>{{ state.message }}</p>
				<el-button type="primary" @click="backToPasswordLogin">返回密码登录</el-button>
			</template>
		</section>
	</main>
</template>

<script lang="ts" setup>
defineOptions({ name: 'pah-oauth-callback' });

import { onMounted, reactive } from 'vue';
import { Loading } from '@element-plus/icons-vue';
import { useCool } from '/@/cool';
import { useBase } from '/$/base';
import { pahIdentityApi, PahIdentityApiError } from '/@/pah/PahIdentityApi';
import { pahNormalizeIdentityReturnTo, pahReadAndScrubOAuthCallback } from '/@/pah/PahIdentityFlow';

type CallbackViewState =
	| { kind: 'processing' }
	| { kind: 'pending'; requestId: number }
	| { kind: 'error'; message: string };

const { router } = useCool();
const { user, app } = useBase();
const state = reactive<CallbackViewState>({ kind: 'processing' });

onMounted(processCallback);

async function processCallback() {
	const callback = pahReadAndScrubOAuthCallback(window.location.search, cleanPath => {
		window.history.replaceState(window.history.state, document.title, cleanPath);
	});

	// 同步清地址栏后，再清 Vue Router 内存中的 query；此操作必须早于 ticket 兑换。
	await router.replace('/oauth/callback');

	if (callback.kind === 'pending') {
		Object.assign(state, { kind: 'pending', requestId: callback.requestId });
		return;
	}
	if (callback.kind === 'error') {
		Object.assign(state, { kind: 'error', message: callback.message });
		return;
	}

	let ticket = callback.ticket;
	try {
		const session = await pahIdentityApi.exchangeTicket(ticket);
		ticket = '';
		user.setToken(session);
		await Promise.all(app.events.hasToken.map(event => event()));
		await router.replace(pahNormalizeIdentityReturnTo(session.returnTo));
	} catch (caught) {
		const message =
			caught instanceof PahIdentityApiError ? caught.message : '飞书登录未完成，请重新尝试';
		Object.assign(state, { kind: 'error', message });
	} finally {
		ticket = '';
	}
}

function backToPasswordLogin() {
	router.replace('/login');
}
</script>

<style lang="scss" scoped>
.pah-oauth-callback {
	display: grid;
	min-height: 100%;
	place-items: center;
	padding: 24px;
	background:
		radial-gradient(circle at 15% 10%, rgb(21 216 220 / 12%), transparent 30%),
		radial-gradient(circle at 85% 85%, rgb(255 91 33 / 10%), transparent 28%), #f4f7fb;
	color: #172033;
}

.pah-oauth-card {
	width: min(440px, 100%);
	box-sizing: border-box;
	padding: 40px;
	border: 1px solid #dbe3ec;
	border-radius: 18px;
	background: #fff;
	box-shadow: 0 24px 64px rgb(15 23 42 / 10%);
	text-align: center;

	img {
		width: 58px;
		height: 58px;
	}

	h1 {
		margin: 14px 0 10px;
		font-size: 25px;
	}

	p {
		color: #64748b;
		line-height: 1.7;
	}
}

.eyebrow {
	margin: 18px 0 0;
	color: #168fdd !important;
	font-size: 10px;
	font-weight: 700;
	letter-spacing: 0.16em;
}

.request-id {
	font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
	font-size: 12px;
}

.is-loading {
	margin-top: 12px;
	color: #168fdd;
}
</style>
